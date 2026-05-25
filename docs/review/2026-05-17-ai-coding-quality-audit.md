# DeepListener AI Coding 代码质量与同事能力审计报告

审计日期：2026-05-17  
审计范围：`src/app`、`src/components`、`src/lib`、`prisma`、测试与工程配置。  
验证命令：`npm run lint` 通过；`npm run test:ci` 通过，31 个断言全绿；`npm run build` 通过，Next.js 16.2.5 生产构建成功。

## 结论先行

这位同事不是完全不会写代码。代码能把一个复杂的个人工具从 0 推到可用，说明他会拆产品功能、会调用框架和第三方库，也知道一些 React/Next/Prisma 的基本套路。但架构判断明显偏弱，很多实现是“AI 给一坨能跑的方案，然后人类帮它补胶带”。如果这是个人效率工具，可以勉强接受；如果这是多人长期维护或对外上线产品，目前质量不合格。

最毒舌但最准确的一句话：这是一个功能堆出来的项目，不是一个设计出来的系统。AI 很会码字，这位同事目前还没有表现出足够能力去约束 AI 的边界。

综合评分：**5.6 / 10**。

## 能力画像评分

| 维度 | 评分 | 判断 |
| --- | ---: | --- |
| 产品落地能力 | 7.0 | 能把 Library、Practice、Review、Vault、Dashboard、PWA、音频导出、FSRS 串起来。功能覆盖面不小。 |
| React/Next 基础 | 6.0 | 会用 App Router、Server Component、Client Component、hooks 和 Radix/shadcn 风格 UI，但组件边界和状态治理一般。 |
| 架构设计能力 | 4.5 | 缺少清晰 domain/service 层，页面、API、业务规则、文件系统处理互相直连。大文件和重复逻辑很多。 |
| 类型与数据建模 | 5.0 | 开了 `strict`，但 API 输入大量靠手写解构和类型断言，Prisma schema 也把状态、难度、类型都做成裸字符串。 |
| 测试能力 | 4.0 | 测试会跑，但大量测试是读源文件正则匹配，像是在给 AI 补作业，不是在验证系统行为。 |
| 安全意识 | 4.0 | 音频导出路径做了一点防穿越，但上传、富文本、API 鉴权、输入校验、错误信息治理都比较粗。 |
| 性能意识 | 5.5 | 知道 memo、WaveSurfer 拆 hook、音频分批处理，但也有全局事件、长任务 API、巨型列表和客户端过滤等隐患。 |
| 维护性 | 4.5 | 重复富文本编辑器、巨型客户端组件、硬编码业务常量、混合中英文注释，后续改动成本会越来越高。 |
| AI Coding 驾驭能力 | 5.0 | 能让 AI 产出功能，但明显没有系统性重构、边界抽象、测试策略和安全基线的验收能力。 |

## 证据链

### 1. 功能完整度：能做事，但像“堆功能”

正面事实：
- 路由覆盖完整：`library`、`practice/[id]`、`review`、`vault`、`dashboard` 以及 13 个 API route 都存在。
- 核心能力不是空壳：上传在 `src/app/api/upload/route.ts:8` 到 `src/app/api/upload/route.ts:52` 完成文件保存、转录、Track/Sentence 入库；复习评分在 `src/app/api/review/grade/route.ts:15` 到 `src/app/api/review/grade/route.ts:77` 更新 FSRS 字段和日志；音频导出在 `src/app/api/audio/export/route.ts:222` 到 `src/app/api/audio/export/route.ts:426` 真实调用 ffmpeg。
- 工程验证存在：`package.json:5` 到 `package.json:13` 提供 `lint`、`test:ci`、`build`；`.github/workflows/ci.yml:31` 到 `.github/workflows/ci.yml:38` 也跑 lint/test/build。

但问题也很明显：
- `src/app/vault/VaultListClient.tsx` 有 672 行，包含过滤、排序、音频播放、批量播放、删除、归档、编辑弹窗、渲染列表和 sticky player。一个文件同时当 controller、view、state machine、audio manager。这个文件不是“复杂”，是边界没拆。
- `src/app/review/ReviewClient.tsx` 有 514 行，自己维护 review 队列、audio ref、键盘事件、导出、归档、编辑回写和整张卡片 UI。`src/app/review/ReviewClient.tsx:145` 到 `src/app/review/ReviewClient.tsx:192` 把评分请求、计数更新、队列变更、toast 和整页 reload 混在一个 handler 里。
- Dashboard 的数据聚合几乎全堆在 Server Component：`src/app/dashboard/page.tsx:52` 到 `src/app/dashboard/page.tsx:239` 同时发 7 个查询并做 retention、overdue、heatmap、radar、progress、daily log 聚合。能跑，但没有可复用的 analytics service，也很难单测。

结论：产品推进力可以，架构控制力不足。像会开推土机，但不会画施工图。

### 2. 架构质量：App Router 用了，但分层基本没成体系

现状架构是：
- RSC 页面直接查 Prisma，例如 `src/app/review/page.tsx:20` 到 `src/app/review/page.tsx:122`、`src/app/library/page.tsx:80` 到 `src/app/library/page.tsx:100`、`src/app/dashboard/page.tsx:52` 到 `src/app/dashboard/page.tsx:239`。
- Client Component 直接 `fetch('/api/...')` 并自己维护状态，例如 `src/app/practice/[id]/PracticeClient.tsx:100` 到 `src/app/practice/[id]/PracticeClient.tsx:123`、`src/app/vault/VaultListClient.tsx:106` 到 `src/app/vault/VaultListClient.tsx:133`。
- API route 直接读请求、写 Prisma、操作文件系统、调第三方服务，例如 `src/app/api/upload/route.ts:17` 到 `src/app/api/upload/route.ts:45`。

这不是小项目早期的原罪，但现在功能已经足够多，继续这样写会迅速变成泥潭。比如 review 的规则同时散落在：
- 查询队列：`src/app/review/page.tsx:27` 到 `src/app/review/page.tsx:57`
- 评分落库：`src/app/api/review/grade/route.ts:27` 到 `src/app/api/review/grade/route.ts:72`
- 前端队列即时更新：`src/app/review/ReviewClient.tsx:160` 到 `src/app/review/ReviewClient.tsx:188`

同一个业务概念在三个地方各写一遍，很容易出现“今天能跑，明天改一处炸三处”。

### 3. 程序质量：有局部优化，但整体粗糙

有值得肯定的地方：
- `src/components/feature/AudioPlayer.tsx:43` 到 `src/components/feature/AudioPlayer.tsx:53` 对 sentences 做了 `useMemo`，避免每次 render 生成新数组。
- `src/components/feature/audio-player/useWaveSurfer.ts:68` 到 `src/components/feature/audio-player/useWaveSurfer.ts:135` 把 WaveSurfer 生命周期封到了 hook 里，至少比全塞组件里强。
- `src/app/api/audio/export/route.ts:180` 到 `src/app/api/audio/export/route.ts:209` 对 `audioUrl` 做了 `..`、反斜杠和 public 目录边界检查，这说明不是完全没有安全意识。

但坏味道更多：
- 大量条件 class 仍用模板字符串和三元表达式，违反本次 `frontend-code-review` 技能清单的“条件 class 用统一工具函数”规则。例子：`src/app/vault/VaultListClient.tsx:307`、`src/app/vault/VaultListClient.tsx:425`、`src/app/vault/VaultListClient.tsx:502`、`src/app/review/ReviewClient.tsx:376`、`src/components/feature/audio-player/SentenceList.tsx:63`。项目已有 `cn` 工具：`src/lib/utils.ts:4` 到 `src/lib/utils.ts:6`，但使用不统一。
- 富文本编辑器重复了三份：`src/components/feature/NoteEditor.tsx:24` 到 `src/components/feature/NoteEditor.tsx:205`、`src/components/feature/ReviewNoteEditor.tsx:14` 到 `src/components/feature/ReviewNoteEditor.tsx:188`、`src/components/feature/RichTextNoteEditor.tsx:21` 到 `src/components/feature/RichTextNoteEditor.tsx:131`。这不是复用，这是复制后改字号。
- 代码风格不稳定：`src/app/practice/[id]/PracticeClient.tsx:3` 到 `src/app/practice/[id]/PracticeClient.tsx:27` 出现大量空行；`src/app/dashboard/page.tsx:248` 到 `src/app/dashboard/page.tsx:272` 缩进明显漂移；中英文注释混杂且有“保持不变”这种没有维护价值的注释：`src/app/api/track/[id]/route.ts:6`。
- ESLint 把不少该失败的东西设成 warning：`eslint.config.mjs:10` 到 `eslint.config.mjs:16`。项目声称“零 warnings”，但规则级别上是在给自己放水。

### 4. 类型与输入边界：TypeScript 外壳还行，运行时边界偏裸奔

好的一面：
- `tsconfig.json:7` 开启了 `strict`。
- Prisma schema 有基本关系、索引和 cascade：`prisma/schema.prisma:44` 到 `prisma/schema.prisma:82`。

问题：
- `tsconfig.json:5` 开了 `allowJs`，`tsconfig.json:6` 开了 `skipLibCheck`。这在个人项目里常见，但对质量基线来说偏松。
- API 大量直接 `await req.json()` 后解构，没有 schema 校验。例子：`src/app/api/vault/route.ts:6`、`src/app/api/vault/[id]/route.ts:22`、`src/app/api/review/grade/route.ts:17`、`src/app/api/study-time/route.ts:6`。仓库装了 `zod`，但实际业务 API 基本没用；`rg` 结果显示 `z.object` 主要只出现在 `src/symphony/workflow.ts`。
- `src/app/api/vault/route.ts:9` 假设 `tags` 可迭代，`src/app/api/vault/[id]/route.ts:31` 假设 `tags.map` 存在。客户端传坏数据会直接 500。
- 领域状态都用裸字符串：`Track.status`、`ReviewItem.difficulty`、`Track.trackType`、`Track.trackTopic` 分别在 `prisma/schema.prisma:16` 到 `prisma/schema.prisma:19`、`prisma/schema.prisma:60`。没有 enum，数据库层挡不住垃圾值。
- `src/app/api/track/[id]/route.ts:39` 到 `src/app/api/track/[id]/route.ts:45` 虽然做了字段白名单，但没有校验 `status`、`trackType`、`trackTopic` 的合法集合。

结论：会写 TypeScript 类型，但还没真正理解“外部输入必须 runtime validate”。类型系统不是护身符。

### 5. 安全质量：个人本地工具级，公网产品级不合格

主要风险：
- 没有任何鉴权/授权层。13 个 API route 都是开放处理器，典型如 `src/app/api/track/[id]/route.ts:7` 删除 track、`src/app/api/vault/[id]/route.ts:5` 删除 review item、`src/app/api/upload/route.ts:8` 上传文件。若部署到公网，基本等于把数据库和上传目录交给路人玩。
- 上传没有限制文件类型、大小、扩展名和总数量。`src/app/api/upload/route.ts:17` 到 `src/app/api/upload/route.ts:22` 直接把 `file.name` 拼到 UUID 后写入 `public/uploads`。UUID 降低重名风险，但没有解决恶意大文件、非音频文件、奇怪文件名、磁盘打满。
- 文本 HTML 走了自研 sanitizer：`src/lib/sanitize-html.ts:5` 到 `src/lib/sanitize-html.ts:65`。用正则处理 HTML 本身就危险；还允许 `class`、`id`、`href`、`src`、`target`：`src/lib/sanitize-html.ts:54` 到 `src/lib/sanitize-html.ts:57`。虽然去掉了 `javascript:` 和 `data:`，但这种 sanitizer 很难覆盖编码绕过、畸形 HTML 和属性边界。
- 多处 `dangerouslySetInnerHTML` 渲染用户笔记：`src/app/review/ReviewClient.tsx:418` 到 `src/app/review/ReviewClient.tsx:421`、`src/app/vault/VaultListClient.tsx:591` 到 `src/app/vault/VaultListClient.tsx:594`、`src/app/library/NotesList.tsx:42`。安全防线全压在自研 sanitizer 上，过于自信。
- 错误信息有时直接返回内部 message，例如 `src/app/api/upload/route.ts:55` 到 `src/app/api/upload/route.ts:56`、`src/app/api/vault/[id]/route.ts:43` 到 `src/app/api/vault/[id]/route.ts:45`。调试方便，产品化危险。
- `package.json:11` 的 `sync` 脚本硬编码了 root 远程主机地址。虽然不是密钥，但这是运维边界泄露，也容易被误执行。

安全评分低，不是因为代码里一定有现成 exploit，而是因为这个项目根本没有形成安全边界。

### 6. 性能与稳定性：知道优化点，但没有系统治理

好处：
- 音频导出限制了句子数量：`src/app/api/audio/export/route.ts:299` 到 `src/app/api/audio/export/route.ts:304`。
- 音频导出按 batch 处理 segment：`src/app/api/audio/export/route.ts:313` 到 `src/app/api/audio/export/route.ts:334`。
- WaveSurfer 生命周期拆到了 hook，且 cleanup 做了 `destroy`：`src/components/feature/audio-player/useWaveSurfer.ts:121` 到 `src/components/feature/audio-player/useWaveSurfer.ts:134`。

隐患：
- API route 内做重 ffmpeg 任务并同步读写文件，`src/app/api/audio/export/route.ts:306` 到 `src/app/api/audio/export/route.ts:421` 和 `src/app/api/library/export/route.ts:143` 到 `src/app/api/library/export/route.ts:225` 都是长任务。个人使用可以，生产应进 job queue，至少要有并发限制和取消机制。
- `src/app/api/audio/export/route.ts:313` 到 `src/app/api/audio/export/route.ts:334` 每批最多并发 50 个 ffmpeg 进程，500 段时会给机器很大压力。这个 batch size 更像拍脑袋，不像压测出来的值。
- Dashboard 一次拉 2000 条 review log 并在内存聚合：`src/app/dashboard/page.tsx:72` 到 `src/app/dashboard/page.tsx:75`、`src/app/dashboard/page.tsx:114` 到 `src/app/dashboard/page.tsx:196`。数据量上去以后会变慢。
- Vault 列表所有过滤和排序在客户端对 `initialItems` 做：`src/app/vault/VaultListClient.tsx:135` 到 `src/app/vault/VaultListClient.tsx:180`。当前能跑，数据稍多就会卡，而且分页缺失。
- `TimeTrackingProvider` 每 10 秒 POST 一次：`src/contexts/TimeTrackingContext.tsx:45` 到 `src/contexts/TimeTrackingContext.tsx:82`。没有 page visibility、离线处理、失败退避，也没有防止多个 tab 重复记时。

### 7. 测试质量：绿色很多，含金量一般

实际验证结果：
- `npm run test:ci` 通过，31 个测试全绿。
- `npm run build` 通过，说明类型和 Next 构建当前没有阻塞。

但测试策略很弱：
- 多个测试只是读源码正则匹配：`src/app/review/ReviewClient.test.ts:5` 到 `src/app/review/ReviewClient.test.ts:21`、`src/app/vault/VaultListClient.test.ts:5` 到 `src/app/vault/VaultListClient.test.ts:11`、`src/components/feature/RichTextNoteEditor.test.ts:5` 到 `src/components/feature/RichTextNoteEditor.test.ts:8`。
- `src/lib/ci-workflow.test.ts:6` 到 `src/lib/ci-workflow.test.ts:19` 只是验证 CI YAML 里有字符串，不验证 CI 能否在真实环境跑通。
- API 行为测试非常少。只有 `src/app/api/audio/export/route.test.ts:4` 到 `src/app/api/audio/export/route.test.ts:33` 测了一个 query builder，没测上传、删除、复习评分、事务一致性、文件系统清理、异常路径。
- 没有 Playwright/E2E 覆盖 Review 快捷键、Shadowing 录音、WaveSurfer 交互、Vault 播放等核心用户路径。

这类测试的心理安慰价值大于质量保障价值。直白说：很多测试是在测试“代码里有没有某个字符串”，不是测试“用户能不能完成任务”。

### 8. 数据模型与业务一致性：能表达当前需求，但债已经出现

问题集中在状态和时间：
- `Track.status` 是字符串：`prisma/schema.prisma:19`，但状态标签在 `src/app/dashboard/page.tsx:29` 到 `src/app/dashboard/page.tsx:37` 另写一份。新增状态时数据库、UI、业务规则不会一起保护。
- `ReviewItem` 同时有 `due` 和 `nextReview`：`prisma/schema.prisma:67`、`prisma/schema.prisma:70`。评分时两个都写：`src/app/api/review/grade/route.ts:63` 和 `src/app/api/review/grade/route.ts:66`；查询有的用 `due`，有的用 `nextReview`。这两个字段长期并存，迟早出现不一致。
- `ReviewItem` 同时有 `lapses` 和 `lapse`：`prisma/schema.prisma:65`、`prisma/schema.prisma:69`。一个是 FSRS card state，一个是自定义统计，但命名太像，容易误用。
- `Category` / `TrackCategory` 存在：`prisma/schema.prisma:29` 到 `prisma/schema.prisma:42`，但当前 UI 大量使用 `trackType` / `trackTopic` 字符串过滤：`src/app/library/LibraryManager.tsx:29` 到 `src/app/library/LibraryManager.tsx:30`、`src/app/library/LibraryManager.tsx:53` 到 `src/app/library/LibraryManager.tsx:72`。模型已经分叉。

这说明同事能随着需求加字段，但缺少“领域模型收敛”的意识。

### 9. 前端设计与交互质量：可用，但一致性和长期体验一般

正面：
- 有响应式考虑，比如 `src/app/library/page.tsx:37` 到 `src/app/library/page.tsx:70` 处理移动端按钮布局。
- 图标使用较多，符合工具型应用习惯。

问题：
- UI 风格散：有 shadcn/ui primitives，也有大量手写 button/input/select。`src/app/library/LibraryManager.tsx:167` 到 `src/app/library/LibraryManager.tsx:188`、`src/app/vault/VaultListClient.tsx:421` 到 `src/app/vault/VaultListClient.tsx:483` 都是手写状态按钮。
- 页面上有大量硬编码英文/中文混杂，例如 `ReviewClient` 同时出现 `Reviewed`、`In Queue`、`归档`、`笔记`、`Reveal Answer`。这不是国际化，是随手写。
- 交互副作用过重：`src/app/review/ReviewClient.tsx:178` 到 `src/app/review/ReviewClient.tsx:186` 和 `src/app/review/ReviewClient.tsx:307` 到 `src/app/review/ReviewClient.tsx:310` 通过 `window.location.reload()` 刷整页。Next App Router 项目里频繁全页 reload，属于“我懒得处理状态了”的味道。

### 10. AI Coding 痕迹

以下不是单点罪证，但组合起来很像 AI Coding 后人工验收不足：
- 注释像 prompt 产物：`src/components/feature/AudioPlayer.tsx:43` 的“OPTIMIZATION 1”、`src/app/api/audio/export/route.ts:309` 的“process in batches to limit memory”、`src/app/api/track/[id]/route.ts:6` 的“DELETE（保持不变）”。
- 同类代码复制三份：NoteEditor / ReviewNoteEditor / RichTextNoteEditor。
- 测试大量正则扫源码，像是为了锁住某次 bugfix 的文本形状，而不是建立行为安全网。
- API route 边界没有统一 schema，说明功能是一个 endpoint 一个 endpoint 生成出来的，没有统一后端规范。
- `package-lock.json` 和 `pnpm-lock.yaml` 同时存在，且当前工作区同时修改两份 lockfile。包管理边界不清，会给 CI 和协作制造噪音。

## 当前质量分层

### 能保留的部分

- App Router + Prisma + SQLite 对个人本地工具是合理组合。
- WaveSurfer 和 shadowing 相关逻辑已经开始拆 hook，比纯巨型组件好。
- FSRS 选择合理，`ts-fsrs` 包装在 `src/lib/fsrs.ts`，比手写算法靠谱。
- 音频导出路径穿越防护至少做了一层，不是完全裸奔。
- CI 基本链路存在，lint/test/build 能跑。

### 必须优先修的部分

1. 给 API route 引入统一输入 schema，至少用现有 `zod` 校验 upload、vault、review grade、study time、track patch、export body。
2. 把 review 业务规则抽成 domain/service：查询 due items、评分、Again/Hard relearning、统计都应该集中。
3. 合并三套富文本编辑器，明确存储格式和 sanitizer 策略。最好使用成熟 sanitizer，例如 DOMPurify/isomorphic-dompurify，而不是正则手搓。
4. 拆 `VaultListClient.tsx` 和 `ReviewClient.tsx`，把 audio playback、filter/sort、queue mutation、toolbar/list item 抽出来。
5. 给上传和导出加边界：文件类型、文件大小、批量数量、ffmpeg 并发、超时、失败清理。
6. 把字符串状态改成 enum 或集中常量，并收敛 `due`/`nextReview`、`lapse`/`lapses` 这类重复字段。
7. 测试从“源码正则检查”升级为行为测试：API route 单测、Prisma 集成测试、核心页面 E2E。

## 最终评价

这位同事的强项是“让 AI 快速把功能搭起来”，弱项是“知道什么时候该停下来重构和设边界”。他能产出 demo、个人工具和内部原型；但如果让他独立负责一个长期维护的前端/全栈项目，需要更强的 code ownership 训练。

当前代码的最大问题不是某个 bug，而是工程纪律不足：边界不稳、重复实现、运行时校验缺失、测试含金量低。短期继续堆功能会很爽，三个月后维护者会开始骂人；半年后大概率没人敢改 review/音频相关逻辑。

如果按团队标准评估：**可作为原型基线，不应作为生产质量基线**。
