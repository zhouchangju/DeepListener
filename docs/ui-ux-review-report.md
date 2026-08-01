# DeepListener UI/UX 设计评审报告

> **实施状态（2026-02-14）**：Top 5 已全部落地——#1 暗色隐形文字（15 处修复）、#2 完成时刻（复习完成卡 + 跟读会话小结）、#3 Streak 全局导航徽标（新增 /api/streak + NavStreak）、#4 主播放器快捷键（←/→、L、S + 快捷键面板更新）、#5 复习/录音组件暗色样式（token 化）。详见 `docs/ui-upgrade-changelog.md`。
>
> 评审范围：`src/app` 全部路由、`src/components/ui`、`src/components/feature`（重点 AudioPlayer / ShadowingConsole / Review / Dashboard / Library / Vault）、`globals.css`、根布局与 AppShell。
> 评审标准：对标 Duolingo（粘性/游戏化）、Linear/Things（交互质感）、Anki（复习效率）的一流消费级体验。
> 所有结论均基于实际代码，证据以 `文件:行` 标注。

---

## 一页结论

**总体评价**：DeepListener 已经具备一个"好用的工具"的骨架——波形 + 逐句联动的播放器、沉浸式全屏跟读控制台、FSRS 复习卡片、键盘快捷键、暗色模式 token 体系都在。但它目前是一个**"功能完成的产品"，而不是"让人爱不释手的产品"**：核心练习链路缺乏即时奖励与情绪反馈，完成一次跟读/复习没有任何庆祝或进度感；暗色模式存在系统性的文字不可见 bug；主播放器快捷键覆盖不足；移动端波形交互基本不可用。工程底子好（memo 优化、自动滚动、骨架屏都有），缺的主要是"最后一公里"的体验打磨。

**Top 5 最值得做的改进（高价值 quick wins 优先）**

1. **修复暗色模式系统性文字不可见 bug** — `dark:text-primary/25` / `text-primary/15` 等写法遍布 6 个文件，深色下多处标题/徽标/副文案接近隐形（成本：小）。
2. **给核心闭环加"完成时刻"** — 跟读练完一句、复习队列清空时目前毫无反馈；加即时庆祝动效 + 会话小结（练了几句、用时、连续天数）（成本：中）。
3. **把连续打卡（Streak）从 dashboard 深处提到全局导航** — streak 计算已存在但埋在三 Tab 之后，用户日常练习完全感知不到（成本：小）。
4. **补齐主播放器键盘操作** — 目前只有 Space 播放/暂停；逐句精听场景缺 ←/→ 逐句跳转、L 循环、S 跟读、B 收藏，而这些在 ShadowingConsole 里已经实现过，模式可复用（成本：小）。
5. **修复复习评分按钮与录音指示器的暗色样式** — `bg-red-50`/`border-red-200` 等硬编码浅色写在 ReviewCard 评分四键和录音组件上，暗色下视觉断裂（成本：小）。

**"爱不释手"的差距在哪**：产品目前奖励的是"任务的完成"，而 Duolingo 式产品奖励的是"行为的本身"。用户在 DeepListener 里每做一个正确动作（听清一句、跟读一遍、评一张卡）都得不到任何正向情绪反馈；进度只在 dashboard 里被动可查，而不是在练习现场主动呈现。粘性差距 = 反馈密度差距。

---

## 当前 UI 优点清单（值得保留强化）

1. **波形 + 逐句双向联动的精听播放器是核心资产**。`AudioPlayer.tsx:107-126` 的 `syncListToTime` 把时间、列表高亮、自动滚动绑定在一起，并做了三处明确的性能优化（稳定数组 `AudioPlayer.tsx:59-67`、滚动节流 `useAutoScroll.ts`、DOM 直写时间码 `AudioPlayer.tsx:151-153`），这是专业级精听工具的正确架构。
2. **ShadowingConsole 的沉浸式设计方向正确**：全屏遮罩 `presentation.ts:40`（`fixed inset-0 z-50 bg-slate-950/95`）把跟读变成"进入另一个空间"，且有完整的键盘流（Space 开始/停止、R 重听、←/→ 切句、N 收藏，`useShadowingKeyboard.ts:68-113`）。
3. **盲听模式（Blind Mode）有真实的教学思考**：`blur-sm select-none` + 点击揭示（`ShadowingConsole.tsx:266-274`、`SentenceList.tsx:94-96`），比单纯隐藏文本更优雅。
4. **复习卡片的信息分层干净**：`ReviewCard.tsx` 播放按钮居中、答案折叠、底部 1-4 评分键带数字快捷键提示，Anki 用户零学习成本。
5. **复习页有快捷键帮助浮层**（`ReviewCard.tsx:52-71`），是全产品里唯一一处快捷键可发现性设计，值得推广到其他页面。
6. **空状态有文案和引导**（`TrackList.tsx:149-162`，图标 + 说明 + 跳转 setup 的 CTA），不是一句"No data"。
7. **加载骨架屏覆盖主要路由**（`library/loading.tsx`、`practice/[id]/loading.tsx`、`review/loading.tsx`、`dashboard/loading.tsx`），且形状贴近真实布局。
8. **设计 token 体系规范**：`globals.css:48-121` 用 oklch 定义了完整的亮/暗双套色板，主色 indigo 有品牌注释，chart 色与业务状态色对齐，具备做高级视觉的基础。
9. **触屏兜底意识存在**：TrackCard 的更多菜单在触屏常显（`TrackList.tsx:246` 注释明确说明了修复动机）、句子行在移动端展开为整行按钮（`SentenceList.tsx:118-152`）。
10. **i18n、PWA、时间追踪（TimeTrackingContext）已就位**，为后续粘性设计（时长目标、日报）打好了数据地基。

---

## 分维度详评

### 1. 视觉设计

**配色与品牌**：indigo 主色 + oklch token 是合格的现代方案。但存在**系统性暗色 bug**：多处文案使用 `text-primary/15`、`dark:text-primary/25` 这类"主色 + 极低透明度"写法，在这些元素所处的背景上几乎不可见：

- `src/app/page.tsx:26`：Hero 徽标 `dark:text-primary/25` —— 暗色下品牌徽标文字隐形。
- `src/app/page.tsx:122`：底部 CTA 区（`bg-primary`）副文案 `text-primary/25` —— 主色 25% 透明度叠在主色背景上，完全看不见。
- `src/app/dashboard/sections/OverviewSection.tsx:38,44,46`：倒计时渐变卡（`from-primary to-purple-600`）上的标题与日期用 `text-primary/15`/`text-primary/25`，白卡上的深色文字被写成主色浅影，暗色下标题消失。
- `src/app/library/TrackList.tsx:223`、`src/app/vault/VaultListClient.tsx`、`src/app/setup/page.tsx`、`src/app/practice/[id]/PracticeClient.tsx:202` 同模式，共 12 处。推测是某次批量替换 `text-primary/xx` 时误伤（本意应是 `text-white/70` 或 `text-primary-foreground/xx`）。

**硬编码浅色、无暗色变体**：

- `ReviewCard.tsx:116-145`：评分四键 `border-red-200 hover:bg-red-50 text-red-600` 等全部是浅色硬编码，暗色下边框/底色对比错乱；"good" 键 `bg-green-600` 不受 token 管理。
- `ShadowingVisualization.tsx:68`：录音中提示 `bg-red-50 border-red-100`，暗色下是一块刺眼的浅红块。
- `ShadowingControls.tsx:48`："重录"按钮 `bg-red-50 text-red-600 border-red-200` 同样无暗色变体。
- `DashboardPage` 的日誌条目 `bg-amber-50 text-amber-600`（`dashboard/page.tsx:132`）。

**排版层级**：页面级（`text-2xl/3xl font-bold`）→ 卡片级 → 辅助级的层级基本清晰；landing 页（`page.tsx:29`）用了 `tracking-[-0.035em]` 的紧排大标题，质感不错。但练习页内层级偏平：`PracticeClient.tsx:184` 的轨道标题只有 `text-xl`，且与"导出音频/开始跟读/盲听"三个平级按钮挤在一行，视觉焦点分散——**核心 CTA"开始跟读"用 `variant="secondary"` 自定义色而非 primary，优先级被"导出音频"稀释**。

**间距节奏**：`container mx-auto py-8 px-4` 在各页重复手写，无统一 page-shell 组件；练习卡片内部（`AudioPlayer.tsx:242` 起的 rounded-2xl + shadow-xl）质量明显高于外围页面，形成"卡片精装、页面毛坯"的割裂感。

### 2. 信息架构与导航

- 顶部导航（`AppShell.tsx:45-49`）顺序为 Library / Setup / Vault / Analytics / Review。**问题**：核心路径"选材料→练习→复习"中，"练习"没有入口（必须从 Library 卡片进入），而 Setup 是低频配置页却占据第二顺位；Review 是每日高频动作却排最后，且**没有显示"今日待复习数量"徽标**——这是 Duolingo/Anki 拉留存的核心钩子（一个数字红点）。
- 导航无当前页高亮（`AppShell.tsx:45-49` 所有 Link 样式一致，无 `usePathname` 判断），用户在哪个模块完全无感知。
- `main` 背景 `bg-muted/30`（`AppShell.tsx:64`）与各页卡片白色形成层次，OK；但 landing 页（`/`）与登录后首页不分——老用户每次回站都落在营销页，**没有"继续上次练习"的快捷恢复入口**。对比 Duolingo：打开即"继续第 3 课"。
- Library 的归档/批量模式用 URL query 切换（`library/page.tsx:32-34`）可分享可后退，是好设计。

### 3. 核心练习体验

**播放器**：

- 波形缩放用滚轮（`useAudioInteractions.ts:47-65`，deltaY × 1.15/0.85 系数，范围 10–800），桌面体验专业；但**移动端没有 pinch 缩放也没有缩放 UI 按钮**，波形在手机上只能以默认 25px/s 看。
- 键盘只有 Space（`useAudioInteractions.ts:27-43`）。精听场景最高频的"上一句/下一句"没有键；ShadowingConsole 里的 ←/→ 模式没有回移到主播放器。空格处理对对话框的避让（`useAudioInteractions.ts:31-35` 注释）做得很细，说明团队有快捷键意识，只是覆盖不全。
- Region 循环：拖动波形创建循环区 + `Loop` 按钮（`PlayerControls.tsx:58-68`）是专业功能，但**没有任何 UI 告诉用户"拖波形可以圈选循环"**——这是零可发现性的隐藏功能。清除按钮文案硬编码英文 "Clear"（`PlayerControls.tsx:75`），未走 i18n；"Position" 标签同样硬编码（`PlayerControls.tsx:45`）。
- 逐句点击即播（`AudioPlayer.tsx:218-230`）+ 已收藏句的琥珀色标记（`SentenceList.tsx:77-78`）形成"听力地图"的雏形，很好；但句子行没有显示该句时长/难度，用户无法快速定位"长难句"。

**ShadowingConsole**：

- 流程状态机（idle → playing_original → recording → reviewing）清晰，原声/录音双波形对比（`ShadowingVisualization.tsx:41-93`，灰波原声 + 红波录音）是这个产品最有"哇感"的时刻。
- **断点 1：练完一句没有完成反馈**。到最后一页"下一句"按钮只是 disabled（`ShadowingConsole.tsx:328`），整轨练完没有任何总结或庆祝。
- **断点 2：录音没有自动评估**。录完只给回放对比，用户需要自己判断"像不像"。哪怕一个简单的"时长匹配度/完成度"提示也能极大增加反馈密度（可作为潜在价值项）。
- **断点 3：进入门槛**。`PracticeClient.tsx:200-208` 要求等整轨音频 decode 完才能点开始（按钮转圈），长音频首等可能数秒且期间无进度提示；失败有 toast + 重试（`PracticeClient.tsx:104-114`，带修复注释），已属补救良好，但 preload 无进度条。
- Dictation 模式（`DictationPanel.tsx`）与跟读同屏切换是亮点，拼写对比 `compareDictationAnswer`（`dictation.ts`）给了即时判分——这是全产品反馈密度最高的地方，证明团队会做即时反馈，只是没推广开。

### 4. 反馈与动效

- **Toast（sonner）是全产品唯一反馈通道**，且用得克制正确（成功/失败/带 action 重试）。但 toast 是"事务性"反馈，不承担"情绪性"反馈——没有一处庆祝动效（grep 全 src 无 confetti/celebrate，仅 dashboard 有 streak 数字）。
- 动效库 `tailwindcss-animate`/`tw-animate-css` 已装，实际使用很少：`ShadowingConsole.tsx:257` 的 `animate-in fade-in zoom-in-95`、`ReviewCard.tsx:79` 的答案揭示、`ShadowingVisualization.tsx:83` 的录音波形入场。页面间过渡为零；卡片 hover 只有 `hover:shadow-md transition-shadow`（`TrackList.tsx:173`），无 scale/translate 微交互。距 Linear 级"每个点击都有 150ms 内的物理反馈"差距明显。
- 按钮 loading 态覆盖良好（导出转圈 `PracticeClient.tsx:197`、逐卡 loadingId 集合 `TrackList.tsx:60-78` 防止单卡操作锁死整页，注释里记录了这次修复）。
- **空状态不均衡**：Library 空态很好（`TrackList.tsx:149-162`）；Review 空态只有一行灰字（`ReviewClient.tsx:284-290`）——而"今日复习完成"恰恰是应该放庆祝和 streak +1 的黄金位置。
- `error.tsx` / `global-error.tsx` / `not-found.tsx` 存在（`src/app/` 根），有兜底意识。

### 5. 粘性 / 留存设计（当前最薄弱维度）

- **Streak 已计算但无处可见**：`BehaviorCharts.tsx:72-109` 计算了 currentStreak/maxStreak，展示在 dashboard 的 Behavior tab（`BehaviorCharts.tsx:200-206`）——用户要每天主动点开 dashboard 第三个 tab 才能看到。没有导航徽标、没有练习结束时的"+1 天"、没有"再练 5 分钟保住连续记录"的挽回提示。
- **无目标与进度感**：练习页没有任何"本轨进度"（如 12/48 句已跟读、3 句已收藏）；ShadowingConsole 头部有 `currentIndex/totalCount`（`ShadowingHeader`），但仅是数字，无进度条可视化。
- **无即时奖励**：收藏一句（capture）只是 toast；评一张卡只是 toast。全产品无音效、无震动、无动效奖励。
- **倒计时组件方向对但静态**：`OverviewSection.tsx:36-48` 的考试倒计时卡有视觉野心（渐变卡），但它是唯一一张"情绪化"卡片，且因前述 `text-primary/15` bug 文字不可见。
- TimeTrackingContext 已在记录 LISTENING/SHADOWING/REVIEW 时长（`PracticeClient.tsx:69-72`、`ReviewClient.tsx:113-116`），**数据都在，缺的是把数据变成用户可见的成就感**。

### 6. 可访问性

- 好的方面：TrackCard 用 `role="link" tabIndex={0}` + Enter/Space 键处理（`TrackList.tsx:181-190`）；播放键有 `aria-label`（`PlayerControls.tsx:37`）；选择框用 `role="checkbox" aria-checked`（`TrackList.tsx:197-199`）；GuideTrigger 有 `sr-only` 文案（`AppShell.tsx:57`）。
- 问题：
  - **焦点管理**：ShadowingConsole 打开时 `containerRef.current.focus()`（`ShadowingConsole.tsx:105-107`）做了焦点移入，但**关闭后焦点不归还**到触发按钮；也无焦点陷阱，Tab 会穿出遮罩到背景页面。
  - **对比度**：前述 `text-primary/15|25` 系列在亮色下也常低于 WCAG AA 4.5:1；`text-muted-foreground` 小字（`SentenceList.tsx:99` 句序号 10px）在 `bg-muted` 上对比偏弱。
  - 键盘可达性断裂：主播放器波形区不可键盘聚焦/操作（缩放、seek 均无键）；ReviewCard 帮助浮层只能鼠标点击问号触发（`ReviewCard.tsx:44-51`），无键盘焦点态。
  - 盲听模糊文本用 `blur-sm select-none`（`SentenceList.tsx:95`），屏幕阅读器仍会读出文本——需要 `aria-hidden` + 单独的可访问揭示按钮。

### 7. 移动端 / 响应式

- 句子行的移动端适配是全产品响应式做得最用心的地方（`SentenceList.tsx:118-152`，操作键在 `sm:hidden` 下展开为整行三键）。
- 导航在移动端可横向滚动（`AppShell.tsx:44` `no-scrollbar overflow-x-auto`）——能用，但 5 个主模块 + 3 个控件挤在顶栏，无底部 tab bar；移动端"开始跟读"与"导出音频"等宽排列（`PracticeClient.tsx:190-218`），CTA 不突出。
- 波形区无触摸手势（缩放任一、seek 靠点按）：`useAudioInteractions.ts` 只有 wheel 和右键平移。`max-h-[450px]` 的句子列表（`SentenceList.tsx:233`）在竖屏手机上与波形 + 视频同屏时可视句子不足 4 条。
- 复习页右下角固定导出按钮（`ReviewClient.tsx:373-381` `fixed bottom-6 right-6`）在移动端会遮挡评分键区域的风险（z-50 浮于卡片之上）。

### 8. 性能感知

- 做得好的：三处播放器性能优化有注释记录（`AudioPlayer.tsx:57-67, 96`）；时间码绕过 React 直写 DOM（`AudioPlayer.tsx:151-153`）；SentenceItem memo（`SentenceList.tsx:37`）；视频轨道用预解码 peaks 直接渲染波形（`AudioPlayer.tsx:69-75`）；路由级骨架屏齐全。
- 缺口：**无乐观更新**。复习评分要等 POST 返回才切下一张（`ReviewClient.tsx:135-185`，有重入锁 `gradingRef`）——网络慢时高频连点被静默丢弃（锁直接 return，无排队无提示）；Library 归档/改状态也是等响应后 `router.refresh()` 整页刷新（`TrackList.tsx:101,120`），卡片有闪动感。收藏（capture）同样无乐观标记。
- Shadowing 入口的整轨 decode 等待无进度（见 §3 断点 3）。

---

## 分级改进机会总表

| # | 需求 | 等级 | 问题（证据） | 建议 | 用户收益 | 成本 |
|---|------|------|------------|------|---------|------|
| 1 | 修复暗色文字不可见 | **高** | `page.tsx:26,122`、`OverviewSection.tsx:38,44,46` 等 6 文件 12 处 `text-primary/15`、`dark:text-primary/25` | 逐处改为正确语义色（`text-white/80`、`text-primary-foreground/80`、`dark:text-primary`）；加一条 lint/评审规则防复发 | 暗色用户从"多处看不见字"到可用；品牌第一印象修复 | 小 |
| 2 | 练习/复习完成时刻 | **高** | `ShadowingConsole.tsx:328` 末句仅 disabled；`ReviewClient.tsx:284-290` 完成只显示一行灰字 | 跟读整轨完成 → 庆祝动效 + 小结卡（句数/用时/streak）；复习队列清空 → "今日完成"页 + streak +1 + 明日预告 | 每次闭环都有多巴胺，日活留存核心 | 中 |
| 3 | Streak 全局化 | **高** | streak 仅在 `BehaviorCharts.tsx:200-206` 第三 tab | 导航栏加 🔥 streak 徽标（AppShell.tsx），点击跳 dashboard；练习页结束时同步展示 | 每日打开理由（loss aversion），Duolingo 验证过的最强钩子 | 小 |
| 4 | 主播放器快捷键扩展 | **高** | `useAudioInteractions.ts` 仅 Space | 加 ←/→ 逐句、L 循环、S 进入跟读、B 收藏；复用 `useShadowingKeyboard` 模式；在 PlayerControls 加 `?` 快捷键面板（仿 ReviewCard.tsx:52-71） | 精听效率翻倍，专业用户口碑点 | 小 |
| 5 | 复习/录音组件暗色样式 | **高** | `ReviewCard.tsx:116-145`、`ShadowingVisualization.tsx:68`、`ShadowingControls.tsx:48` 硬编码浅色 | 评分四键改 token 化语义色或加 `dark:` 变体 | 暗色下核心页面视觉断裂修复 | 小 |
| 6 | 导航重排 + 当前页高亮 + 待复习徽标 | **高** | `AppShell.tsx:45-49` 无高亮、Review 排末位、无数字 | `usePathname` 高亮；顺序 Library / Review / Vault / Analytics / Setup；Review 项加待复习数 badge | 核心路径从 3 次点击缩到 1 次；每日目标可视化 | 小 |
| 7 | 复习评分乐观更新 | **高** | `ReviewClient.tsx:135-185` 等响应切卡 + 重入锁静默丢弃 | 本地先切卡、失败回滚 toast；允许快速连评（队列化） | 复习节奏不被网络打断，心流保护 | 中 |
| 8 | "继续练习"首页 | 潜在 | 老用户落营销页 `page.tsx` | 检测有轨道数据的老用户，首页 Hero 变"继续上次练习 + 今日待复习"仪表卡 | 打开即练，减少启动摩擦 | 中 |
| 9 | 轨道练习进度可视化 | 潜在 | practice 页无进度概念；仅 `ShadowingHeader` 有 x/y 数字 | Library 卡片加进度环（已跟读句/总句、已收藏句）；practice 页头加进度条 | 每轨变成"可通关关卡"，完成欲驱动 | 中 |
| 10 | 波形触摸手势 | 潜在 | `useAudioInteractions.ts` 仅 wheel/右键 | pinch 缩放 + 单指 seek；或移动端显示 ±缩放按钮 | 移动端精听可用性 | 中 |
| 11 | 循环 region 功能可发现性 | 潜在 | `PlayerControls.tsx` 无任何提示 | 首次 hover 波形显示一次引导气泡"拖动圈选循环"；空 region 时 Loop 键旁加提示 | 专业功能从隐藏变亮点 | 小 |
| 12 | 音频 decode 进度反馈 | 潜在 | `PracticeClient.tsx:97-120` 只有转圈 | fetch 进度条（Content-Length 百分比）显示在跟读按钮上 | 长音频等待焦虑消除 | 小 |
| 13 | 跟读录音即时评分 | 潜在 | 录完仅回放对比 `ShadowingVisualization.tsx:82-93` | 轻量启发式（时长/能量匹配）给一星/鼓励语；或接评分 API | 跟读从"自评"变"有反馈"，粘性大增 | 大 |
| 14 | 焦点陷阱与焦点归还 | 潜在 | `ShadowingConsole.tsx:105-107` 只进不还 | 关闭时焦点归还触发按钮；遮罩内 Tab 循环（可用 Radix Dialog 替换自建遮罩） | 键盘/读屏用户完整可用 | 小 |
| 15 | Review 空态升级 | 潜在 | `ReviewClient.tsx:284-290` | 与 #2 合并：完成态 = 庆祝 + 统计 + 引导去 library 练新轨 | 空态从终点变跳板 | 小 |
| 16 | 导出按钮移动端遮挡 | 低 | `ReviewClient.tsx:373-381` fixed 定位 | 移动端收进页头操作区，仅桌面悬浮 | 消除误触风险 | 小 |
| 17 | 页面过渡与微交互 | 低 | hover 仅 shadow（`TrackList.tsx:173`） | 卡片 hover 加 translate-y/-scale；按钮 active:scale-95；路由 view transition | 质感向 Linear 靠拢 | 中 |
| 18 | PlayerControls 残留英文 | 低 | `PlayerControls.tsx:45,67,75` "Position"/"Loop"/"Clear" 硬编码 | 走 i18n | 中文用户一致性 | 小 |
| 19 | 盲听文本 aria 处理 | 低 | `SentenceList.tsx:95` blur 但读屏可读 | 模糊时 `aria-hidden`，提供独立揭示按钮 | 读屏用户不泄题 | 小 |
| 20 | 统一 page-shell 容器 | 低 | 各页手写 `container py-8` | 抽 PageShell 组件统一节奏 | 视觉一致性、维护成本 | 小 |

---

## 高价值改进详述

### H1. 修复暗色模式文字不可见（#1 + #5）

**现状**：`text-primary/15`、`dark:text-primary/25` 这类"主色低透明度"写法共 12 处分布在 6 个文件（landing Hero 徽标、landing 底部 CTA、dashboard 倒计时卡、library 类型标签、vault、setup、practice 跟读按钮）。例如 `OverviewSection.tsx:38` 在 `bg-gradient-to-br from-primary to-purple-600` 卡片上用 `text-primary/15` 写标题——主色文字叠主色背景，直接隐形。`ReviewCard.tsx:116-145` 的评分四键是硬编码浅色体系，暗色下边框和 hover 底色全部错位。

**目标体验**：暗色模式下所有文字达到 WCAG AA；品牌渐变卡上的文字统一用 `text-white` / `text-white/80`；语义色（成功/警告/危险）全部 token 化。

**参考产品**：Linear 的双主题 token 纪律——任何颜色不允许脱离 semantic token。

**落地路径**：① 全局搜索 `text-primary/1\d|text-primary/2\d` 与 `dark:text-primary/` 逐处改为语义色；② ReviewCard / ShadowingControls / ShadowingVisualization 的红绿按钮改用 `destructive`/自定义 chart token 或补 `dark:` 变体；③ 在 AGENTS.md "Learned from Mistakes" 加一条：禁止在彩色背景上使用 `text-primary/<低透明度>`。半天可完成。

### H2. 给核心闭环加"完成时刻"（#2 + #15）

**现状**：跟读练到最后一页，"下一句"按钮悄悄 disabled（`ShadowingConsole.tsx:328`）；复习队列清空后显示 `text-muted-foreground` 一行字（`ReviewClient.tsx:286-288`）。两个每天最高频的"胜利瞬间"完全没有被产品接住。

**目标体验**：
- 跟读：最后一句完成 → 全屏轻量庆祝（CSS confetti/星星爆发，无需引入库）→ 小结卡：本轨跟读 X 句、用时 Y（TimeTracking 已有数据）、收藏 Z 句、"连续 N 天" → CTA "再练一遍 / 回 Library"。
- 复习：队列清空 → "今日复习完成"页：今日评分分布、streak +1 动效、明日到期预告、导出今日音频 CTA（导出按钮已有，`ReviewClient.tsx:373`）。

**参考产品**：Duolingo 每课结束的经验值结算动画 + streak 火焰；Anki 的 "Congratulations! You have finished this deck for now."

**落地路径**：新建 `SessionSummary` 组件（复用 Card + Button）；ShadowingConsole 在 `currentIndex === totalCount-1` 且 reviewing 结束时渲染；ReviewClient 把现有 `!current` 分支替换为该组件。数据全部本地可得，无需后端改动。1–2 天。

### H3. Streak 全局化 + 导航重排（#3 + #6）

**现状**：streak 计算在 `BehaviorCharts.tsx:72-109` 已完成，展示埋在 dashboard 第三个 tab；导航无当前页高亮、Review 无待办数、Setup 占第二顺位。

**目标体验**：导航栏右侧常显 🔥 N 天火焰徽标（复用 streak 计算，轻量 API 或在 AppShell 下挂 server 数据）；导航顺序改为 Library / Review（带待复习数红点）/ Vault / Analytics / Setup；当前页 `text-foreground` 高亮 + 下划线指示。

**参考产品**：Duolingo 顶部 streak 火焰是全 App 最显眼的元素；Things 的 Today 数字徽标。

**落地路径**：AppShell 改为 server component 包一层取 streak/dueCount（已有 Prisma 查询可复用 `review/page.tsx` 逻辑），导航项加 `usePathname()` 判断。0.5–1 天。注意保持现有移动端横向滚动兜底。

### H4. 主播放器键盘操作补齐（#4 + #11）

**现状**：主播放器只有 Space（`useAudioInteractions.ts:27-43`）；逐句跳转必须鼠标点列表；region 循环是零提示的隐藏功能。ShadowingConsole 的键盘方案（`useShadowingKeyboard.ts`）已经很完善但没有回移。

**目标体验**：←/→ 跳上一句/下一句（并从该句播放）、↑/↓ 或 [ ] 调速、L 切换循环、S 进入该句跟读、B/C 收藏当前句、? 打开快捷键面板（样式复用 `ReviewCard.tsx:52-71` 的 kbd 浮层）。首次 hover 波形显示一次性气泡"拖动圈选循环段"。

**参考产品**：YouTube 的 J/K/L、Language Reactor 的逐句快捷键——精听工具的键盘效率就是核心口碑。

**落地路径**：扩展 `useAudioInteractions`（已集中管理键盘/滚轮），actions 映射到现有 `wavesurferRef`/`onCapture`/`onShadowing`；注意复用其已有的对话框避让逻辑（`useAudioInteractions.ts:31-35`）。1 天。

### H5. 复习评分乐观更新（#7）

**现状**：`handleGrade` 等 POST 成功才切卡，且 `gradingRef` 锁让快速连按被静默丢弃（`ReviewClient.tsx:136,142,183`）——键盘流用户 1-2-3-4 连评时，第二键起全部无响应、无任何提示，是最伤心流的一处。

**目标体验**：按下评分键立即切下一张卡（乐观），请求后台发送，失败时回滚并 toast；允许连续评分（把评分请求排队而非丢弃）。参考 Anki 的 answer 即切卡。

**落地路径**：先 `removeCurrentReviewItem` 本地切卡再 fetch；失败时把 item 插回原位。现有 `itemsRef` 机制已为此铺好路。0.5–1 天，需补测试（`ReviewClient.test.ts` 已存在）。

---

## 潜在价值项与需要进一步验证的点

1. **#8 继续练习首页**：需确认产品定位——如果 `/` 主要承担 SEO/拉新，可以做"老用户自动跳 `/library` 或双栏 Hero（左营销右恢复卡）"。需与 owner 确认。
2. **#13 跟读即时评分**：体验收益最大但成本也最大。建议先验证轻量方案（录音时长与原声时长比、静音段对齐度）给用户"完成度"反馈，再评估是否接语音评分 API。
3. **#9 轨道进度**：需定义"一轨练完"的口径（跟读过所有句？收藏句复习完？），涉及 `track.status` 七态状态机（`domain-constants`）的语义，建议先做纯展示（已跟读句数/总句数）不动状态机。
4. **#10 触摸手势**：wavesurfer.js v7 对 pinch 无原生支持，需自实现；建议先上 ± 缩放按钮兜底，pinch 作为二期。
5. **音效反馈**（按键音、完成音）：消费级产品的隐性粘性强项，但部分用户反感，需加设置开关。建议作为 #2 完成时刻的可选增强一起验证。

---

## 建议实施路线图

**第一周（quick wins，全部 ≤1 天）**

1. #1 + #5 暗色模式修复（含防复发规则）。
2. #6 导航重排 + 当前页高亮 + Review 待办徽标。
3. #3 导航栏 streak 火焰。
4. #4 + #11 主播放器快捷键 + 循环功能引导气泡 + PlayerControls i18n（#18 顺手做）。
5. #12 音频加载进度。

→ 一周后：暗色可用、每日目标可见、精听键盘流成立——三个最影响日常体验的层全部升级。

**中期（2–4 周）**

6. #2 + #15 完成时刻（跟读小结 + 复习完成页 + 轻庆祝动效）。
7. #7 复习乐观更新。
8. #9 Library 进度环 + practice 页进度条。
9. #10 移动端波形 ± 缩放按钮 + #14 焦点管理 + #16 导出按钮位置。
10. #8 老用户"继续练习"首页（定位确认后）。

→ 一个月后：每次练习/复习都有情绪闭环，粘性机制完整跑通。

**长期（1 个月以上，需验证）**

11. #13 跟读即时评分（先启发式后 API）。
12. #17 全局微交互/页面过渡体系（引入 view transitions）。
13. 音效反馈系统（带开关）。
14. 波形 pinch 手势。

---

## 一句话总评

**工程与信息架构已经是专业级精听工具的底子，但情绪反馈与粘性设计还停留在"工具"而非"产品"——把每个正确动作的即时奖励补上，它就有机会从"好用"变成"放不下"。**
