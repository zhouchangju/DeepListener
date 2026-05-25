# DeepListener AI Coding 代码与同事能力综合评估

审查日期：2026-05-25  
审查范围：当前工作区代码，包含未提交的 dictation/shadowing 相关改动。  
审查对象：`src/app`、`src/components`、`src/lib`、`src/symphony`、`prisma`、测试、构建与工程配置。  
结论强度：基于当前代码事实，不基于口碑、动机或猜测。

## 0. 结论先行

这位同事不是不会写代码。更准确地说：他能用 AI Coding 工具把功能推到可用，也能在局部做安全、测试和性能补丁；但还没有体现出足够强的架构收敛能力、运行时边界意识和长期维护判断。

毒舌一点：这不是一个资深工程师“设计出来”的系统，更像一个会用 AI 工具的人一路把功能堆出来，然后在最明显的坑上贴补丁。能跑，不等于高级；能 build，不等于可靠；有测试，不等于测试有含金量。

综合评分：**5.6 / 10**。

这个分数的意思是：做个人工具、内部原型、快速 MVP，合格甚至偏有战斗力；做多人长期维护、可对外部署、数据可靠性和安全性要求高的产品，目前不合格。

## 1. 当前事实底座

### 1.1 工作区状态

审查时工作区不是干净状态，以下文件有未提交改动或新增：

- `src/components/feature/ShadowingConsole.tsx`
- `src/components/feature/shadowing/presentation.ts`
- `src/components/feature/shadowing/presentation.test.ts`
- `src/components/feature/shadowing/DictationPanel.tsx`
- `src/components/feature/shadowing/dictation.ts`
- `src/components/feature/shadowing/dictation.test.ts`

本报告按“当前工作区代码”评价，不只评价已提交版本。

### 1.2 可复现验证

实际运行结果：

- `npm run lint`：通过，零输出。
- `npm run test:ci`：通过，58 个 Node tests 全部 pass。
- `npm run build`：通过，Next.js 16.2.5 生产构建成功。

构建输出显示数据库页面当前已经是动态渲染：

- `/dashboard`：dynamic。
- `/library`：dynamic。
- `/practice/[id]`：dynamic。
- `/review`：dynamic。
- `/vault`：dynamic。

这点比旧审计里提到的“dashboard/vault 静态化风险”已有改善。

### 1.3 代码规模

当前 `src` 下 TypeScript/TSX：

- TS/TSX 文件：124 个。
- 测试文件：22 个。
- 测试用例：58 个。
- 总行数：约 13,002 行。
- API route：13 个。

最大文件：

| 文件 | 行数 | 评价 |
|---|---:|---|
| `src/app/vault/VaultListClient.tsx` | 672 | 明显过大，一个组件背了列表、过滤、排序、播放、批量播放、删除、归档、编辑弹窗 |
| `src/components/feature/ShadowingConsole.tsx` | 609 | shadowing、dictation、键盘、编辑、保存、音频控制全混在一起 |
| `src/app/review/ReviewClient.tsx` | 514 | 队列状态、音频、评分、导出、归档、编辑、快捷键混合 |
| `src/app/api/audio/export/route.ts` | 433 | 查询、校验、ffmpeg、临时文件、响应组装都在 route 里 |
| `src/app/library/LibraryManager.tsx` | 352 | 过滤、选择、批量播放、导出和渲染耦合 |

这不是“文件刚好长一点”，这是边界没有及时收。

## 2. 同事能力画像评分

| 维度 | 分数 | 证据判断 |
|---|---:|---|
| 产品落地能力 | 7.0 | Library、Practice、Review、Vault、Dashboard、上传、转写、FSRS、导出、shadowing/dictation 都能串起来 |
| 框架使用能力 | 6.2 | 会用 Next App Router、React hooks、Prisma、Radix/shadcn、WaveSurfer、ffmpeg，但边界治理一般 |
| AI Coding 驾驭能力 | 5.4 | 能驱动 AI 产出功能，也会补测试；但明显缺少“生成后重构、统一规范、约束边界”的二次工程化 |
| 架构设计能力 | 4.7 | 没有稳定 service/domain 层，业务规则散在 page、client component、route handler |
| 类型与数据建模 | 5.6 | `strict` 开了，Zod 也用了一部分；但数据库仍是大量裸字符串和重复字段 |
| 测试能力 | 5.2 | 测试数量不少且全过；但源码正则测试太多，行为测试不足 |
| 安全意识 | 5.1 | 上传路径、文件大小、HTML sanitizer 有补丁；但无认证授权、自研 sanitizer、错误信息泄露仍明显 |
| 性能与稳定性 | 5.3 | 有 hook 抽取、memo、batch、构建通过；但长任务 API、ffmpeg 并发、全量内存聚合和客户端过滤还粗 |
| 维护性意识 | 4.6 | 大组件、重复富文本、重复下载逻辑、重复状态常量、混合风格都说明维护边界弱 |

综合能力判断：**中级偏下到中级水平，强在功能推进，弱在工程治理。**  
如果这个人说“我能用 AI 很快做出来”，可信；如果他说“我能独立把系统架构长期守住”，当前代码不支持这个结论。

## 3. 架构质量评分

| 维度 | 分数 | 判断 |
|---|---:|---|
| 模块分层 | 4.8 | 有目录分层，但业务规则并没有真的分层 |
| 领域建模 | 4.6 | Review/Track/Sentence 基本模型可用，但字符串状态、重复字段和废弃模型并存 |
| API 边界 | 5.4 | 一部分 route 用 Zod，一部分仍手写解构和手动校验 |
| 前端架构 | 4.7 | UI 能用，但大组件和状态耦合严重 |
| 数据访问 | 5.2 | Prisma 查询直接、可理解；但没有 repository/service 抽象，统计聚合散在页面 |
| 可扩展性 | 4.8 | 当前功能能跑，继续堆功能会迅速变成泥潭 |

架构综合评分：**4.9 / 10**。

## 4. 程序质量评分

| 维度 | 分数 | 判断 |
|---|---:|---|
| 正确性 | 6.0 | lint/test/build 全过，核心流程能成立；但测试覆盖不到很多真实行为 |
| 可维护性 | 4.7 | 重复、超大组件、散落业务规则是主问题 |
| 安全性 | 5.0 | 本地个人工具勉强，公网产品不合格 |
| 性能稳定性 | 5.2 | 小数据量没问题，数据和并发上来会暴露 API 长任务和客户端过滤问题 |
| 类型质量 | 5.7 | TypeScript 使用还行，运行时输入边界参差不齐 |
| 测试质量 | 5.1 | 有测试门禁，但不少测试是在检查源码文本，不是在验证用户行为 |

程序质量综合评分：**5.3 / 10**。

## 5. 正向证据

### 5.1 工程门禁不是空壳

`package.json` 里有 `lint`、`test:ci`、`build`，CI 也跑核心门禁。`.github/workflows/ci.yml:31-38` 明确执行：

- `npm run lint`
- `npm run test:ci`
- `npm run build`

这说明同事至少知道不能只靠“本机能跑”。这一点要给分。

### 5.2 Next 动态渲染问题已有治理

`src/app/dashboard/page.tsx:8` 有 `export const dynamic = "force-dynamic"`。  
`src/app/vault/page.tsx:8` 也有 `export const dynamic = "force-dynamic"`。

实际 `npm run build` 输出也显示 `/dashboard`、`/vault` 是 dynamic。这个改动是正确的，说明之前的渲染策略风险被修过。

### 5.3 输入 schema 已经开始集中

`src/lib/api-schemas.ts:10-51` 定义了：

- `reviewGradeSchema`
- `vaultCreateSchema`
- `vaultPatchSchema`
- `trackPatchSchema`
- `sentencePatchSchema`
- `studyTimeSchema`

并且 `src/app/api/review/grade/route.ts:17-20`、`src/app/api/vault/route.ts:7-10`、`src/app/api/sentence/[id]/route.ts:8-11` 都开始使用 `safeParse`。

这不是“完全裸奔”的后端，已经有边界意识。但这个意识还没覆盖所有 route。

### 5.4 上传路径防护做得比拍脑袋强

`src/lib/upload-policy.ts:39-49` 清洗上传文件名。  
`src/lib/upload-policy.ts:51-73` 校验文件名、大小、音频扩展/MIME。  
`src/lib/upload-policy.ts:75-95` 用 UUID 生成目标路径，并检查路径不能逃出 `public/uploads`。  
`src/lib/upload-policy.ts:97-109` 对已存储上传路径做反穿越解析。

这块能看出一次比较明确的安全补丁，不是 AI 随便拼字符串。

### 5.5 转写 provider 抽象是合理的

`src/lib/transcription/types.ts:13-15` 定义 `TranscriptionProvider`。  
`src/lib/transcription/factory.ts:7-27` 根据环境变量选择 OpenAI、Google、Deepgram。

这个抽象对当前需求是合适的，至少没有把三套 provider 全塞进上传 route。

### 5.6 AudioPlayer 有过拆分治理

`src/components/feature/AudioPlayer.tsx:4-10` 把 WaveSurfer、auto scroll、audio interaction、presentation、子组件拆开。  
`src/components/feature/audio-player/useWaveSurfer.ts:68-135` 负责 WaveSurfer 生命周期和 cleanup。

这说明同事不是完全不会拆组件。问题是拆得不稳定，其他区域没有同等纪律。

### 5.7 测试覆盖了部分历史坑

`src/lib/upload-policy.test.ts` 覆盖上传路径和文件元数据。  
`src/lib/api-schemas.test.ts` 覆盖 API schema。  
`src/app/api/audio/export/route.test.ts` 覆盖 due/date filter helper。  
`src/components/feature/shadowing/dictation.test.ts` 覆盖 dictation diff 纯函数。

这些测试有实际价值。

## 6. 主要问题与证据链

### 6.1 业务规则散落，缺少真正的 domain/service 层

Review 业务规则至少散在三处：

- Review 队列查询在 `src/app/review/page.tsx:27-57`，包括今日已复习、Again/Hard relearning、due 过滤。
- Review 评分落库在 `src/app/api/review/grade/route.ts:32-77`，包括 FSRS 计算、Again/Hard 自定义间隔、retrieval/lapse 更新、log 创建。
- Review 前端队列变更在 `src/app/review/ReviewClient.tsx:145-192`，包括计数、删除当前项、toast、整页 reload。

这三个地方共同定义“复习系统怎么工作”。这很危险。业务规则不在一个地方，后续改间隔、改队列、改统计，很容易一处正确两处过期。

这类代码最大的问题不是今天不能跑，而是明天没人敢改。

### 6.2 大组件是维护性债务，不是复杂业务的自然结果

`src/app/vault/VaultListClient.tsx` 672 行，一个文件内包含：

- 状态定义：`52-67`
- 删除/归档 API 调用：`106-133`
- 过滤排序：`135-180`
- 单句播放：`195-233`
- Play All：`235-289`
- 筛选 UI：`356-497`
- 列表项渲染：`499-600`
- Sticky 播放条：`620-669`

`src/components/feature/ShadowingConsole.tsx` 609 行，一个文件内包含：

- shadowing workflow 状态
- dictation 状态
- 文本编辑
- formatting autosave
- 键盘快捷键
- modal layout
- audio waveform 控制

这就是典型的“AI 每次往文件里补一点，最后文件变成杂货铺”。能跑是事实；难维护也是事实。

### 6.3 领域模型已经出现分叉

Prisma schema 同时存在关系型分类模型和字符串分类字段：

- `prisma/schema.prisma:16-17`：`trackType`、`trackTopic` 是字符串字段。
- `prisma/schema.prisma:21-42`：`Track` 又有关联 `categories`、`Category`、`TrackCategory`。

实际 UI 和 API 主要用字符串：

- `src/app/library/LibraryManager.tsx:29-30` 硬编码 `CATEGORIES` 和 `TOPICS`。
- `src/app/library/LibraryManager.tsx:53-72` 在客户端按 `trackType`、`trackTopic` 过滤。
- `src/app/api/library/export/route.ts:36-42` 后端也按 `trackType`、`trackTopic` 过滤。

关系型分类模型基本没有进入实际业务路径。这个状态很糟：不是旧方案删干净，也不是新方案接上了，而是两套概念并存。

### 6.4 状态常量重复，数据库层挡不住垃圾值

`prisma/schema.prisma:19` 的 `Track.status` 是 `String`，不是 Prisma enum。  
`src/lib/domain-constants.ts:5-23` 定义了一套 `TRACK_STATUSES` 和 label。  
`src/app/library/TrackList.tsx:29-37` 又定义了一套 `STATUS_CONFIG`。

这会导致：

- UI 和 domain constants 可能漂移。
- 数据库可以写入任意 status 字符串。
- 新增状态时要记得改多个地方。

这不是“灵活”，这是没把领域约束建起来。

### 6.5 `due` / `nextReview`、`lapse` / `lapses` 命名危险

`ReviewItem` 同时有：

- `lapses`：`prisma/schema.prisma:65`
- `lapse`：`prisma/schema.prisma:69`
- `due`：`prisma/schema.prisma:67`
- `nextReview`：`prisma/schema.prisma:70`

评分时两个日期都会更新：

- `src/app/api/review/grade/route.ts:68` 写 `due`
- `src/app/api/review/grade/route.ts:71` 写 `nextReview`

Vault 又做 fallback：

- `src/app/vault/VaultListClient.tsx:42-49` 使用 `due ?? nextReview`

这说明历史字段没有收敛。字段多不是问题，语义相近又同时参与业务才是问题。`lapse` 和 `lapses` 这种命名，迟早会让人手滑写错。

### 6.6 API response 和校验风格不统一

同一个 API 层里混用：

- `NextResponse.json`：例如 `src/app/api/vault/route.ts:42`
- `new Response(JSON.stringify(...))`：例如 `src/app/api/audio/export/route.ts:226-229`
- 手动 header：例如 `src/app/api/vault/[id]/archive/route.ts:17-20`

输入校验也不统一：

- 有 Zod：`src/app/api/review/grade/route.ts:17-20`
- 手动局部校验：`src/app/api/audio/export/route.ts:224-273`
- 几乎裸解构：`src/app/api/vault/export/route.ts:11`、`src/app/api/library/export/route.ts:102-110`
- 只检查字段存在：`src/app/api/review/log/route.ts:6-10`

这不是风格问题，这是后端契约不统一。维护者每看一个 route 都要重新猜它的错误处理、校验规则和响应格式。

### 6.7 存在孤儿/重复 endpoint

`src/app/api/review/log/route.ts:4-20` 提供一个创建 `ReviewLog` 的 POST endpoint，只要求 `reviewItemId`。但当前 `rg "fetch"` 没看到客户端调用 `/api/review/log`；评分 API 已经在 `src/app/api/review/grade/route.ts:72-76` 内部创建 log。

这个 endpoint 现在看起来像遗留物。更坏的是，它创建 log 时没有 rating、没有 schema、没有业务校验，默认 rating 是 schema 里的 `0`。如果未来被误用，会污染统计。

这就是典型的“功能堆完不清场”。

### 6.8 富文本编辑器重复三份

三套非常相似的富文本逻辑：

- `src/components/feature/NoteEditor.tsx:24-206`
- `src/components/feature/ReviewNoteEditor.tsx:14-188`
- `src/components/feature/RichTextNoteEditor.tsx:21-131`

它们都在使用：

- `contentEditable`
- `document.execCommand`
- `innerHTML`
- 类似 toolbar
- 类似颜色/字号按钮

复制三份的代价很明确：修一个 caret bug 或 XSS 策略，要记得改三处。现在已经有 `RichTextNoteEditor`，但旧的两个编辑器没有被收敛。这不是抽象能力不足，就是治理没做完。

### 6.9 `dangerouslySetInnerHTML` 依赖自研 sanitizer，公网级安全不够

用户笔记 HTML 渲染位置：

- `src/app/review/ReviewClient.tsx:418-421`
- `src/app/vault/VaultListClient.tsx:591-594`
- `src/app/library/NotesList.tsx:42`

清洗逻辑在 `src/lib/sanitize-html.ts:5-61`，主要靠正则删除 script/style/event handler，再允许一批 tag 和属性。`src/lib/sanitize-html.ts:84-100` 允许 `a[href]`、`img[src]`、`font[color]` 等。

这比完全不清洗强，但不要自我感动。HTML sanitizer 是安全领域的坑，手搓正则不是成熟方案。对本地个人工具可接受；对公网产品，应该换成熟库并补攻击 payload 测试。

### 6.10 导出下载逻辑重复

相同的“读取 Content-Disposition、创建 blob URL、创建 a 标签、点击下载、revoke URL”逻辑出现在：

- `src/app/review/ReviewClient.tsx:260-272`
- `src/app/practice/[id]/PracticeClient.tsx:142-154`
- `src/app/library/LibraryManager.tsx:141-152`
- `src/app/vault/ExportButtons.tsx:94-107`
- `src/app/vault/ExportButtons.tsx:157-167`

这应该是一个 `downloadResponseBlob` helper。现在复制粘贴五处，是很低级的维护债。

### 6.11 长任务直接塞 API route，扩展性弱

`src/app/api/audio/export/route.ts:292-396` 在 API route 内创建临时目录、切 segment、生成 silence、concat、读最终 buffer。  
`src/app/api/library/export/route.ts:134-204` 同样在 route 内跑 ffmpeg 转码和合并。

问题：

- 这是长任务，不是普通 HTTP CRUD。
- `audio/export` 每批最多 50 个 segment 并发处理：`src/app/api/audio/export/route.ts:295-320`。
- 最终结果整体 `readFile` 到内存：`src/app/api/audio/export/route.ts:395-407`、`src/app/api/library/export/route.ts:204-216`。
- 没有 job queue、取消、进度、全局并发限制。

本地小规模可用；数据大一点、多人用一点，机器就会被 ffmpeg 拖死。

### 6.12 Dashboard 聚合直接堆页面里

`src/app/dashboard/page.tsx:49-92` 一次发 7 个 Prisma 查询。  
`src/app/dashboard/page.tsx:94-231` 在页面里做 stability、retention、overdue、heatmap、radar、future/past review 等聚合。

这段逻辑不应该活在 page component 里。它应该至少被拆成 analytics service 或纯函数模块。现在 dashboard 需求一变，就要在 server component 大坨代码里改统计口径。

### 6.13 测试里源码正则检查过多

`rg` 结果显示大量测试在用 `readFileSync + assert.match / assert.doesNotMatch` 检查源码字符串，例如：

- `src/app/review/ReviewClient.test.ts`
- `src/app/vault/VaultListClient.test.ts`
- `src/components/feature/audio-player/presentation.test.ts`
- `src/components/feature/audio-player/useWaveSurfer.test.ts`
- `src/components/feature/contentEditable-sync.test.ts`
- `src/app/rendering-policy.test.ts`
- `src/symphony/workflow.test.ts`

这种测试不是完全没用，它能防止某些历史 bug 被文字层面改回去。但它的含金量有限：它验证“源码长得像预期”，不是验证“用户行为正确”。这类测试占比高，说明测试策略还停留在 AI 补丁保护阶段。

### 6.14 前端状态处理有偷懒痕迹

`src/app/review/ReviewClient.tsx:178-187` 在边界情况直接 `window.location.reload()`。  
`src/app/review/ReviewClient.tsx:307-310` 归档最后一项也 reload。

Next App Router 项目里，频繁用整页 reload 表示组件状态模型没设计好。说难听点：这是“我懒得把状态收敛清楚”的代码。

### 6.15 时间统计容易重复记账

`src/contexts/TimeTrackingContext.tsx:45-82` 每 10 秒 heartbeat，一旦模式不是 `IDLE` 且有音频或 60 秒内用户活跃，就 POST `/api/study-time`。

问题：

- 没有跨 tab 去重。
- 没有 Page Visibility 控制。
- 没有失败退避。
- 用 `document.querySelectorAll("audio")` 判断音频播放：`src/contexts/TimeTrackingContext.tsx:55-61`，对 WaveSurfer/WebAudio 等场景不一定可靠。

作为粗略本地统计可以；作为严肃学习时长数据，不够严谨。

### 6.16 Provider 抽象有，但实现边界粗

`src/lib/transcription/factory.ts:10-14` 每次获取 provider 都可能 `setGlobalDispatcher`。这是全局副作用，不应该藏在 factory 每次调用里。

`src/lib/transcription/google-provider.ts:50-66` 直接拿 LLM 输出，去掉 Markdown 代码块后 `JSON.parse`，没有 Zod schema 校验 segment 结构、时间戳递增、start/end 合法性。

`src/lib/transcription/deepgram-provider.ts:13` 和 `src/lib/transcription/google-provider.ts:17` 都同步读取音频文件到内存。大音频场景下会有内存压力。

这个层次的实现看起来像“把 provider 接上了”，但还没有达到稳定服务适配器水平。

## 7. 安全评价

安全评分：**5.0 / 10**。

正向：

- 上传文件名清洗和路径边界检查存在。
- 上传大小限制存在：`src/lib/upload-policy.ts:4` 限制 250MB。
- 保存路径解析防 `..` 和反斜杠：`src/lib/upload-policy.ts:97-109`。
- HTML 渲染前有 sanitizer。

负向：

- 没有认证/授权。删除、上传、评分、归档等 mutating API 都没有用户边界。
- 没有 CSRF 防护。
- 没有 rate limit。
- 自研 sanitizer 不够硬。
- 多处 500 直接返回 `error.message`，例如 `src/app/api/upload/route.ts:71-73`、`src/app/api/review/grade/route.ts:83-86`、`src/app/api/study-time/route.ts:38-41`。
- `public/uploads` 当前本地占用约 985MB，说明上传目录是真实数据池。`.gitignore:37-40` 确实忽略了上传和 db，这点对，但也说明部署/备份/清理策略不能继续靠手工。

结论：如果这是本地单用户学习工具，安全勉强能忍；如果是公网产品，这个安全边界是纸糊的。

## 8. 测试评价

测试评分：**5.1 / 10**。

好处：

- `npm run test:ci` 能一次跑完 `src` 下所有 `*.test.ts(x)`。
- 58 个测试当前全过。
- `api-schemas`、`upload-policy`、`sanitize-html`、`dictation`、`audio export query helper` 这些纯函数测试有价值。
- CI 会跑测试。

问题：

- 缺少真正的 route integration test。上传、评分、删除、归档、导出异常路径都没有系统测。
- 缺少 React 用户行为测试。Review 快捷键、Vault Play All、Shadowing/Dictation 交互没有 Playwright 或 Testing Library 级别覆盖。
- 源码正则测试太多，防的是“某个字符串被删”，不是业务行为。
- 没有 coverage 指标。
- 没有数据库迁移验证测试。

一句话：测试是有的，但质量不够硬。它更像 AI 生成代码后的护栏贴纸，不像工程体系的安全网。

## 9. AI Coding 痕迹判断

以下不是单点定罪，但组合特征非常明显：

1. 大量“功能向前堆”的文件增长，没有及时抽 service/hook/component。
2. 同类逻辑复制后轻改，例如三套富文本编辑器、五处下载 blob。
3. 测试大量读源码字符串，像是在锁住 AI 曾经修过的 bug，而不是建立行为模型。
4. 注释有明显 prompt/补丁痕迹，例如 `src/components/feature/AudioPlayer.tsx:43-44` 的 “OPTIMIZATION 1”、`src/app/api/track/[id]/route.ts:7` 的“DELETE（保持不变）”。
5. 业务概念没有收敛，例如 `Category` 模型与 `trackType/trackTopic` 字符串并存。
6. API 风格一个 route 一个写法，像是多轮生成出来后缺少统一整理。

所以，判断不是“AI 写得烂”，而是“人没有把 AI 生成物驯化成可长期维护的系统”。

## 10. 分维度毒舌评价

### 产品推进

能把功能做出来，这点是真的。上传、转写、听力练习、跟读、听写、错题库、复习、dashboard、导出都不是空壳。这个人有推进力。

但推进方式偏野。像是一路开车冲过去，路是通了，护栏没装，路牌重复，排水沟也没修。

### 架构判断

架构判断偏弱。不是完全没有抽象，而是抽象不成体系。AudioPlayer 拆了，VaultList 没拆；API schema 有了，export route 还在手写；domain constants 有了，TrackList 又复制一份 status config。

这说明他知道一些“好做法”的名字，但没有稳定执行纪律。

### 代码审美

代码审美一般。大组件、重复逻辑、混合语言、混合响应风格、`window.location.reload()` 这种东西都说明代码没有被认真打磨。

不是丑到不能看，但绝对谈不上干净。

### 测试意识

有测试意识，但测试设计偏补丁化。能补历史坑，不能保证系统行为。用源码正则当测试，可以应急，不能当长期质量策略。

### 安全意识

比完全裸奔强，但还停在“我知道这里可能危险，所以写个 helper”阶段。认证授权、CSRF、rate limit、成熟 sanitizer、统一错误边界都没有形成。

### 对 AI 的驾驭

会用 AI 出活，不会稳定地审 AI。AI 最大的问题是喜欢把需求局部满足，却不负责整体熵增；当前代码正好暴露了这一点。人类 reviewer 没有把关住熵。

## 11. 当前最值得保留的东西

- Next App Router + Prisma + SQLite 的本地工具架构方向可以保留。
- `src/lib/api-schemas.ts` 可以继续扩展成统一 API 契约层。
- `src/lib/upload-policy.ts` 是好的边界抽象，应继续强化。
- `src/lib/transcription/types.ts` 的 provider 接口方向正确。
- `src/lib/fsrs.ts` 用 `ts-fsrs` 而不是手写算法，这个判断正确。
- `src/components/feature/audio-player/*` 的拆分方向值得复制到其他大组件。
- CI 门禁可以保留，并应继续强化。

## 12. 优先整改建议

### P0：先控风险

1. 删除或收紧 `/api/review/log`，避免无 rating 的 log 污染统计。
2. 给 `vault/export`、`library/export`、`audio/export` 补统一 Zod schema，不要继续手写半截校验。
3. 把错误响应统一成 `badRequest`、`notFound`、`serverError` helper，不要到处返回内部 `error.message`。
4. 明确部署假设：如果不是纯本地单用户，必须加认证授权和 CSRF/rate limit。
5. 用成熟 sanitizer 替换手搓 HTML 正则，或者把 note 存储改成受控结构。

### P1：再降维护成本

1. 抽 `src/lib/download-response.ts`，收敛五处 blob 下载逻辑。
2. 合并 `NoteEditor`、`ReviewNoteEditor`、`RichTextNoteEditor`。
3. 拆 `VaultListClient.tsx`：filter/sort、audio playback、list item、sticky player、actions 分开。
4. 拆 `ReviewClient.tsx`：queue reducer、audio playback、keyboard shortcut、card UI 分开。
5. 把 Review 业务规则抽到 `src/lib/review-service.ts` 或 `src/lib/review-domain.ts`。
6. 把 dashboard 聚合抽成纯函数，给统计口径补单测。

### P2：做真正工程化

1. 把 `Track.status`、`ReviewItem.difficulty` 改成 Prisma enum 或至少数据库层可约束的值。
2. 收敛 `due/nextReview` 和 `lapse/lapses` 命名与使用语义。
3. 处理 `Category/TrackCategory` 和 `trackType/trackTopic` 的二选一问题。
4. 加 Playwright 覆盖核心路径：上传后练习、capture 到 Vault、Review 打分、Vault 播放、导出。
5. 给 ffmpeg 导出加队列、并发限制、进度和失败恢复。

## 13. 最终综合判断

这位同事目前体现出的能力是：**能用 AI 快速搭一个复杂个人工具，并能在局部 bug 上补测试和补边界；但还不是能独立守住复杂系统质量的人。**

当前代码的架构质量：**4.9 / 10**。  
当前代码的程序质量：**5.3 / 10**。  
同事综合工程能力：**5.6 / 10**。

如果项目继续由这个模式推进，短期功能会越来越多，长期维护会越来越痛。现在最该做的不是再加功能，而是停下来收敛架构、统一 API 契约、拆大组件、替换脆弱测试。否则这套代码会变成典型 AI Coding 遗产：看起来什么都有，实际每改一步都在踩雷。
