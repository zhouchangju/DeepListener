# DeepListener 工程治理与整改执行计划

> 面向 AI 执行者：本文是可执行治理计划，不是泛泛而谈的评审意见。执行时必须按 TDD 顺序推进：先写失败测试，确认失败原因正确，再写最小实现，再跑目标测试和全量质量门禁。

制定日期：2026-05-17  
适用范围：当前 DeepListener 项目  
输入依据：`docs/review/2026-05-17-ai-coding-quality-review.md`、当前代码、`npm run lint`、`npm run test:ci`、`npm run build` 输出  
治理原则：只修正坏内容，不改变产品既有工作流；所有变更必须保持现有功能可运行。

## 1. 治理目标

1. 让数据库驱动页面在生产构建后仍读取最新数据。
2. 让 mutating API 有明确运行时输入契约，非法输入返回 400，而不是靠 Prisma 或 JS 抛 500。
3. 让上传链路具备基本文件边界和失败清理能力。
4. 降低 HTML note 渲染的 XSS 风险。
5. 收敛复习调度中的 `due` / `nextReview` 字段分歧。
6. 把测试从“源码字符串守卫”逐步升级为行为测试。
7. 保持现有功能不被破坏：上传、转写、练习、复习、Vault、Dashboard、导出仍可运行。

## 2. 优先级规则

| 优先级 | 定义 | 必须完成条件 |
|---|---|---|
| P0 | 已经能造成错误数据、错误页面或明显安全风险 | 当前治理分支必须完成 |
| P1 | 高概率在后续迭代中制造回归或维护成本 | 当前治理分支尽量完成；若未完成必须写明原因和后续任务 |
| P2 | 提升长期工程质量，但不阻塞当前安全性和正确性 | 可作为后续治理 backlog |

重要性、收益率、风险使用 1-5 分：

- 重要性：5 表示不修会直接影响正确性、安全或核心功能。
- 收益率：5 表示投入较小且质量收益明显。
- 改动风险：5 表示容易破坏现有功能，需要更强验证。

## 3. 治理任务矩阵

| ID | 任务 | 优先级 | 重要性 | 收益率 | 改动风险 | 主要收益 | 验收证据 |
|---|---|---:|---:|---:|---:|---|---|
| G-01 | 修复 `/dashboard` 和 `/vault` 静态预渲染 | P0 | 5 | 5 | 1 | 避免生产构建后页面读旧数据库快照 | `next build` 输出两页为动态；源码测试覆盖 |
| G-02 | 为核心 API 加运行时 body 校验 | P0 | 5 | 4 | 2 | 非法请求返回 400，避免脏数据和 500 噪音 | API schema 单测；路由使用 schema |
| G-03 | 上传文件名、类型、大小、失败清理 | P0 | 5 | 4 | 3 | 降低磁盘污染和恶意上传风险 | upload helper 行为测试 |
| G-04 | 加强 HTML note 清洗 | P0 | 5 | 4 | 3 | 降低 `dangerouslySetInnerHTML` XSS 风险 | sanitizer payload 测试 |
| G-05 | 统一 due 查询语义 | P0 | 4 | 4 | 2 | Review 和导出使用一致的到期字段 | export due 查询 helper 测试 |
| G-06 | Dashboard 倒计时语义修复 | P1 | 3 | 5 | 1 | 目标日过后不再显示假倒计时 | 日期 helper 单测 |
| G-07 | 将状态/难度常量集中化 | P1 | 4 | 3 | 2 | 减少自由字符串导致的数据漂移 | 常量被 API 和 UI 复用 |
| G-08 | 拆分超大 client 组件 | P1 | 3 | 2 | 4 | 降低后续维护成本 | 保持行为测试通过 |
| G-09 | 引入真实 API/DB 测试层 | P1 | 4 | 3 | 4 | 替代源码正则测试，提升回归信心 | 至少覆盖 API schema 和纯函数 |
| G-10 | 认证、授权、CSRF、速率限制 | P2 | 5 | 2 | 5 | 网络部署安全边界 | 需要产品部署假设，单用户本地模式不强行启用 |

## 4. TDD 执行规范

每个任务必须按下面顺序执行：

1. 写最小失败测试。
2. 运行目标测试，确认失败是预期失败，不是语法或环境错误。
3. 写最小实现。
4. 运行目标测试，确认通过。
5. 运行相关测试集。
6. 更新文档或验收清单。
7. 最后运行 `npm run lint`、`npm run test:ci`、`npm run build`。

禁止事项：

- 不允许先写生产代码后补测试。
- 不允许为了过测试改弱断言。
- 不允许用通过 lint/build 代替业务验收。
- 不允许改变现有用户路径，除非是修复明确坏行为。

## 5. AI 友好执行任务

### Task G-01：强制数据库页面动态渲染

**目标**：`/dashboard` 和 `/vault` 在生产构建中不再静态预渲染。

**修改文件**：

- `src/app/dashboard/page.tsx`
- `src/app/vault/page.tsx`
- 新增测试：`src/app/rendering-policy.test.ts`

**TDD 设计**：

1. 新增测试读取两个 page 文件，断言导出 `dynamic = "force-dynamic"` 或 `revalidate = 0`。
2. 先运行该测试，预期失败。
3. 在两个 page 文件顶部添加动态渲染声明。
4. 运行目标测试通过。
5. 运行 `npm run build`，确认输出中 `/dashboard` 和 `/vault` 为动态。

**验收**：

- `node --import tsx --test src/app/rendering-policy.test.ts` 通过。
- `npm run build` 输出 `/dashboard`、`/vault` 为 `ƒ`。

### Task G-02：核心 API 输入契约

**目标**：让核心 mutating API 的 request body 使用共享 schema 校验。

**修改文件**：

- 新增：`src/lib/api-schemas.ts`
- 修改：`src/app/api/review/grade/route.ts`
- 修改：`src/app/api/vault/route.ts`
- 修改：`src/app/api/vault/[id]/route.ts`
- 修改：`src/app/api/track/[id]/route.ts`
- 修改：`src/app/api/sentence/[id]/route.ts`
- 新增测试：`src/lib/api-schemas.test.ts`

**TDD 设计**：

1. 测试 `reviewGradeSchema` 拒绝未知 `quality`，接受 `again/hard/good/easy`。
2. 测试 `vaultCreateSchema` 要求 `sentenceId` 为非空字符串、`tags` 为字符串数组。
3. 测试 `vaultPatchSchema` 拒绝非数组 `tags`。
4. 测试 `trackPatchSchema` 拒绝未知 `status`，接受既有状态。
5. 测试 `sentencePatchSchema` 拒绝空对象、空文本和非字符串 formatting。
6. 先运行测试失败。
7. 实现 schema 和 `formatZodError` helper。
8. 路由中使用 `safeParse`，失败返回 400。

**验收**：

- `node --import tsx --test src/lib/api-schemas.test.ts` 通过。
- 所有被修改 route 不再直接信任 `await req.json()` 的结构。

### Task G-03：上传文件边界和失败清理

**目标**：上传前验证文件，转写失败时清理已经写入的音频文件。

**修改文件**：

- 新增：`src/lib/upload-policy.ts`
- 修改：`src/app/api/upload/route.ts`
- 新增测试：`src/lib/upload-policy.test.ts`

**TDD 设计**：

1. 测试 `sanitizeUploadFilename` 删除路径分隔符和控制字符。
2. 测试 `validateUploadFileMetadata` 拒绝空文件、超大文件、非音频 MIME/扩展。
3. 测试 `buildUploadTarget` 返回 `/uploads/<uuid>-<safe-name>` 且路径在 `public/uploads` 下。
4. 先运行测试失败。
5. 实现 helper。
6. route 中先验证，再写文件；catch 中如果当前文件已写入则 `unlink` 清理。

**验收**：

- `node --import tsx --test src/lib/upload-policy.test.ts` 通过。
- 上传 route 单文件和批量上传都复用 helper。

### Task G-04：HTML note 清洗强化

**目标**：降低当前 note HTML 渲染的 XSS 风险，不改变现有粗体、颜色、字号等基本编辑能力。

**修改文件**：

- `src/lib/sanitize-html.ts`
- 新增测试：`src/lib/sanitize-html.test.ts`

**TDD 设计**：

1. 测试移除 `<script>`、`<iframe>`、事件属性。
2. 测试移除 unquoted event handler。
3. 测试移除 `href="javascript:..."`、实体编码后的 `javascript:`、`data:`。
4. 测试保留安全格式标签和安全颜色 style。
5. 先运行测试失败。
6. 实现更严格 allowlist：标签 allowlist、属性 allowlist、URL 协议 allowlist、style 属性只允许有限 text formatting。

**验收**：

- `node --import tsx --test src/lib/sanitize-html.test.ts` 通过。
- 现有 note 渲染点继续调用 `sanitizeHtml`。

### Task G-05：统一 due / nextReview 查询语义

**目标**：所有“到期复习”查询以 `due` 为主，`nextReview` 仅作为旧数据兼容 fallback。

**修改文件**：

- `src/app/api/audio/export/route.ts`
- 新增或扩展：`src/app/api/audio/export/route.test.ts`

**TDD 设计**：

1. 测试 due export where 条件包含 `OR: [{ due <= now }, { due missing/legacy fallback }]` 或明确只使用 `due`。
2. 测试排序字段和 review 页面一致。
3. 先运行测试失败。
4. 抽出 `buildDueReviewItemsWhere(now)` helper，并在 export due 分支使用。

**验收**：

- 目标测试通过。
- Review 页面和 due export 不再一个查 `due`、一个查 `nextReview`。

### Task G-06：Dashboard 倒计时语义

**目标**：目标日期已过时不显示正向倒计时。

**修改文件**：

- `src/app/dashboard/page.tsx`
- 新增或扩展：`src/app/dashboard/DashboardTabs.test.ts`

**TDD 设计**：

1. 抽出 `getCountdownDays(today, target)`。
2. 测试未来日期返回剩余天数。
3. 测试过去日期返回 0 或负数语义。当前建议返回 0，避免破坏 UI。
4. 先运行测试失败。
5. 替换 `Math.abs`。

**验收**：

- 目标测试通过。
- Dashboard UI 仍接收 `countdownDays` number。

## 6. 验收命令

完整整改完成后必须运行：

```bash
npm run lint
npm run test:ci
npm run build
```

还必须人工检查：

- `git diff --stat` 只包含治理文档、测试和必要代码改动。
- `next build` 输出中 `/dashboard` 与 `/vault` 为动态。
- 没有新增破坏性迁移。
- 没有引入需要额外密钥的新功能。

## 7. 自检与反思记录

### 自检 1

问题：初稿如果只写“治理原则”，AI 执行者仍然不知道先改哪里、怎么测。  
修正：加入 G-01 到 G-06 的具体文件、测试、命令和验收证据。

### 自检 2

问题：如果把认证、服务层大重构放进当前必做范围，会高概率破坏本地单用户工作流。  
修正：认证/CSRF/速率限制列为 P2，要求先明确部署假设；当前分支优先做不破坏功能的安全和正确性整改。

### 自检 3

问题：HTML sanitizer 要求“顶尖”时最好引入成熟库，但立即加依赖会扩大 lockfile 和兼容风险。  
修正：当前分支先通过测试强化现有 sanitizer 的协议、属性和 payload 防护；后续 P1/P2 可评估引入成熟 sanitizer，并配合真实浏览器安全测试。

### 自检 4

问题：测试如果继续只做源码正则，无法支撑“工程级质量”。  
修正：对 schema、upload policy、sanitizer、date helper 设计纯函数行为测试；仅 G-01 保留源码策略测试，因为 Next 构建策略本身需要声明存在。

### 自检 5

问题：目标要求“只修坏内容”，但大规模拆组件可能引发回归。  
修正：当前执行范围聚焦 P0/P1 小步修正，超大组件拆分列为后续治理任务，除非被当前 bug 修复自然触发。

## 8. 当前治理分支完成定义

当前分支可以视为完成，必须同时满足：

1. G-01 到 G-06 已完成或有明确不可完成说明。
2. 每个完成任务都有对应测试。
3. `npm run lint` 通过。
4. `npm run test:ci` 通过。
5. `npm run build` 通过。
6. 生产构建输出确认 `/dashboard` 和 `/vault` 动态渲染。
7. `docs/review` 下保留本治理文档和原始评审文档，形成证据链。

## 9. 本轮执行记录

分支：`governance-quality-hardening`

已完成：

- G-01：`/dashboard`、`/vault` 增加 `dynamic = "force-dynamic"`，并新增 `src/app/rendering-policy.test.ts`。
- G-02：新增 `src/lib/api-schemas.ts` 和 `src/lib/api-schemas.test.ts`，并接入 review grade、vault、track、sentence、study-time API。
- G-03：新增 `src/lib/upload-policy.ts` 和 `src/lib/upload-policy.test.ts`，上传 route 已接入文件名清洗、大小/类型校验、上传目录创建和失败清理；Track 删除、音频导出、Library 导出已复用 `resolveStoredUploadPath`，避免路径防穿越逻辑分叉。
- G-04：新增 `src/lib/sanitize-html.test.ts`，强化 `src/lib/sanitize-html.ts` 的属性 allowlist、URL 协议检查、实体解码和安全富文本保留。
- G-05：`src/app/api/audio/export/route.ts` 新增 `buildDueReviewItemsWhere`，due export 改为使用 `due` 字段并按 `due` 排序。
- G-06：新增 `src/app/dashboard/date-utils.ts` 和测试，Dashboard 倒计时不再对过期目标日期取绝对值。
- G-07：新增 `src/lib/domain-constants.ts` 和测试，复习评分、难度、学习模式、Track 状态及状态 label 开始集中管理；API schema、dashboard 和 audio export 已复用共享常量。

已验证：

```bash
node --import tsx --test src/app/rendering-policy.test.ts src/lib/api-schemas.test.ts src/lib/upload-policy.test.ts src/lib/sanitize-html.test.ts src/app/api/audio/export/route.test.ts src/app/dashboard/date-utils.test.ts
npm run test:ci
npm run lint
npm run build
```

验证结果：

- 目标测试：18 个通过。
- 全量测试：52 个通过。
- lint：通过。
- build：通过。
- build 输出中 `/dashboard` 和 `/vault` 均为 `ƒ (Dynamic)`。

本轮未强行执行：

- G-08 超大组件拆分：属于高回归风险重构，当前没有可观测行为 bug 作为切入点。应在单独分支中先补浏览器级行为测试，再拆分。
- G-10 认证/授权/CSRF：需要先确认部署模式。当前项目看起来是本地/单用户工具，直接加登录或 CSRF token 可能破坏现有工作流。
