# DeepListener AI Coding 代码质量与同事能力评估

审查日期：2026-05-17  
审查对象：当前工作区代码，包含未提交改动  
结论先行：这是一个能跑、功能面不小、局部还有一些认真修补痕迹的 AI-assisted MVP；但它离“工程质量稳定、架构边界清楚、生产风险可控”还有明显距离。毒舌一点说：这不像高级工程师长期经营出来的系统，更像一个会用 AI 工具的人把功能一路堆出来，再用测试和局部补丁把最扎眼的坑糊住。

## 一、综合评分

| 维度 | 分数 | 判断 |
|---|---:|---|
| 同事综合工程能力 | 5.2 / 10 | 会让 AI 产出可用功能，也能做一些局部修复；但架构判断、安全意识、测试设计偏弱。 |
| 当前架构质量 | 5.0 / 10 | Next App Router、Prisma、组件拆分都有基本形状；但数据获取、领域逻辑、渲染策略、状态边界混乱。 |
| 当前程序质量 | 4.8 / 10 | lint/test/build 都过，但很多问题是“通过构建不代表正确”。输入校验、安全边界、真实行为测试很薄。 |
| 可继续迭代性 | 5.0 / 10 | 还能救，但不能继续照现在方式堆。再堆两轮会变成谁都不敢动的功能泥潭。 |

## 二、审查方法与可复现结果

我检查了项目结构、配置、Prisma schema、关键页面、API routes、核心组件、测试和构建输出。

可复现质量门禁：

- `npm run lint`：通过。
- `npm run test:ci`：通过，31 个 Node tests 全部 pass。
- `npm run build`：通过。
- 代码规模：`src` 下 TS/TSX 文件 111 个，总计约 11791 行。
- 最大文件包括 `src/app/vault/VaultListClient.tsx` 672 行、`src/app/review/ReviewClient.tsx` 514 行、`src/components/feature/ShadowingConsole.tsx` 452 行、`src/app/api/audio/export/route.ts` 447 行。

一个很关键的构建发现：`next build` 输出显示 `/dashboard` 和 `/vault` 是静态页面：

```text
○ /dashboard
○ /vault
ƒ /library
ƒ /practice/[id]
ƒ /review
```

这和代码事实冲突：`src/app/dashboard/page.tsx`、`src/app/vault/page.tsx` 都直接查询数据库。也就是说，这两个页面存在被构建时数据快照污染的风险。

## 三、正向能力证据

这位同事不是完全不会写代码，不能一棍子打死。

1. 项目有基本工程骨架  
   `package.json:5-13` 提供 `dev`、`build`、`lint`、`test:ci`、`sync` 等命令；`.github/workflows/ci.yml:31-38` 在 CI 中跑 lint、test 和 build。这说明对基本交付流程有概念。

2. 技术选型和目录组织基本对路  
   Next App Router 路由在 `src/app`，API 在 `src/app/api`，UI primitive 和 feature component 分开，Prisma schema 在 `prisma/schema.prisma`。这不是纯粹乱扔文件。

3. 数据模型有关系和索引意识  
   `prisma/schema.prisma:10-27` 定义 Track，`44-54` 定义 Sentence，`56-82` 定义 ReviewItem，并给 `isArchived`、`status`、`createdAt`、`due`、`nextReview` 等字段建了索引。虽然模型设计有问题，但不是完全没有数据库意识。

4. 局部复杂组件有抽取动作  
   `src/components/feature/AudioPlayer.tsx:4-10` 把 WaveSurfer、auto scroll、交互、展示状态拆到 hook / presentation 文件；`src/components/feature/audio-player/useWaveSurfer.ts:68-135` 里也做了实例创建和销毁处理。这说明同事至少知道“超大组件要拆”，只是执行不稳定。

5. 有针对历史 bug 的回归测试  
   比如 `src/app/api/audio/export/route.test.ts:4-32` 测了 date range 不被覆盖，`src/components/feature/contentEditable-sync.test.ts:11-16` 防止 contentEditable 重写导致光标问题。说明有一定 debug 后补测试的意识。

## 四、主要架构问题

### 1. 数据库页面被静态预渲染：这是架构级硬伤

`src/app/dashboard/page.tsx:57-100` 直接查询 `prisma.track`、`prisma.errorTag`、`prisma.studySession`、`prisma.reviewLog`、`prisma.reviewItem`。  
`src/app/vault/page.tsx:65-108` 直接查询 `prisma.reviewItem.count/findMany`。

但生产构建输出把 `/dashboard` 和 `/vault` 标成静态页面。`/review` 明确写了 `export const revalidate = 0` 和 `export const dynamic = 'force-dynamic'`（`src/app/review/page.tsx:17-18`），而 `/dashboard`、`/vault` 没有类似声明。

影响：Analytics 和 Vault 这种典型实时数据库页面可能拿到构建期数据，而不是请求期数据。这个问题不是样式瑕疵，是对 Next 渲染模型理解不完整。AI 很容易生成“看起来能跑”的代码，人需要知道哪里必须强制动态；这里人没兜住。

### 2. 领域逻辑到处散，缺少服务层

上传、复习调度、导出、统计聚合都直接写在 route/page 里：

- 上传 API 在 `src/app/api/upload/route.ts:31-45` 里直接创建 Track 和 Sentence。
- 复习评分 API 在 `src/app/api/review/grade/route.ts:27-71` 里直接调用 FSRS、覆盖 Again/Hard 间隔、更新 ReviewItem、创建日志。
- 音频导出在 `src/app/api/audio/export/route.ts:67-219` 里混合了查询、路径校验、文件存在检查、segment 转换。
- Dashboard 在 `src/app/dashboard/page.tsx:102-239` 里做大量统计聚合。

这会导致两个后果：第一，核心业务规则只能通过页面/API 间接测；第二，未来改 FSRS、导出规则或统计口径时，很容易改一处漏三处。现在的结构更像“AI 按需求生成的一坨业务脚本”，不是稳定的应用架构。

### 3. 大组件仍然过大，状态边界混乱

`VaultListClient.tsx` 672 行，内部同时处理筛选、排序、播放单句、Play All、归档、删除、编辑弹窗和渲染列表。仅状态就集中在 `src/app/vault/VaultListClient.tsx:52-67`，音频控制又从 `195-289` 延伸一大段。

`ReviewClient.tsx` 514 行，同一个组件里处理队列、音频、键盘快捷键、评分、导出、归档、编辑弹窗和展示。比如 `src/app/review/ReviewClient.tsx:145-192` 的评分流程既更新服务端，又手动改本地队列，还在边界情况 `window.location.reload()`。

这是典型“AI 继续补，组件继续长”的味道。功能会越来越容易加，直到某一天每个改动都像拆炸弹。

### 4. 数据模型靠字符串撑业务语义

`Track.status` 是 `String`（`prisma/schema.prisma:19`），`ReviewItem.difficulty` 是 `String`（`prisma/schema.prisma:60`），`trackType`、`trackTopic` 也是自由字符串（`prisma/schema.prisma:16-17`）。

API 又没有严格枚举校验。例如 `src/app/api/track/[id]/route.ts:39-45` 只要 body 里 `status` 是 string 就写入。结果就是数据库可以出现任意状态值，UI 只能靠兜底显示。短期省事，长期报应。

### 5. due / nextReview 双字段制造歧义

`ReviewItem` 同时有 `due` 和 `nextReview`（`prisma/schema.prisma:67-70`）。评分 API 会同时更新二者（`src/app/api/review/grade/route.ts:63-66`），但不同地方使用不同字段：

- Review 页面按 `due` 查到期项：`src/app/review/page.tsx:50-53`。
- Audio export 的 due 类型按 `nextReview` 查：`src/app/api/audio/export/route.ts:94-109`。
- Vault 展示还做 `due ?? nextReview` fallback：`src/app/vault/VaultListClient.tsx:42-49`。

这不是“兼容性设计”，这是历史包袱没有收干净。字段一旦出现分叉，复习队列和导出内容就可能不一致。

## 五、主要程序质量问题

### 1. 上传 API 输入边界很弱

`src/app/api/upload/route.ts:17-22` 直接把上传文件转 Buffer 并写进 `public/uploads`，没有文件大小限制、MIME/扩展名白名单、文件名清洗、磁盘配额、并发控制。`60-133` 的批量上传同样如此。

更糟糕的是，文件先落盘，再转写；如果 `provider.transcribe(uploadPath)` 失败（`src/app/api/upload/route.ts:27-28`、`88-89`），catch 里只记录失败，不删除已写入文件。批量上传失败会留下孤儿文件。这个级别的资源生命周期控制，靠“能跑”是不够的。

### 2. API validation 很不一致

有些地方有校验，比如 `src/app/api/audio/export/route.ts:236-287` 对 export type、trackId、difficulty、date range 做了校验。  
但很多地方几乎裸奔：

- `src/app/api/vault/route.ts:6-15` 默认 `tags` 可迭代；如果传错类型，直接抛 500。
- `src/app/api/vault/[id]/route.ts:22-35` 对 `tags.map` 没有数组校验，也没有确保 tag 已存在。
- `src/app/api/review/grade/route.ts:17` 只靠 TypeScript 声明 `quality`，运行时没有校验；`mapRatingToNumber` 的 default 会把未知值当 good（`5-12`）。
- `src/app/api/track/[id]/route.ts:39-45` 对 title/status 等只检查类型，不检查长度、枚举、空字符串。

这是 AI 代码常见病：每个 route 看起来都“处理了错误”，但错误处理只是 catch 之后返回 500，不是输入契约。

### 3. XSS 防护是手搓正则，风险偏高

项目用 contentEditable 保存 HTML：

- `src/components/feature/NoteEditor.tsx:55-67` 读取 `innerHTML` 后保存到 `/api/track/[id]`。
- `src/components/feature/ReviewNoteEditor.tsx:53-65` 读取 `innerHTML` 后保存到 `/api/vault/[id]`。
- `src/components/feature/RichTextNoteEditor.tsx:36-47` 直接写入/读取 `innerHTML`。

渲染时使用 `dangerouslySetInnerHTML`，例如 `src/app/vault/VaultListClient.tsx:591-594`、`src/app/review/ReviewClient.tsx:415-421`、`src/app/library/NotesList.tsx:42`。  
清洗函数在 `src/lib/sanitize-html.ts:5-64`，但这是正则清洗 HTML。它删除 `<script>`、事件属性、`javascript:`、`data:`，但允许 `href`、`src`、`target` 等属性（`54-57`），没有使用成熟 HTML sanitizer，也没有基于 DOM parser 做协议白名单。

结论：这不是可以放心上线的 XSS 策略。这种地方用正则清洗 HTML，基本就是在给攻击者出题。

### 4. 没有认证、授权、CSRF、速率限制

所有 mutating API 都没有看到用户身份、权限或 CSRF 检查。例如：

- 上传：`src/app/api/upload/route.ts:8-58`。
- 删除 track：`src/app/api/track/[id]/route.ts:7-29`。
- 复习评分：`src/app/api/review/grade/route.ts:15-83`。
- 删除/更新 vault：`src/app/api/vault/[id]/route.ts:5-46`。

如果这是纯本地单用户工具，风险可以接受但也应该写明假设；如果部署到网络上，这就是开门营业还不装锁。

### 5. Dashboard 有明显日期逻辑 bug

`src/app/dashboard/page.tsx:13-18` 默认目标日期是 `2026-05-16`，但用 `Math.abs(targetDate.getTime() - today.getTime())` 算倒计时。目标日期过了以后仍然显示正数天数，不会告诉用户已经逾期。

这类 bug 很说明问题：AI 会写“倒计时公式”，但不会追问业务语义。工程师应该知道倒计时不是绝对值。

### 6. 错误信息直接回给客户端

多处 catch 把 `error.message` 直接返回，例如 `src/app/api/upload/route.ts:53-56`、`src/app/api/vault/[id]/route.ts:43-45`、`src/app/api/audio/export/route.ts:439-444`。本地工具可以宽松一点，但这不是良好的服务端错误边界。至少应该区分用户错误、系统错误和敏感内部错误。

### 7. 运维脚本暴露部署细节

`package.json` 的 `sync` 脚本曾经直接写了硬编码的 `root@<server-ip>:/var/www/html/DeepListener/...`。这不一定是密钥泄露，但它把部署账号、主机和路径暴露在版本化脚本中，还鼓励用 root 做 rsync。工程纪律一般。（注：该问题已于后续整改中参数化为读取 `SYNC_REMOTE` / `SYNC_REMOTE_BASE` 环境变量，真实主机不再出现在仓库中。）

### 8. 包管理信号混乱

仓库同时存在 `package-lock.json` 和 `pnpm-lock.yaml`，但脚本和 CI 用的是 npm（`package.json:5-13`、`.github/workflows/ci.yml:28-35`）。当前工作区里两个 lockfile 也都处于修改状态。这种状态很容易引入依赖漂移和审查噪音。

## 六、测试质量评价

测试数量看起来还行：15 个 test 文件，31 个测试，`npm run test:ci` 通过。但测试质量不能只看 pass 数。

问题是，很多测试是“源码正则测试”，不是行为测试：

- `src/app/review/ReviewClient.test.ts:5-21` 读取 `ReviewClient.tsx` 源码，匹配 type 定义。
- `src/components/feature/contentEditable-sync.test.ts:11-16` 读取源码，检查有 `innerHTML !==`。
- `src/lib/ci-workflow.test.ts:6-19` 读取 CI yml，检查字符串存在。

这些测试有价值，能防止某些历史改动回退；但它们很脆，也无法证明用户行为正确。当前缺少更关键的测试：

- 上传失败是否清理文件。
- 复习评分是否在并发下保持计数正确。
- `due` 和 `nextReview` 是否一致。
- sanitizer 是否能挡住实际 XSS payload。
- `/dashboard`、`/vault` 是否强制动态获取最新数据。
- API 对非法 body 是否返回 400 而不是 500。

一句话：测试像是 AI 修 bug 后贴的创可贴，不是系统性的质量网。

## 七、同事能力画像

| 能力项 | 分数 | 证据与评价 |
|---|---:|---|
| AI Coding 工具使用 | 7.0 | 能快速堆出上传、转写、复习、Vault、Dashboard、导出、PWA、CI 等完整功能面。功能广度不错。 |
| React / Next 基础 | 5.5 | 会用 App Router、client/server component、hooks、Suspense；但 `/dashboard`、`/vault` 静态渲染数据库页面暴露了 Next mental model 不扎实。 |
| 前端状态管理 | 5.0 | 能处理复杂音频交互，也有 hook 抽取；但大组件状态膨胀，`window.location.reload()`、imperative audio/DOM 操作较多。 |
| 后端 API 设计 | 4.0 | 能写 route handler 和 Prisma CRUD；但输入校验、安全、错误边界、事务和资源清理明显不足。 |
| 数据建模 | 5.0 | 有关系、索引和 cascade；但业务枚举用字符串、重复字段未收敛、状态语义松散。 |
| 测试设计 | 3.8 | 会补测试，也接入 CI；但大量源码匹配测试，缺少真实 API/DB/浏览器行为测试。 |
| 安全意识 | 3.0 | contentEditable + dangerouslySetInnerHTML + 手搓 sanitizer，无认证授权，无上传限制。这个分数不能更高。 |
| 可维护性意识 | 4.5 | 有抽取动作，但不稳定；一些文件已经大到维护成本偏高。 |
| 生产化意识 | 4.0 | 有 build/lint/test/CI，但 sync 脚本、静态数据库页面、错误泄漏、ffmpeg 重任务都说明生产边界没想清楚。 |

综合判断：这位同事像是“AI 工具熟练使用者 + 中级前端/全栈基础”，不是能独立兜底架构质量的高级工程师。让他做原型、内部工具、明确边界的小功能可以；让他单独负责生产系统的安全、数据模型和架构演进，风险偏大。

## 八、架构质量评分明细

| 架构维度 | 分数 | 说明 |
|---|---:|---|
| 模块划分 | 5.5 | 目录结构有基本层次，AudioPlayer 局部抽取不错；但业务逻辑散在 route/page/component。 |
| 领域边界 | 4.0 | 复习调度、导出、统计聚合没有稳定 service/domain 层。 |
| 数据一致性 | 4.5 | Prisma 关系可以，但字符串枚举、`due/nextReview` 双字段、自由状态值会积累脏数据。 |
| 渲染策略 | 3.5 | 数据库页面静态化是硬伤。 |
| 可扩展性 | 5.0 | 功能能继续加，但继续加会明显增加耦合和回归风险。 |
| 可观测性 | 3.5 | 基本靠 console，没有结构化日志、错误分类、指标。 |

架构总评：5.0 / 10。骨架有，但关键承重墙偷工减料。

## 九、程序质量评分明细

| 程序维度 | 分数 | 说明 |
|---|---:|---|
| TypeScript 使用 | 6.0 | `strict: true` 是正向信号；但 `allowJs`、`skipLibCheck`、`no-explicit-any: warn` 降低了约束。见 `tsconfig.json:5-7`、`eslint.config.mjs:9-16`。 |
| 正确性 | 5.0 | happy path 能跑，build/test 过；但日期、静态渲染、输入错误、并发和资源清理风险明显。 |
| 安全性 | 3.0 | 上传、HTML、API 权限边界都弱。 |
| 性能 | 5.0 | 有一些性能意识，如 WaveSurfer cleanup 和 dashboard 查询并行；但 dashboard 把大量聚合拉到内存做，导出 API 用 ffmpeg 重任务阻塞请求周期。 |
| 测试有效性 | 3.8 | CI pass 不能掩盖行为测试薄弱。 |
| 可读性 | 5.5 | 局部命名还行，但大文件和混杂职责拉低可读性。 |
| 运维可靠性 | 4.0 | CI 有，生产边界弱。 |

程序质量总评：4.8 / 10。不是烂到不能用，但离“放心改、放心部署”很远。

## 十、最高优先级整改建议

1. 立刻修复动态渲染问题  
   给 `/dashboard` 和 `/vault` 明确加 `export const dynamic = 'force-dynamic'` 或等价策略，并验证 build 输出不再是静态页面。

2. 建立 domain/service 层  
   把上传创建 Track/Sentence、复习评分、导出筛选、统计聚合从 route/page 中抽到 `src/lib` 或 `src/server` 的服务函数，并给这些函数写真实单元测试。

3. 收敛数据模型  
   把 `status`、`difficulty`、`reviewType`、`StudySession.type` 等自由字符串改为明确枚举或至少集中常量 + runtime validation。清理或明确 `due` 与 `nextReview` 的单一真相。

4. 重做 API validation  
   用 Zod 或类似方案定义每个 request body。非法输入返回 400，不要靠 Prisma 抛 500。

5. 替换 HTML sanitizer  
   不要手搓正则 sanitizer。要么只存结构化 rich-text model，要么使用成熟 sanitizer，并给实际 XSS payload 写测试。

6. 给上传和导出加资源边界  
   上传限制大小和类型；转写失败清理文件；导出限制并发、时长和总文件大小；ffmpeg 重任务最好异步化或至少加明确超时和队列。

7. 把测试从“源码正则”升级到行为测试  
   保留少量源码 guard 可以，但核心要测 API、DB、sanitizer、FSRS、页面动态数据和浏览器交互。

## 十一、最终判断

这个项目的当前状态是：能演示，能自用，能继续小步修；但不能拿“lint/test/build 都过”来证明质量好。真正的问题不是某几行代码丑，而是同事过度依赖 AI 生成 happy path，缺少人类工程师该补上的边界判断。

如果用人话评价这位同事：他会把 AI 当铲车，把功能土方铲得很快；但他还没有证明自己会做地基、防水和承重验算。让他继续写可以，但必须有更强的人做架构 review、安全 review 和测试策略兜底。
