# DeepListener 视觉风格（Look & Feel）专项评审

> **实施状态（2026-02-14）**：方向 A「冷灰蓝克制风」已落地，第四节 quick wins 第 1–5、7 项已完成；第 6 项中渐变冲突已修、PlayerControls 英文 i18n 遗留。详见 `docs/ui-upgrade-changelog.md`。
>
> 范围：纯视觉设计维度——配色、字体排版、空间密度、形状材质、图标、细节工艺。
> 基建依据：`src/app/globals.css`（Tailwind v4 `@theme` token 体系，无 tailwind.config 文件）、`src/app/layout.tsx`（字体引入）、`src/components/ui/*`（基元组件）、全量 tsx 样式统计（圆角/阴影/图标尺寸/过渡的实际分布）。
> 目标：从"能用"升级到"看起来舒服、有高级感"。

---

## 一、当前风格诊断（带代码证据）

### 1. 设计基建现状

- **Token 体系**：Tailwind v4，`globals.css:5-46` 用 `@theme inline` 把 CSS 变量映射为 Tailwind 色板；`:root`（48-85）与 `.dark`（87-121）双套 oklch 色值，注释规范（如 `globals.css:58` 标注品牌色对应 indigo-600）。基建是现代且健康的。
- **字体**：`layout.tsx:13` 引入 `Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })`，`globals.css:8` 将 `--font-sans` 指向它。**只加载了 latin 子集**——中文全部回落到系统字体（PingFang/微软雅黑），形成"英文 Inter + 中文系统字体"的隐式混排。
- **基元组件**：shadcn/ui 体系（button/card/badge/progress/skeleton/dialog/dropdown），`Card` 默认 `rounded-xl border py-6 shadow-sm`（`card.tsx:8`），`Button` 默认 `rounded-md`（`button.tsx:8`）。

### 2. 配色体系

**色相/饱和度策略**：主色 indigo-600（`oklch(0.511 0.262 276.97)`，`globals.css:59`）。问题不在主色选择，而在**辅助色是"无彩灰"而暗色模式是"纯黑"**：

- 亮色的 muted/border 全部零色度（`--muted: oklch(0.97 0 0)`、`--border: oklch(0.922 0 0)`，`globals.css:63,68`）——与 indigo 主色并置时界面显得"灰白塑料感"，缺少高级产品常见的"带一点主色倾向的冷灰"（如 Linear 的灰带 260° 微弱色相）。
- 暗色背景是**纯中性深灰**（`--background: oklch(0.145 0 0)`，`globals.css:89`），即近纯黑 #232323 风格。纯黑 + 高饱和 indigo-500 的对比生硬刺眼，是暗色"廉价感"的最大来源；高级暗色普遍用**深灰蓝**（如 Linear #101012 带蓝相、VS Code #1f2430）。

**主色使用不克制**：统计可见 `bg-primary/10`、`text-primary`、`border-primary/15` 的染色用法遍布每个页面（landing 徽标、track 类型标签、句子激活态整行 `bg-primary/10`、`ShadowingHeader` 等）。主色应只给"唯一主行动"，当前它同时承担品牌、状态、装饰三重职责，导致页面没有视觉锚点。反例对照：landing 的"开始跟读"按钮反而不是 primary 实色（`PracticeClient.tsx:200-208` 用 secondary 改色）——**最重要 CTA 的视觉权重低于装饰性标签**。

**灰阶层次**：只有 background / card / muted / border 四档且色度全 0，暗色下 background(0.145) → card(0.205) 的明度差仅 0.06，层次拉不开，暗色界面"糊成一片"。

**语义色不成体系**：token 里只有 `destructive` 一个语义色。成功/警告散落在组件里硬编码：`text-green-600`（`ReviewClient.tsx:300`）、`bg-amber-50 text-amber-600`（`SentenceList.tsx:78`、`dashboard/page.tsx:132`）、`border-red-200 text-red-600`（`ReviewCard.tsx:116`）、`bg-green-50/30`（`TrackList.tsx:174`）。同一"已收藏"语义在不同页面分别是 amber 实心、amber 浅底、BookmarkCheck 图标——色值、深浅、背景处理不统一，且全部没有暗色变体。

**暗色 bug 重申**（首轮报告 H1，此处从风格角度确认其视觉破坏力）：`text-primary/15`、`dark:text-primary/25` 共 12 处，暗色下多处文字隐形，是目前暗色模式"没法看"的直接原因。

### 3. 字体与排版

- **字体选择**：Inter 是安全但"默认感"最强的选择——shadcn 模板同款，零品牌辨识度。且 `subsets: ["latin"]` 使中文回落系统字体后，**中西文是两套设计语言的拼贴**：Inter 的几何感 vs PingFang 的人文感，在 mixed 文案（如"DeepListener 精听"）里肉眼可见地不统一。
- **字号层级失控**：统计全文出现 text-[10px]、text-xs、text-sm、text-[15px]、text-[16px]、text-base、text-lg、text-xl、text-2xl、text-3xl、text-4xl、text-5xl、text-6xl 共 13+ 档，其中 `text-[15px] sm:text-[16px]`（`SentenceList.tsx:94`）这类任意值破坏了 4px 栅格节奏。高级感恰恰来自**层级克制**（一流产品通常 5–7 档）。
- **字重**：以 font-medium / font-semibold / font-bold 为主，少量 font-black（`BehaviorCharts.tsx:202`）；同一页面内"句序号 font-bold 10px"（`SentenceList.tsx:99`）与"标题 font-bold text-xl"权重区分度不足，层级全靠字号硬撑。
- **数字字体**：全项目 `tabular-nums` 使用次数为 **0**。播放器时间码用了 `font-mono`（`PlayerControls.tsx:47`）是局部正确解，但 dashboard 的倒计时大数字（`OverviewSection.tsx:43` `text-5xl font-bold`）、复习计数（`ReviewClient.tsx:300,304`）、时长统计（`dashboard/page.tsx:122`）全部用比例数字，数字跳动/对不齐。
- **行高/字距**：landing 标题有 `tracking-[-0.035em]`（`page.tsx:29`）的精修，但这是孤例；正文行高靠 Tailwind 默认，句子列表 `leading-relaxed`（`SentenceList.tsx:94`）、跟读大字 `leading-loose`（`ShadowingConsole.tsx:268`）各自为政。
- **英文硬编码**："Position"/"Loop"/"Clear"（`PlayerControls.tsx:45,67,75`）、"days"、"Best Streak"（`BehaviorCharts.tsx:200-205`）未走 i18n，中文界面里直接露出英文，是"高级感"的硬伤。

### 4. 空间与密度

- **无页面级节奏体系**：各页手写 `container mx-auto py-8 px-4`（library/review/dashboard/vault 同一句复制），页内区块间距 `mb-8`、`space-y-8`、`space-y-10`、`gap-6` 混用（`dashboard/page.tsx:19,109`、`library/page.tsx:39`）。
- **卡片内边距双轨制**：shadcn Card 默认 `px-6 py-6`（`card.tsx`），但 landing 卡片用 `px-5 py-5`（`page.tsx:83-90`）、播放器头部 `px-4 py-4`（`PlayerControls.tsx:32`）、复习页脚 `p-6`（`ReviewCard.tsx:108`）——四种内边距并存，卡片之间"对不齐"。
- **密度失衡**：练习播放器内部（`AudioPlayer.tsx:242` 起）信息密度高且节奏好，是全场最佳；但外围页面（library 卡片只有标题+标签+一行描述，大量留白）密度过低，两者拼在同一产品里有"精装房间 + 毛坯走廊"的断裂感。

### 5. 形状与材质

- **圆角失控**：统计全文 `rounded-md`(28) / `rounded-lg`(35) / `rounded-xl`(30) / `rounded-2xl`(4) / `rounded-full`(42) / `rounded-sm`(5) / `rounded-xs`(1) / 任意值 `[2px]`、`[1px]`、`[50%]`、`[2rem]`。**基元内部就不一致**：Card 是 `rounded-xl`，Button 是 `rounded-md`，Badge 是 `rounded-full`，输入态 token `--radius: 0.625rem`（`globals.css:50`）与三者都对不上。高级感的圆角规则是"嵌套递减"（外容器大圆角、内元素小一档），当前是同屏随机分布。
- **阴影廉价感**：统计 `shadow-sm`(17)、`shadow-md`(5)、`shadow-lg`(7)、`shadow-xl/2xl`(3)。问题：① shadcn 默认 `shadow-sm` 是单层中性灰投影，边缘生硬；② hover 从 `shadow-sm` 直接跳 `shadow-md`（`TrackList.tsx:173`）是"投影变大"的初级手法，高级产品用 translateY + 多层柔影；③ 只有一个手工精修阴影 `shadow-[0_0_8px_color-mix(...)]`（`SentenceList.tsx:85` 激活点光晕）和 `shadow-slate-200/60`（`AudioPlayer.tsx:242`），说明团队知道怎么做但只做了两处。
- **玻璃拟态**：仅导航栏一处 `bg-background/90 backdrop-blur`（`AppShell.tsx:38`），是正确使用。
- **渐变**：三处——landing Hero 双色 radial（`page.tsx:23`，质感不错）、倒计时卡 `from-primary to-purple-600`（`OverviewSection.tsx:36`，渐变方向随意且 purple 与 indigo 品牌色相冲突）、底部 CTA 纯 `bg-primary`。无渐变规范。
- **纹理**：全项目零纹理（噪点/网格/纸质），界面底色是纯平填充，近看"数码毛坯感"。

### 6. 图标体系

- **图标库**：lucide-react 统一，好。描边粗细天然一致。
- **尺寸失控**：统计显示 `h-4 w-4`(74)、`h-5 w-5`(16)、`size-4`(13)、`h-3.5 w-3.5`(3)、`h-3 w-3`(9)、`h-6 w-6`(7)、`h-8 w-8`(10) 七档并存；`size-*` 与 `h-* w-*` 两种写法混用。按钮内图标本应统一 16px（size-4），实际 `SentenceList.tsx` 用 h-5 w-5、`ReviewCard.tsx` 用 h-3.5 w-3.5，同类按钮图标大小肉眼不齐。
- **图标 + 文字基线**：部分按钮图标带 `ml-1` 修正（`PlayerControls.tsx:41` Play 图标手动右移 1px），说明视觉对齐靠手工打补丁而非统一组件规则。

### 7. 细节工艺

- **过渡曲线无规范**：统计 `transition-colors`（大量）、`transition-all`（button 基元及 20+ 处）、`transition-opacity`、`transition-shadow`、`transition-transform` 混用；显式时长只有零星 `duration-200`/`duration-300`（`SentenceList.tsx:94`、`InteractiveText.tsx:96`），其余全吃 Tailwind 默认 150ms；**全项目无一处自定义 easing**（无 `ease-out`/`ease-in-out` 声明，默认 `cubic-bezier(0.4,0,0.2,1)`）。`transition-all` 在 button 基元（`button.tsx:8`）意味着 padding/size 变化也会触发动画，是"发飘"感的来源。
- **hover 态手法单一**：90% 是 `hover:bg-accent` 或改字色；卡片是 `hover:shadow-md`；没有 `active:scale` 按压反馈（唯一 scale 是 RichTextToolbar 的色板圆点 `hover:scale-110`，`RichTextToolbar.tsx:53`）。
- **焦点环**：基元统一 `focus-visible:ring-[3px] ring-ring/50`（`button.tsx:8`），规范且是亮点；但自定义元素（TrackCard 的 `role="link"` div，`TrackList.tsx:181-190`）没有焦点样式，键盘聚焦不可见。
- **选中态**：激活句子 `bg-primary/10 border-primary/15` + 发光圆点（`SentenceList.tsx:74-89`）是全场最精致的选中态；但 Library 选中是 `ring-2 ring-primary`（`TrackList.tsx:176`）、Tab 选中是下划线（`DashboardTabs.tsx:42`）、筛选项是边框变色（`VaultFilters.tsx:110`）——**四种选中语言并存**。
- **分割线**：有 `border-t/border-b`、`<div className="h-px bg-border my-1" />`（`TrackList.tsx:274`）、`divide-y`（`dashboard/page.tsx:117`）三种写法，颜色统一靠 token，尚可。

---

## 二、高级感差距清单（分级）

| # | 差距 | 证据 | 影响 | 修复成本 |
|---|------|------|------|---------|
| V1 | 暗色纯黑无蓝相 + 层次糊 | `globals.css:89-91` background/card 零色度、明度差 0.06 | 暗色模式"廉价+"看不清层级 | 小（改 token） |
| V2 | 亮色灰阶零色度，界面"灰白塑料感" | `globals.css:61-68` | 亮色不够润 | 小（改 token） |
| V3 | 主色滥用 + 最重要 CTA 权重不足 | `PracticeClient.tsx:200-208` vs 各处 `bg-primary/10` | 视觉无锚点 | 小 |
| V4 | 语义色硬编码且不成体系 | `ReviewCard.tsx:116`、`SentenceList.tsx:78` 等 | 状态语言混乱、暗色断裂 | 中 |
| V5 | 字号 13+ 档 + 任意值 | `SentenceList.tsx:94` text-[15px] | 节奏紊乱 | 中 |
| V6 | tabular-nums 全项目为 0 | 倒计时/计数/时长全比例数字 | 数字界面不精致 | 小（加类名） |
| V7 | 圆角 8 档随机分布、基元互不一致 | `card.tsx` xl vs `button.tsx` md | 形状语言不统一 | 小（改基元） |
| V8 | 阴影用默认单层灰影 + hover 放大 | `TrackList.tsx:173` | 材质廉价 | 小（改 token/基元） |
| V9 | 过渡时长/曲线无规范、transition-all 泛滥 | `button.tsx:8` | 动效发飘 | 小 |
| V10 | 选中态四种语言并存 | ring-2 / primary 底 / 下划线 / 边框 | 交互语言不统一 | 中 |
| V11 | 英文硬编码外露 | `PlayerControls.tsx:45,67,75` | 中文界面出戏 | 小 |
| V12 | hover 无按压反馈（active:scale 为零） | 全文统计 | 缺"手感" | 小 |
| V13 | 中西文字体隐式拼贴、Inter 零辨识度 | `layout.tsx:13` | 品牌感弱 | 中 |
| V14 | 卡片内边距四种并存、页面节奏无体系 | `page.tsx:83` vs `card.tsx` | 对不齐 | 中 |
| V15 | 零纹理/零渐变规范、purple 渐变冲品牌 | `OverviewSection.tsx:36` | 平面毛坯感 | 小 |

---

## 三、风格方向提案（3 选 1）

### 方向 A：冷灰蓝克制风（Calm Slate — 首推）

**参考产品**：Linear、Raycast、Things 3。
**气质**：理性、专注、工具的高级感。精听是"长时间盯着同一句反复磨"的专注场景，视觉必须退后、内容必须前置——冷灰蓝中性底 + 极度克制的主色正是为此而生。

关键 token 调整（只改 `globals.css`）：

```css
:root {
  --background: oklch(0.985 0.002 260);        /* 微冷白，非纯白 */
  --muted: oklch(0.968 0.004 260);             /* 冷灰带 260° 微弱色相 */
  --border: oklch(0.918 0.005 260);
  --primary: oklch(0.52 0.19 262);             /* 降饱和的 slate-indigo，比 0.262 克制 */
  --accent: oklch(0.955 0.012 262);
}
.dark {
  --background: oklch(0.19 0.012 264);         /* 深灰蓝，替代纯黑 */
  --card: oklch(0.225 0.014 264);              /* 与背景明度差拉到 0.035+，加色相差分层 */
  --border: oklch(1 0 0 / 10%);
  --primary: oklch(0.72 0.13 262);             /* 暗色主色降饱和提亮 */
}
```

- 字体：保留 Inter（西文）+ 显式声明 CJK 栈 `"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif` 进 `--font-sans`，消除拼贴感；标题字重收到 600，正文 400/500 两档。
- 圆角：统一 `--radius: 0.5rem`，Card→xl(0.75rem)、Button→md(0.5rem)、输入→md，嵌套递减一档。
- 阴影：弃用默认 shadow-sm/md，改两层柔影 token，如 `--shadow-card: 0 1px 2px oklch(0 0 0 / 4%), 0 4px 16px -4px oklch(0 0 0 / 6%)`；hover 用 `translateY(-1px)` + 阴影加深而非换档。
- 语义色入 token：`--success/--warning` 用低饱和 oklch（如 success `oklch(0.65 0.13 160)`），替换全部硬编码 green/amber/red-50。
- 动效：统一 `duration-150 ease-out` 入场、`duration-200` 状态切换；基元 transition-all 改 transition-colors。

### 方向 B：深色沉浸风（Studio Dark）

**参考产品**：Spotify、Ableton/Logic 等音频工作站、Sonos App。
**气质**："进入录音棚"——默认暗色为第一公民，波形/频谱是视觉主角，霓虹感主色在深色上发光。与 ShadowingConsole 现有的 `bg-slate-950/95` 全屏遮罩（`presentation.ts:40`）气质天然契合。

关键 token 建议：

```css
.dark /* 设为默认 */ {
  --background: oklch(0.17 0.015 270);
  --card: oklch(0.21 0.015 270);
  --primary: oklch(0.75 0.16 280);             /* 更亮的 violet，深色上发光 */
  --chart-2: oklch(0.8 0.15 160);              /* 波形/录音指示用荧光绿 */
}
```

- 波形、录音按钮、streak 火焰允许高饱和发光（`shadow-[0_0_12px_var(--primary)]`，把 `SentenceList.tsx:85` 那处手工光晕升级为规范）；其余界面保持哑光。
- 排版：大数字用 `tabular-nums` + `font-weight 700`，时间码保持 mono。
- 风险：长文本阅读（句子列表、笔记）在深底上疲劳度更高，需把句子阅读区局部提亮（`--card` 提到 0.24）。

### 方向 C：柔和纸张感（Warm Paper / Editorial）

**参考产品**：Notion、Readwise Reader、Bear。
**气质**："学习笔记本"——暖纸底、衬线标题、高可读性正文。适合强化"精听笔记/语料库"（vault）心智，把产品从"工具"包装成"我的听力手账"。

关键 token 建议：

```css
:root {
  --background: oklch(0.975 0.008 85);         /* 暖米白 */
  --card: oklch(0.99 0.005 85);
  --border: oklch(0.9 0.01 80);
  --primary: oklch(0.5 0.14 250);              /* 墨蓝而非电光紫 */
  --font-serif: "Source Serif 4","Noto Serif SC",serif;
}
```

- 标题与句子文本用衬线（精听句子本质是阅读材料，衬线提升"文本质感"），UI 控件保持无衬线。
- 阴影几乎取消，全靠 1px 暖色边框分层；加极轻噪点纹理（SVG feTurbulence data-URI，~2KB）。
- 风险：与现有的渐变倒计时卡、发光激活点等"数码感"元素冲突最大，改造面最广。

**对比结论**：A 改造面最小、风险最低、与现有 shadcn 基元最兼容；B 最有个性但要把亮色/暗色优先级对调；C 最有差异化但改动面最大。A 是"四周内见效"的正解，B 可作为 A 完成后的暗色模式深化（两者暗色 token 方向一致）。

---

## 四、Quick Wins：不动结构、只改样式/类名（按见效速度排序）

以下每一项都不改组件结构/逻辑，只改 `globals.css` token、基元 className 或局部 className：

1. **暗色底改深灰蓝 + 修 12 处 `text-primary/15|25` 隐形文字**（V1+暗色 bug）：改 `globals.css:87-121` 的 `.dark` token；全局搜索 `text-primary/15`、`text-primary/25`、`dark:text-primary/25`、`dark:text-primary/50` 替换为 `text-white/80` 或 `dark:text-primary`。**一次提交让暗色模式从"没法看"变"能看且高级"**。
2. **亮色灰阶加冷色相**（V2）：`--muted/--secondary/--border` 色度从 0 提到 0.004–0.006（260°），三行改动，整个亮色界面立刻"润"起来。
3. **全局数字加 `tabular-nums`**（V6）：倒计时（`OverviewSection.tsx:43`）、复习计数（`ReviewClient.tsx:300-304`）、时长（`dashboard/page.tsx:122`）、句子序号（`SentenceList.tsx:99`）加一个类名；数字不再跳动错位。
4. **基元统一动效与圆角**（V7+V9）：`button.tsx:8` 的 `transition-all` 改 `transition-colors`，追加 `active:scale-[0.98]`；Card/Button/Badge 圆角按"外 xl、内 md"对齐 `--radius`。全局按压手感 + 形状秩序，两处文件改动。
5. **阴影换双层柔影 + hover 换 translateY**（V8）：在 `@theme` 定义 `--shadow-card`、`--shadow-card-hover`，替换 `card.tsx` 的 `shadow-sm` 与 `TrackList.tsx:173`、`NotesList.tsx:31` 的 `hover:shadow-md transition-shadow` 为 `hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200 ease-out`。
6. **修渐变冲突 + PlayerControls 英文 i18n**（V15+V11）：`OverviewSection.tsx:36` 的 `to-purple-600` 改 `to-primary/70` 单色相渐变；"Position/Loop/Clear"（`PlayerControls.tsx:45,67,75`）走 next-intl。
7. **主 CTA 权重修正**（V3）：`PracticeClient.tsx:200-208` 的"开始跟读"从 secondary 自定义色改 `variant="default"`（primary 实色），同时把"导出音频"降为 ghost。一个类名让页面有了视觉锚点。

---

## 一句话总结

当前的视觉是"shadcn 模板默认值 + 各处手工补丁"：token 基建合格，但色度策略（零色相灰、纯黑暗色）、克制原则（主色滥用、字号圆角失控）和细节工艺（easing、柔影、tabular-nums）三层都停在毛坯态——**先按方向 A 把 token 层的七个 quick wins 落地，"高级感"就能兑现 70%，且不需要动任何组件结构**。
