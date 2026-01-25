# 开发日志 (Dev Log) - 2026-01-25

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
    - **Vault**：实现了生句库的列表页，支持删除和编辑笔记。
    - **Sync**：增加了 `npm run sync` 增量同步脚本。
    - **Archive & Rename**：实现了素材的归档、物理删除和重命名功能。
    - **UI 适配**：彻底优化了移动端布局（导航栏横滚、标题换行、按钮响应式）。

## 🚧 待解决/调试中 (Pending / Known Issues)

1.  **PWA 安装**：
    - Android 局域网 http 环境下无法显示桌面图标。
    - *建议部署到 HTTPS 环境 (如 Vercel) 解决。*

2.  **音频切片偶发卡顿**：
    - Shadowing 模式下首次进入可能需要几秒钟加载音频，已通过预加载优化，但大文件仍需注意。

## 📅 明日计划 (Next Steps)

1.  **复习算法升级**：目前的 SRS 算法比较原始，考虑引入 SM-2。
2.  **数据可视化**：在 Dashboard 增加“遗忘曲线”图表。

---
*Good Night! Tomorrow is another day of coding.*