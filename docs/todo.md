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
- [x] **Shadowing 增强**：进度显示、循环播放、打断机制优化、下一句自动重置。
- [x] **练习页编辑**：支持在播放页直接修改 Track 标题和元数据。

## 🚀 托福/C1 进阶功能 (New Ideas A2->C1)
- [ ] **语境生词本 (Contextual Audio Vocab)**: 关联单词与 3-5秒音频切片，支持“只听声音”猜词复习模式。
- [ ] **听写/挖空模式 (Dictation/Cloze)**: AI 智能挖空实词/难点词，强制拼写输入，针对性训练听音辨义。
- [ ] **AI 托福出题官 (AI Examiner)**: 利用 AI 分析全文，自动生成托福格式选择题（主旨/细节/推断）及逻辑大纲。
- [ ] **口语/跟读 AI 评分 (Speaking Assessment)**: ASR 识别对比 Shadowing 录音与原文准确率，分析语速与停顿。

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
*Last Updated: 2026-02-02*
