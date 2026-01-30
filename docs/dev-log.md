# 开发日志 (Dev Log)

## 2026-01-30

### ✅ 今日成就 (Completed)

1.  **复习系统 (Review System v1)**：
    - **后端架构**：实现了 `/api/review/log` 接口，支持记录用户的复习行为（Duration, Rating, ReviewType）。
    - **数据模型**：新增 `ReviewLog` 表，关联 `Track` 和 `User` (Implicit)。
    - **前端集成**：`ReviewClient` 初步对接了复习打分逻辑。

2.  **素材管理增强 (Library Enhancements)**：
    - **Track Notes**：素材现在拥有全局笔记字段 (`note`)，支持 Markdown 编辑。
    - **Categories**：实现了多对多标签系统 (`TrackCategory`)，方便素材分类管理。
    - **重命名功能**：终于支持修改素材标题了 (`RenameTrackModal`)。

3.  **UI 组件库**：
    - **NoteEditor**：封装了一个干净的笔记编辑器，支持自动保存状态。
    - **Library UI**：重构了列表视图，展示标签和笔记摘要。

### 🚧 核心痛点 (Critical Issues)

1.  **SRS 算法未实装**：
    - 虽然有了 Review Log，但目前还没根据 SM-2 算法计算 Next Review Date。目前的复习队列可能还是线性的或者随机的。

### 📅 下一步计划 (Next Steps)

1.  **实现 SM-2 算法**：利用 `ReviewLog` 数据计算记忆保留率。
2.  **移动端 Library 优化**：分类标签在手机上可能略显拥挤，需要优化布局。

---

## 2026-01-25

### ✅ 今日成就 (Completed)

1.  **架构大重构**：
    - 将巨型组件 `AudioPlayer` 和 `ShadowingConsole` 拆分为多个自定义 Hook (`useWaveSurfer`, `useAutoScroll`, `useShadowingWorkflow`) 和子组件。
    - 严格遵循 `GEMINI.md` 的 OOP 原则和维护性指标。

2.  **功能增强**：
    - **笔记系统**：增加了“难度分级” (Normal, Hard, Very Hard) 和火焰图标可视化。
    - **标签扩展**：增加了“听错单词”和“不理解”两个核心归因标签。
    - **效率工具**：增加了“一键复制文本”按钮，并增大了移动端操作热区。
    - **交互闭环**：实现了 Shadowing 模式下的笔记状态实时同步。

3.  **性能优化 (初步)**：
    - 引入了 `useMemo` 稳定句子数组。
    - 实现了“零渲染”计时器（直接操作 DOM 更新时间显示）。

### 🚧 核心痛点 (Critical Issues)

1.  **音频播放卡顿 (Persistent Stuttering)**：
    - **现象**：播放过程中出现周期性卡顿，尤其在句子切换瞬间最为明显。
    - **已尝试**：Memoization, Throttling, Direct DOM manipulation, `useMemo` 稳定数据。
    - **结论**：目前的优化虽然减少了渲染压力，但并未完全消除主线程阻塞。可能是 WaveSurfer 插件或 React 19 的某些并发特性导致的冲突。

2.  **圈选交互不精准**：
    - **现象**：圈选区域有时会自动跳回句首。
    - **原因**：Regions 插件事件与自定义平移逻辑的优先级冲突。

### 📅 明日作战计划 (Next Steps)

1.  **性能彻底清算**：
    - 考虑引入 **虚拟滚动 (Virtual List)**。如果句子列表过长，DOM 节点的增量更新依然会造成阻塞。
    - 尝试将 WaveSurfer 的事件回调完全移出 React 状态流，改用全局 Event Bus。
2.  **Shadowing 稳定性**：
    - 解决长音频下的切片性能问题。
3.  **SRS 算法**：
    - 接入 SM-2 算法，使复习计划更科学。

---
*Deeply apologetic for the performance struggles today. We will kill this lag tomorrow.*
