# DeepListener 项目待办事项 (TODO)

## ✅ 已完成 (Done)
- [x] **多 Provider 支持**：Deepgram, OpenAI, Google。
- [x] **网络代理修复**：Node.js `undici` 代理方案。
- [x] **交互重构**：右键平移、滚轮缩放、智能圈选。
- [x] **Shadowing v2**：双波形对比、内存切片、流程优化。
- [x] **归档系统**：软删除素材。
- [x] **盲听模式**：文本模糊开关。
- [x] **变速播放**：0.5x - 2.0x 播放速度控制。
- [x] **难度分级**：笔记支持 Easy/Medium/Hard 难度标注。
- [x] **已学状态**：素材支持标记为 "Is Learnt"。
- [x] **复习系统 (基础)**：基于 Review Log 的复习打分后端。
- [x] **素材笔记**：Track 级别的全局笔记 (支持 Markdown)。
- [x] **分类标签**：素材支持多 Category 标签管理 (通过 TrackType/Topic).
- [x] **学习状态流**：扩展已学状态为精听/分析/Shadowing/Paraphrase等多种状态。
- [x] **Analytics 面板**：TOEFL 倒计时、状态分布环形图、进度条。

## 🚧 待解决/优化 (Pending)
- [ ] **PWA 安装**：Android 局域网 http 环境下无法显示图标 (需 HTTPS)。
- [ ] **波形圈选偶发异常**：虽然已修复大部分，但在极快操作下仍有微小概率出现选区漂移。
- [ ] **Shadowing 内部 Capture**：目前在 Shadowing 模式下无法直接添加笔记，需退出后操作。

## 📅 未来规划 (Roadmap)
- [ ] **导入视频**：支持导入视频文件。
- [ ] **SRS 算法升级**：引入 SM-2 算法。
- [ ] **移动端适配优化**：针对手机触摸屏优化波形拖拽手感。
- [ ] **数据云同步**：迁移至 Supabase。

---
*Last Updated: 2026-01-30*