# UI 升级 Changelog — Calm Slate（2026-02-14）

实施依据：`docs/ui-visual-style-review.md`（方向 A）+ `docs/ui-ux-review-report.md`（Top 5 中小成本项）。
Harness：`docs/agent-harness/sessions/2026-02-14-calm-slate-ui-upgrade/`（Contract mode）。
质量门：`npm run verify:quick` 全绿（ESLint 0 警告 0 错误；316/316 测试通过）。
冒烟：dev server 短暂启动验证 `/` `/library` `/dashboard` 200、`/api/streak` 返回 JSON，已停止，无后台进程遗留。

## 1. 设计 token（src/app/globals.css）

- 亮色灰阶加 260° 冷色相（`--muted/--secondary/--border` 色度 0 → 0.004–0.005），消除"灰白塑料感"。
- 暗色背景从纯黑 `oklch(0.145 0 0)` 改为深灰蓝 `oklch(0.19 0.012 264)`，card 提亮到 0.235 并带色相差，暗色层次拉开。
- 主色降饱和：亮 `oklch(0.52 0.19 262)` / 暗 `oklch(0.72 0.13 262)`（原 0.262/0.169 chroma 过响）。
- 新增语义色 token：`--success` / `--success-foreground` / `--warning` / `--warning-foreground`（亮暗双套），注册为 Tailwind `text-success` 等工具类。
- 新增双层柔影 token：`--shadow-card` / `--shadow-card-hover`（亮暗双套），注册为 `shadow-card` 工具类。
- `--radius` 0.625rem → 0.5rem（Calm Slate 基值）。
- chart/sidebar 色板随主色色相从 276.97 统一到 262。

## 2. 低可见度文字修复（15 处，6 文件）

- `src/app/page.tsx`：7 处 `dark:text-primary/25|50` → `dark:text-primary`；底部 CTA 副文案 `text-primary/25` → `text-white/80`。
- `src/app/dashboard/sections/OverviewSection.tsx`：倒计时卡标题/单位/日期 → `text-white/85|80|70`；两张白卡标题 `dark:text-primary/15` → `dark:text-primary`；渐变 `from-primary to-purple-600` → `from-primary to-primary/70`（单色相，消除品牌冲突）。
- `src/app/setup/page.tsx`、`src/app/library/TrackList.tsx`、`src/app/vault/VaultListClient.tsx`、`src/app/practice/[id]/PracticeClient.tsx`：`dark:text-primary/xx` → `dark:text-primary`。

## 3. tabular-nums

倒计时（OverviewSection）、复习计数 reviewed/remaining（ReviewClient）、学习时长（dashboard/page.tsx）、句子序号（SentenceList）、评分键数字（ReviewCard）、streak 徽标（NavStreak）。

## 4. 基元与手感

- `ui/button.tsx`：`transition-all` → `transition-colors duration-150 ease-out`，新增 `active:scale-[0.98]` 按压反馈。
- `ui/card.tsx`：`shadow-sm` → `shadow-card`（双层柔影）。
- `library/TrackList.tsx`、`library/NotesList.tsx`：`hover:shadow-md` → `hover:-translate-y-0.5 hover:shadow-card-hover transition-[transform,box-shadow] duration-200 ease-out`。
- `review/ReviewCard.tsx`：评分四键硬编码浅色（red-200/green-600/amber/blue）→ token 化（destructive / warning / success / primary），暗色自动适配。
- `shadowing/ShadowingVisualization.tsx`、`ShadowingControls.tsx`：录音/重录红色 `bg-red-50` 等 → `bg-destructive/10 border-destructive/20`。
- `dashboard/page.tsx`：复习时长徽标 `bg-amber-50` → `bg-warning/15 text-warning`；计数 `text-green-600/blue-600` → `text-success/text-primary`。
- `practice/[id]/PracticeClient.tsx`："开始跟读"升为主 CTA（`variant="default"`），"导出音频"降为 ghost——页面视觉锚点修正。

## 5. 主播放器快捷键（H4）

- `audio-player/useAudioInteractions.ts`：键盘从仅 Space 扩展为 Space 播放/暂停、←/→ 上/下一句、L 切换循环、S 从当前句进入跟读；保留原有的输入框/对话框避让，并跳过 alt/ctrl/meta 组合键。
- `AudioPlayer.tsx`：新增 `seekToSentence` 并接线四个回调；当前句索引用 ref + effect 同步（满足 react-hooks/refs 规则）。
- `app-shell/KeyboardShortcutsHelp.tsx`：practice 区新增 ←/→、L、S 条目（全局 `?` 面板已有，本次补充内容）。

## 6. Streak 全局导航徽标（H3）

- 新增 `src/app/api/streak/route.ts`：GET 返回 `{ currentStreak }`，服务端从 studySession 聚合，逻辑与 BehaviorCharts 一致（今天无数据时回退昨天）。
- 新增 `src/components/app-shell/NavStreak.tsx`：🔥 + 天数（warning 色、tabular-nums），点击跳 dashboard；streak < 1 时不渲染。
- `AppShell.tsx`：导航栏挂载 NavStreak。

## 7. 完成时刻（H2，克制版）

- 复习队列清空且本次有评分（ReviewClient）：空态一行灰字 → 完成卡（success 圆标 + 标题 + 今日复习数 + "去练点新内容" CTA，`animate-in fade-in zoom-in-95`，无夸张动效）。
- 跟读练到最后一句（ShadowingConsole）：底部"下一句"不再 disabled 死路，变为"完成本轨"→ 会话小结（success 圆标 + 完成句数 + 再练一遍/完成）。新增可选 prop `onRestart`（PracticeClient 已接线跳回第 0 句）；句子切换时完成态自动复位。

## 8. i18n

新增键（en + zh-CN 双语，messages.test.ts 键集一致性通过）：
- `nav.streakTitle`
- `feature.shadowingConsole.{finishSession, completedTitle, completedBody, practiceAgain}`
- `review.{completedTitle, completedBody, goLibrary}`
- `shortcuts.practice.{prevNext, toggleLoop, shadowing}`

## 已知遗留（非本次范围）

- `npx tsc --noEmit` 有 2 个**先于本次改动存在**的错误（`src/lib/api-response.test.ts:38`、`src/lib/setup-readiness.test.ts:42`，均为测试文件类型问题，本次未触碰）。
- 语义色 token 化只覆盖了复习/跟读/仪表盘关键路径；vault、library 状态徽章的硬编码色留待下一轮。
- PlayerControls 的 "Position/Loop/Clear" 英文 i18n 未做（涉及新增命名空间接线，列入下一轮）。

## 未触碰

`prisma/dev.db`、`public/uploads/`、`public/videos/`、`.env*`、lint/test/build 配置、同步脚本。
