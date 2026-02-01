# 开发日志 (Dev Log)

## 2026-02-01

### ✅ 今日成就 (Completed)

1.  **学习时长统计 (Study Time Tracking)**：
    - **全自动计时**：实现了基于“心跳包”机制的精准计时系统。
    - **智能活跃判定**：结合了媒体播放状态检测与用户交互（鼠标/键盘）检测。只要音频在播放，或用户有操作，就会自动累计时长；超过 60 秒无操作且无播放则暂停计时。
    - **多模式区分**：精准区分 **LISTENING** (精听), **SHADOWING** (跟读), **REVIEW** (复习) 三种学习状态。
    - **数据可视化**：在 Dashboard 新增了 **C1 Fluency Journey** (400小时进度条) 和 **Daily Study Log** (每日分类统计表)。

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
    - **立即打断优化**：修复了点击 "Rec Again" 时无法立即终止当前录音或播放的问题。
    - **循环播放间隔**：优化了 Shadowing 的单句循环逻辑，在每次播放结束后增加 1 秒暂停。
    - **录音状态泄漏修复**：利用 `useRef` 解决了切换句子时，上一个句子的录音状态泄漏的 Bug。
    - **布局对称性优化**：将 Loop 按钮移至 MiniWavePlayer 内部右侧，与左侧播放按钮对称。
    - **播放按钮复位**：将 "Start Challenge" 按钮恢复至底部控制区。

3.  **性能大优化 (Performance Fixes)**：
    - **数据库索引**：为 `Track` 和 `ReviewItem` 的高频查询字段 (`status`, `isArchived`, `createdAt`) 添加了索引。
    - **分页限制**：Vault 和 Review 页面增加了 `take` 限制 (100/50)。
    - **流式渲染 (Streaming)**：全站引入 `Suspense` + `Skeleton`，实现了页面秒切。

4.  **Shadowing 模式增强 (Shadowing 2.0)**：
    - **交互优化**：实现了“打断式”交互。
    - **循环功能**：新增了单句循环播放按钮。
    - **进度感知**：显示当前句子进度。

5.  **练习页功能扩展**：
    - **编辑功能**：在播放页顶部增加了 Edit 按钮。
    - **状态流升级**：`Unlearnt` 设为默认状态。

6.  **Analytics 面板重构 (Dashboard 2.0)**：
    - **TOEFL 倒计时**：直观展示距离 2026-05-10 的剩余天数。
    - **可视化图表**：引入 Recharts 实现环形图、条形图。

### 🚧 核心痛点 (Critical Issues)

1.  **开发环境热重载限制**：
    - 修改 Prisma Schema 后，必须重启 Next.js 开发服务器 (`npm run dev`) 才能使新生成的 Client 生效。

### 📅 下一步计划 (Next Steps)

1.  **实现 SM-2 算法**：利用 `ReviewLog` 数据计算记忆保留率。
2.  **移动端 Library 优化**：分类标签在手机上可能略显拥挤，需要优化布局。