# Product Requirements Document (PRD): DeepListener

**Version:** 4.4 (Updated 2026-07-22)
**Status:** This document is aligned to the current codebase implementation, not an aspirational roadmap.
**Tech Stack:** Next.js App Router, React 19, Prisma + SQLite, Tailwind CSS, WaveSurfer.js, FFmpeg, Deepgram/OpenAI/Gemini, Symphony tooling

## 1. 产品定位 (Product Positioning)

DeepListener 是一个面向高阶英语学习者的听力训练与复习系统。它不是课程管理工具或泛化播放器，而是围绕“句子级精听”和“复盘闭环”设计的训练台。音频和本地视频只是媒体载体，核心目标是让用户把听不懂的材料拆成可诊断、可跟读、可复习、可统计的最小单元。

当前代码中的训练闭环是：

**导入本地音频/视频 -> 获取字幕或自动转录切句 -> 精听/盲听 -> 诊断并加入 Vault -> Shadowing 跟读 -> SRS 复习 -> Dashboard 复盘**

## 2. 当前已实现的产品目标

- 让用户以句子为单位浏览和控制音频，而不是只按整段材料播放。
- 在“没听懂”的瞬间完成归因记录，而不是事后补笔记。
- 把难句沉淀到 Vault，并进入可操作的 SRS 复习流。
- 把听、跟读、复习时间记录成可量化的数据，用 dashboard 做回看。
- 让长时间训练界面支持系统跟随的浅色 / 深色主题，降低夜间使用负担。
- 为开发侧提供 Symphony 自动化任务协调能力。

## 3. 当前已实现模块 (Implemented Modules)

### 模块 A: 媒体导入与转录 (Media Import + Transcription)

当前实现入口：

- `POST /api/upload`: 单文件上传
- `PUT /api/upload`: 批量上传

当前行为：

- 接受非空音频，以及本地 MP4/WebM 视频；音频上限 250 MB，视频上限 1 GB
- 文件名会被清洗并加 UUID 前缀，避免上传路径逃逸
- 音频与视频派生音轨保存到 `public/uploads/`；原视频保存到 `public/videos/`
- 视频通过 FFmpeg 提取 MP3 音轨。若存在可解析的内嵌字幕则优先使用，否则对派生音轨调用转录 provider
- 自动创建 `Track` 和其下的 `Sentence` 记录
- 句子按转录顺序写入 `orderIndex`
- 工具不采集 Course、Module 或 Lesson 等领域字段；一个导入文件就是一个 Track，不自动拆分
- Track 笔记和 Vault 笔记保持通用，不区分课程笔记

当前 provider 选择逻辑：

- 由 `TRANSCRIPTION_PROVIDER` 决定，支持 `openai` / `google` / `deepgram`
- 如果没有设置环境变量，代码默认使用 `deepgram`（单词级时间戳更稳，通常无需代理）
- `undici` 的全局 dispatcher 会根据 `HTTPS_PROXY` / `https_proxy` 处理代理场景

说明：

- 默认值曾在历史版本中在文档与代码之间漂移过；当前事实来源是 `src/lib/transcription/factory.ts`，未设置 `TRANSCRIPTION_PROVIDER` 时默认 `deepgram`，不匹配值时 fallback 到 `openai`。

### 模块 B: 媒体精听台 (Practice Workbench)

当前实现入口：

- `/practice/[id]`
- 由 `PracticeClient` + `AudioPlayer` 组成核心交互

当前已实现能力：

- WaveSurfer 波形播放
- 视频 Track 在波形上方显示视频；视频元素是播放主时钟，波形和字幕共用同一时间轴
- 视频下方可手动开启当前句字幕条；默认关闭、不记忆开关状态，并在无对应句子的时间间隙显示空白
- 句子列表与播放时间同步
- 点击句子跳转并播放
- 文本盲听模式：全局模糊句子，点击单句揭晓
- 波形圈选区域后即时播放
- 播放速率调节
- 句子已加入 Vault 时在列表中高亮显示
- 句子级入口直接拉起 Shadowing
- Track 级富文本笔记编辑
- Track 重命名
- 导出当前 Track 下所有已摘录句子的拼接音频

当前交互实现：

- 空格控制播放/暂停
- 鼠标滚轮调整缩放
- 右键拖拽平移波形
- 自动滚动句子列表到当前句
- 支持一个轻量调试模式切换

### 模块 C: 诊断录入与 Vault Capture

当前实现入口：

- Practice 页中的 `DiagnosisModal`
- `POST /api/vault`

当前已实现能力：

- 对句子打错误归因标签
- 记录富文本笔记
- 记录用户主观难度：`NORMAL` / `HARD` / `VERY_HARD`
- 已存在的 `ReviewItem` 会被 `upsert` 更新，而不是重复创建
- 新句子默认建议 `Vocab` 标签

当前错误标签集合：

- `Linking`
- `Vocab`
- `Misheard`
- `Comprehension`
- `Speed`
- `Grammar`
- `Accent`

### 模块 D: Shadowing 工作台

当前实现入口：

- Practice 页顶部 “Shadowing” 按钮
- 句子列表中的单句麦克风入口

当前已实现能力：

- 全屏覆盖式 Shadowing 界面
- 预加载整条音频并解码为 `AudioBuffer`
- 在内存中按句子切片，避免切句时重新解码
- 原音波形与用户录音波形双轨对比
- 流程模式：`idle` / `playing_original` / `recording` / `reviewing`
- 支持 `Start Flow`
- 支持 `Rec Again`
- 支持原音单句循环
- 支持前后句切换
- 支持在 Shadowing 中继续 Capture 到 Vault
- 支持跟读时的盲听文本显示/揭晓
- 支持对句子文本直接编辑
- 支持句子格式标注与自动保存

当前快捷键：

- `Space`: 开始或停止当前流程
- `R`: 重播原音
- `ArrowLeft` / `ArrowRight`: 上一句 / 下一句
- `T`: 切换 stress 工具
- `C`: 复制句子文本
- `N`: 打开诊断入口
- `Escape`: 退出 Shadowing

说明：

- Vault、Review、Shadowing 和导出继续使用 `audioUrl`，视频只在 Practice 工作台显示。
- 原视频不进入现有远程同步；数据库、笔记和 `public/uploads/` 下的派生音轨维持现有同步边界。

- 旧版 PRD 把工作流概括成 “Play Original -> Auto Record -> Auto Replay Recording”，这已经过于简化。当前代码里还包含循环、重录、文本隐藏、句子导航、文本编辑和格式标注。

### 模块 E: Vault 管理

当前实现入口：

- `/vault`
- `VaultPageClient`
- `VaultListClient`
- `EditVaultModal`
- `POST /api/vault/export`
- `POST /api/audio/export`

当前已实现能力：

- 展示全部摘录句子
- 支持仅查看某个 Track 的摘录（`/vault?trackId=...`）
- 搜索句子正文、笔记和 Track 标题
- 按难度、标签过滤
- 按创建时间、到期时间、稳定度、FSRS difficulty 排序
- 归档 / 取消归档单条 Vault 项
- 删除 Vault 项
- 单句播放
- 按当前筛选结果连续播放
- 编辑错误标签、主观难度、个人笔记
- 导出筛选后的音频拼接结果
- 导出筛选后的纯文本笔记结果

导出筛选当前支持：

- difficulty
- trackIds
- dateFrom
- dateTo

说明：

- 旧版 PRD 只写了 “列表展示与搜索、支持编辑笔记、删除条目”，明显低估了当前 Vault 的管理能力。

### 模块 F: SRS 复习 (Review)

当前实现入口：

- `/review`
- `POST /api/review/grade`

当前已实现能力：

- 取出待复习句子进行单卡片复习
- 复习卡自动播放句子音频
- 可显示/隐藏答案
- 支持卡片内编辑 Vault 信息
- 支持从复习流直接归档
- 支持导出当前到期句子的音频
- 显示播放统计信息

评分体系：

- `again`
- `hard`
- `good`
- `easy`

调度逻辑：

- 基础调度由 FSRS 计算
- `again` 会被强制覆盖为 5 分钟后复习
- `hard` 会被强制覆盖为 15 分钟后复习
- 同时写入 `ReviewLog`

当前快捷键：

- `Space`: 显示/隐藏答案
- `R`: 重播音频
- `1` / `2` / `3` / `4`: Again / Hard / Good / Easy

### 模块 G: Library 管理

当前实现入口：

- `/library`
- `LibraryManager`
- `TrackList`
- `NotesList`

当前已实现能力：

- Active / Archived 视图切换
- 单文件上传
- 批量上传
- Track 状态切换
- Track 重命名
- Track 归档与永久删除
- 查看某条 Track 对应的 Vault 笔记
- 以 Track 或 Notes 视图浏览素材
- 按 `trackType` / `trackTopic` 过滤
- 按上传日期过滤
- 多选 Track
- 对多选 Track 连续批量播放
- 导出当前筛选结果或选中 Track 的整轨拼接音频

当前 Track 状态：

- `UNLEARNT`
- `INTENSIVE`
- `ANALYSIS`
- `SHADOWING`
- `SPEED_SHADOWING`
- `PARAPHRASE`
- `LEARNT`

### 模块 H: Dashboard 与学习统计

当前实现入口：

- `/dashboard`
- `/api/study-time`
- `TimeTrackingProvider`

当前已实现能力：

- TOEFL 倒计时（从 `NEXT_PUBLIC_TARGET_DATE` 读取，默认 `2026-05-16`）
- 已学习 Track 进度
- 总学习小时数
- Total Tracks / Vault Sentences
- Stability 分布
- 14 天 Retention 趋势
- Overdue Backlog
- 学习活动热力图
- 内容掌握雷达图
- 错误标签分布
- Daily Study Log

时间统计实现：

- 前端 Context 在 `LISTENING` / `SHADOWING` / `REVIEW` 模式下启动 heartbeat
- 每 10 秒上报一次
- 判定条件为：有音频播放或最近 60 秒内有用户交互
- 后端按 `date + type` 聚合到 `StudySession`

说明：

- 旧版 PRD 完全没有覆盖 dashboard 和 study-time 统计模块，这已经与当前实现严重不一致。

### 模块 I: 全局主题与界面外观

当前实现入口：

- `src/components/theme/ThemeProvider.tsx`
- `src/components/theme/ThemeToggle.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`

当前已实现能力：

- 默认跟随操作系统浅色 / 深色偏好
- 右上角导航栏提供图标按钮，在白天和黑夜风格之间手动切换
- 用户手动选择会在刷新后保持
- 顶层布局、主页面背景、卡片、弹窗、按钮、表单、图表 tooltip、富文本和常见旧版浅色 utility 在暗色下保持可读
- 暗色模式覆盖 Library、Vault、Dashboard、Review、Practice、AudioPlayer、Shadowing、笔记编辑器和常用弹窗

说明：

- 当前白色风格就是既有界面默认风格；暗色风格通过主题变量和兼容桥补齐，不改变训练流程或数据行为。

### 模块 J: Symphony 开发协调器

当前实现入口：

- `bin/setup`
- `bin/symphony`
- `WORKFLOW.md`
- `src/symphony/*`
- `/dashboard/symphony`
- `/api/symphony/state`

当前已实现能力：

- 本地 Symphony runner / orchestrator 框架
- 基于 workflow 配置组织 tracker、workspace、agent 执行逻辑
- 读取本地 `.symphony_state.json` 展示运行状态
- Dashboard 中查看在线状态、活跃 agent 数量和 workspace

说明：

- 这部分是项目内置的开发运维能力，不属于最终学习者的主训练流，但已经是代码库中的正式模块，PRD 应该记录。

### 模块 K: 产品介绍与环境诊断

当前实现入口：

- `/`
- `/setup`
- `src/lib/setup-readiness.ts`

当前已实现能力：

- 根路径说明句子级学习闭环、本地优先边界和首次使用入口
- `/setup` 只读检查 Node.js、SQLite 初始化状态、媒体目录、FFmpeg、转录 provider 配置和网络暴露风险
- 检查结果只显示配置是否存在，不显示凭证值
- 环境诊断不会修改 `.env`、初始化数据库、联系转录 provider 或迁移用户数据

说明：

- 这是当前浏览器/Server 版本的上手引导；计划中的桌面首次运行向导属于目标态，不应被误写成已实现能力。

## 4. 当前实现的数据模型 (Implemented Data Model)

下面是当前代码实际使用的数据模型摘要，不再使用旧版过于简化的伪 schema。

### `Track`

- `id`
- `title`
- `audioUrl`
- `transcription`
- `note`
- `trackType`
- `trackTopic`
- `isArchived`
- `status`
- `createdAt`
- `sentences`
- `categories`

### `Sentence`

- `id`
- `trackId`
- `text`
- `startTime`
- `endTime`
- `orderIndex`
- `formatting`
- `reviewItem`

### `ReviewItem`

- `id`
- `sentenceId`
- `difficulty`
- `stability`
- `dr`
- `state`
- `reps`
- `lapses`
- `lastReview`
- `due`
- `retrieval`
- `lapse`
- `nextReview`
- `isArchived`
- `userNote`
- `createdAt`
- `tags`
- `logs`

说明：

- `difficulty` 是用户标注的主观难度。
- `dr` 是 FSRS 过程中的 difficulty 数值，不等同于用户标签。

### `ReviewLog`

- 存储复习评分记录
- 当前至少记录 `rating`、`reviewType`、`duration`、`createdAt`

### `StudySession`

- `date`
- `type`
- `duration`
- 用于 dashboard 学习时长和活跃热力图统计

### `ErrorTag`

- 与 `ReviewItem` 多对多关联
- 支撑错误归因标签、dashboard 标签统计、笔记导出分组

### `Category` / `TrackCategory`

- schema 已实现
- 当前主界面主要使用 `trackType` 和 `trackTopic`，而不是完整的 Category UI

## 5. 技术实现约束与解决方案

- **代理支持**：Google / OpenAI 场景通过 `undici` 全局 dispatcher 兼容代理环境。
- **API 输入校验**：核心 JSON route 通过 `src/lib/api-schemas.ts` 中的 Zod schema 校验输入，并使用共享 response helper 返回错误。
- **上传安全性**：`src/lib/upload-policy.ts` 限制音频类型、250 MB 大小上限、清洗文件名，并保证写入路径位于 `public/uploads/`。
- **低延迟 Shadowing**：先解码整轨音频，再按句子切 `AudioBuffer`。
- **波形交互**：通过自定义 hook 统一键盘、滚轮、右键拖拽和平移逻辑。
- **导出安全性**：导出路由对 `audioUrl` 做 path traversal 校验；如果被选中的源音频缺失或非法，返回错误而不是静默生成不完整文件。
- **时间统计**：只在真实活跃或音频播放时累计学习时间，避免纯挂机污染统计。
- **主题系统**：使用 `next-themes` 的 class 模式，默认跟随系统偏好；页面和组件优先使用 semantic token，避免新增硬编码浅色背景。
- **React 19 兼容性**：当前关键交互模块已按最新 lint 规则整理，避免 effect 中同步级联 setState 和不稳定依赖。

## 6. 与旧版 PRD 的主要偏差

旧版文档和当前代码不一致的关键点如下：

- 把 Vault 写得过于简单，遗漏过滤、排序、导出、归档、连续播放
- 没写 Review 页面和 FSRS 调度覆盖逻辑
- 没写 Dashboard、StudySession、ErrorTag、ReviewLog
- 没写 Library 的多选和批量播放能力
- 把数据库设计写成过时的极简示意
- 把 Deepgram 写成固定默认，而当前代码是环境变量驱动、默认回退 OpenAI
- 完全遗漏全局主题系统和黑夜模式
- 完全遗漏 Symphony 模块
- 完全遗漏产品介绍页和只读环境诊断页

## 7. 桌面发行状态

DeepListener 已实现 Electron 桌面壳层、standalone 服务打包、loopback 认证和 OS data root。当前可确认的打包范围是 macOS Apple Silicon 内部 alpha；当前源码尚未发布对应的新 DMG。Windows 用户继续使用受支持的 Server 源码版本。

- 技术路线：保留现有 Next.js + Prisma 业务核心，以 Electron 提供桌面壳层和本机生命周期管理。
- 当前平台：macOS Apple Silicon（arm64）未签名内部 alpha；Windows 尚无打包客户端。
- 剩余发布门槛：可再分发 FFmpeg/ffprobe、签名与公证、当前源码对应的干净安装验证、自动更新，以及 Windows x64 安装器与验收。
- 兼容边界：浏览器/Server 版本继续存在，不能因为桌面化而失去现有开发和自托管能力。
- 数据边界：数据库、媒体和备份迁移必须显式、可预览、copy-first、可回滚；卸载或升级不能静默删除学习数据。
- AI 边界：首个桌面版本不为追逐标签新增泛化聊天功能，优先消除安装、配置、导入和恢复摩擦；AI 学习能力需另立需求并验证学习价值。

目标态的完整需求、设计与执行拆分见：

- [桌面客户端 PRD](./desktop-client-prd.md)
- [OpenSpec proposal](../openspec/changes/desktop-first-distribution/proposal.md)
- [OpenSpec design](../openspec/changes/desktop-first-distribution/design.md)
- [OpenSpec tasks](../openspec/changes/desktop-first-distribution/tasks.md)

---

*Last Updated: 2026-07-22*
