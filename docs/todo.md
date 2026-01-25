# DeepListener 项目待办事项 (TODO)

## ✅ 已完成 (Done)
- [x] **多 Provider 支持**：Deepgram, OpenAI, Google。
- [x] **网络代理修复**：Node.js `undici` 代理方案。
- [x] **交互重构**：右键平移、滚轮缩放、智能圈选。
- [x] **Shadowing v2**：双波形对比、内存切片、流程优化。
- [x] **归档系统**：软删除素材。
- [x] **盲听模式**：文本模糊开关。

## 🚧 待解决/优化 (Pending)
- [ ] **PWA 安装**：Android 局域网 http 环境下无法显示图标 (需 HTTPS)。
- [ ] **波形圈选偶发异常**：虽然已修复大部分，但在极快操作下仍有微小概率出现选区漂移。
- [ ] **Shadowing 内部 Capture**：目前在 Shadowing 模式下无法直接添加笔记，需退出后操作。

## 📅 未来规划 (Roadmap)
- [ ] **SRS 算法升级**：引入 SM-2 算法。
- [ ] **移动端适配优化**：针对手机触摸屏优化波形拖拽手感。
- [ ] **数据云同步**：迁移至 Supabase。

---
*Last Updated: 2026-01-25*