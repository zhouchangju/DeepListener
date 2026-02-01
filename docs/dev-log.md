# 开发日志 (Dev Log)

## 2026-01-30

### ✅ 今日成就 (Completed)

1.  **语音标记系统 (Phonetic Notation)**：
    - **全栈实现**：从 DB (`formatting` JSON) 到 API (`PATCH /sentence/:id`) 再到前端组件 (`InteractiveText`, `NotationToolbar`) 的完整链路。
    - **交互创新**：实现了“画笔式”标注，支持重音(Stress)、连读(Linking)、弱读(Reduction)、省略(Elision)四种标记。
    - **自动保存**：Shadowing 页面支持无感知自动保存，体验流畅。
    - **全站同步**：音频播放页和复习页均已支持标记的只读展示。

2.  **Shadowing 交互增强 (Interaction)**：
    - **键盘支持**：现在可以用 `←` / `→` 左右方向键快速切换句子，手无需离开键盘。
    - **录音打断**：新增了 "Restart" 按钮，录音过程中如果感觉没读好，可以随时点击立即重录。
    - **立即打断优化**：修复了点击 "Rec Again" 时无法立即终止当前录音或播放的问题。现在支持真正的即时重录。
    - **循环播放间隔**：优化了 Shadowing 的单句循环逻辑，在每次播放结束后增加 1 秒暂停，避免过于紧凑。
    - **录音状态泄漏修复**：利用 `useRef` 解决了切换句子时，上一个句子的录音状态（Your Voice）泄漏到新页面的严重 Bug。
    - **布局对称性优化**：将 Loop 按钮移至 MiniWavePlayer 内部右侧，与左侧播放按钮对称，视觉更平衡。
    - **播放按钮复位**：将 "Start Challenge" 按钮恢复至底部控制区，符合用户习惯。

3.  **性能大优化 (Performance Fixes)**：
    - **数据库索引**：为 `Track` 和 `ReviewItem` 的高频查询字段 (`status`, `isArchived`, `createdAt`) 添加了索引。
    - **分页限制**：Vault 和 Review 页面增加了 `take` 限制 (100/50)，防止一次性加载海量数据导致 8-24s 的卡顿。
    - **流式渲染 (Streaming)**：全站引入 `Suspense` + `Skeleton`，实现了页面秒切，数据后台加载。

4.  **Shadowing 模式增强 (Shadowing 2.0)**：
    - **交互优化**：实现了“打断式”交互——点击播放立即停止录音，点击 Next 立即重置状态。
    - **循环功能**：新增了单句循环播放按钮 (Repeat Loop)。
    - **进度感知**：显示当前句子进度 (e.g., 5 / 42)。

5.  **练习页功能扩展**：
    - **编辑功能**：在播放页顶部增加了 Edit 按钮，复用 `RenameTrackModal` 修改标题、类型和主题。
    - **状态流升级**：`Unlearnt` 设为默认状态，完善了状态流转逻辑。

6.  **Analytics 面板重构 (Dashboard 2.0)**：
    - **TOEFL 倒计时**：直观展示距离 2026-05-10 的剩余天数。
    - **可视化图表**：引入 Recharts 实现环形图 (状态分布)、条形图 (类型分布)。

### 🚧 核心痛点 (Critical Issues)

1.  **开发环境热重载限制**：
    - 修改 Prisma Schema 后，必须重启 Next.js 开发服务器 (`npm run dev`) 才能使新生成的 Client 生效，否则会报错 "Unknown argument"。

### 📅 下一步计划 (Next Steps)

1.  **实现 SM-2 算法**：利用 `ReviewLog` 数据计算记忆保留率。
2.  **移动端 Library 优化**：分类标签在手机上可能略显拥挤，需要优化布局。

---

## 2026-01-25
