# Ordinary Learner First Success OpenSpec

**当前状态：** 核心功能已进入实施并完成部分验收；逐项事实、证据和未关闭闸门见 [implementation-status.md](./implementation-status.md)。以下 OpenSpec 文件仍保留目标状态、设计约束和完整任务分解。

本目录定义 DeepListener 面向非技术英语学习者的“首次成功”增量变更。所有内容都是目标态和执行计划，不代表已经实现。

## 必读文档

1. [Proposal](./proposal.md)：为什么做、第一性原理、范围、数据安全和与现有 OpenSpec 的关系。
2. [PRD](./prd.md)：目标用户、首次旅程、需求、KPI、发布门槛和人工决策。
3. [Implementation Design](./design.md)：状态机、启动门控、Demo、Provider、字幕、可恢复导入、信任边界、对抗矩阵和回滚。
4. [Delta Specification](./specs/ordinary-learner-first-success/spec.md)：OFS-001 至 OFS-010 的 Given/When/Then 验收要求。
5. [AI-executable Tasks](./tasks.md)：任务依赖、文件所有权、验证、证据、工作量和可并行波次。
6. [Implementation Status](./implementation-status.md)：当前代码对账、质量证据、人工闸门和剩余工作。

## 执行入口

后续开始实现时必须从 `tasks.md` 的 T000 开始。不得跳过 OpenSpec 对账直接编码，也不得把 HG-01 至 HG-04 的人工闸门交给 AI 自行关闭。
