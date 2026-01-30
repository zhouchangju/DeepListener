# 开发日志 (Dev Log)

## 2026-01-30

### ✅ 今日成就 (Completed)

1.  **学习状态流升级 (Advanced Status Workflow)**：
    - 废弃了单一的 `isLearnt` 布尔值，升级为多状态流 (`status` Enum)。
    - 支持状态：**精听 (Intensive)**, **分析 (Analysis)**, **Shadowing**, **倍速 Shadowing**, **Paraphrase**, **已学习 (Learnt)**。
    - 在 Library 列表页实现了带颜色的状态 Badge 和下拉切换菜单。

2.  **Analytics 面板重构 (Dashboard 2.0)**：
    - **TOEFL 倒计时**：直观展示距离 2026-05-10 的剩余天数。
    - **可视化图表**：引入 Recharts 实现环形图 (状态分布)、条形图 (类型分布)。
    - **进度追踪**：增加了 TOEFL 5.0 进度条 (基于 100 个已学素材的目标)。

3.  **复习系统 (Review System v1)**：
    - **后端架构**：实现了 `/api/review/log` 接口，支持记录用户的复习行为（Duration, Rating, ReviewType）。
    - **数据模型**：新增 `ReviewLog` 表，关联 `Track` 和 `User` (Implicit)。
    - **前端集成**：`ReviewClient` 初步对接了复习打分逻辑。

4.  **素材管理增强 (Library Enhancements)**：
    - **Track Notes**：素材现在拥有全局笔记字段 (`note`)，支持 Markdown 编辑。
    - **Categories**：实现了多对多标签系统 (`TrackCategory`)，方便素材分类管理。
    - **重命名功能**：终于支持修改素材标题了 (`RenameTrackModal`)。

### 🚧 核心痛点 (Critical Issues)

1.  **SRS 算法未实装**：
    - 虽然有了 Review Log，但目前还没根据 SM-2 算法计算 Next Review Date。目前的复习队列可能还是线性的或者随机的。

### 📅 下一步计划 (Next Steps)

1.  **实现 SM-2 算法**：利用 `ReviewLog` 数据计算记忆保留率。
2.  **移动端 Library 优化**：分类标签在手机上可能略显拥挤，需要优化布局。

---

## 2026-01-25