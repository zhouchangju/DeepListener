# 开发日志 (Dev Log) - 2026-01-24

## ✅ 今日成就 (Completed)

1.  **架构升级**：
    - 实现了多 Provider 模式 (`src/lib/transcription/factory.ts`)，支持 OpenAI, Google Gemini, Deepgram 自由切换。
    - 接入了 **Deepgram (Nova-2)**，彻底解决了 Google Gemini 的“时间轴幻觉”问题。

2.  **网络攻坚**：
    - 彻底解决了 Node.js 18+ 原生 `fetch` 不走系统代理的问题，引入 `undici` 全局调度器。
    - 产出了技术文档 `docs/solving-node-proxy-timeout.md`。

3.  **交互重构 (AudioPlayer)**：
    - **视觉**：回归清新的浅色主题，增加了 Timeline 和 Minimap。
    - **操作**：
        - 实现了 **右键拖拽平移** (突破 Shadow DOM 限制)。
        - 实现了 **Cmd/Ctrl + 滚轮缩放**。
        - 实现了 **Shift + 滚轮平移**。
        - 实现了 **圈选即播 + 自动循环** 的精听逻辑。
    - **同步**：重写了列表滚动逻辑，确保无论是点击、播放还是圈选，当前句子都能强制居中。

4.  **功能完善**：
    - 实现了 **Vault (生句库)** 的列表页，支持删除和编辑笔记。
    - 增加了 **数据同步** (`npm run sync`) 脚本。

## 🚧 待解决/调试中 (Pending / Known Issues)

1.  **PWA 安装**：
    - Android 局域网环境下无法显示桌面图标。
    - *暂缓处理，优先保证核心功能。*

2.  **音频可视化偶发卡顿**：
    - 在某些极端长句或复杂操作下，列表滚动偶尔会失效（虽然已多次修复）。
    - *需在 Deepgram 数据下进一步观察表现。*

3.  **断句体验**：
    - Deepgram 的断句有时过于细碎（半句一断）。
    - *计划：在后端引入简单的句子合并逻辑（基于标点符号）。*

## 📅 明日计划 (Next Steps)

1.  **验证 Deepgram 数据**：重新上传音频，确认 Deepgram 的时间轴是否完美解决了“卡住”和“对不上”的问题。
2.  **句子合并算法**：优化 `src/lib/transcription/deepgram-provider.ts`，将碎句合并为完整意群。
3.  **快捷键增强**：增加 `J` (后退), `K` (暂停), `L` (前进) 等键盘流操作。
4.  **复习算法升级**：目前的 SRS 算法比较原始，考虑引入 SM-2。

---
*Good Night! Tomorrow is another day of coding.*
