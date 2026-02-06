# 复习系统与 FSRS 算法说明

## 概述

DeepListener 采用 **FSRS-4.5** (Free Spaced Repetition Scheduler) 算法来优化学习者的记忆留存。相比传统的 SM-2 算法，FSRS 能够根据用户的复习历史动态调整记忆曲线，从而在减少复习次数的同时提高留存率。

## 核心概念

### 1. 记忆状态 (Memory States)
每个复习项包含三个核心指标：
- **稳定性 (Stability, S)**：记忆持续的天数。稳定性越高，遗忘越慢。
- **难度 (Difficulty, D)**：该项本身的难度。范围 1-10，分值越高表示该项越难掌握。
- **可提取性 (Retrievability, R)**：当前时刻回忆起该项的概率。

### 2. 目标留存率 (Target Retention)
DeepListener 默认设置 `request_retention: 0.9`。这意味着算法会调整复习间隔，使得用户在下次复习时有 90% 的概率能回忆起来。

## 评分机制 (Again, Hard, Good, Easy)

在复习时，用户根据自己的回忆质量选择四个选项之一：

| 选项 | 对应 Rating | 机制说明 | 对算法的影响 |
| :--- | :--- | :--- | :--- |
| **Again** | 1 (Lapse) | 完全遗忘，需要重新学习。 | **稳定性重置**（降至最低）；**难度增加**；**遗忘次数 (Lapse) +1**。 |
| **Hard** | 2 (Hard) | 勉强想起，伴随巨大的困难。 | **稳定性缓慢增长**；**难度增加**。 |
| **Good** | 3 (Good) | 正常想起，稍有犹豫。 | **稳定性标准增长**；**难度保持稳定**。 |
| **Easy** | 4 (Easy) | 瞬间想起，毫无压力。 | **稳定性大幅增长**；**难度降低**。 |

### 特殊逻辑：Again 的复习时间
在 DeepListener 的实现中（`src/app/api/review/grade/route.ts`），为了简化“重学阶段”的处理：
- 如果选择 **Again**，下次复习时间会被固定设置为 **明天凌晨 (00:00:00)**。
- 这确保了用户能在第二天第一时间巩固遗忘的内容，而不是由算法计算一个可能过长或过短的间隔。

## 复习时间计算规则

### 1. 间隔计算 (Interval)
复习间隔（天数）由稳定性 (S) 和目标留存率 (R) 决定。公式逻辑大致为：
`Interval = S * ln(R_target) / ln(R_current)`
在 `ts-fsrs` 中，它会根据 90% 的目标留存率自动推导出最优间隔。

### 2. 稳定性更新 (Stability Update)
- **成功复习 (Hard, Good, Easy)**：新的稳定性基于当前的稳定性、难度、可提取性以及复习时的评分进行计算。评分越高，稳定性增长越快。
- **失败复习 (Again)**：稳定性会根据算法内部预设的重置参数进行大幅削减，进入重学周期。

### 3. 难度更新 (Difficulty Update)
难度 D 会根据评分进行动态微调：
- **Again/Hard**：增加难度值。
- **Good**：基本保持不变。
- **Easy**：降低难度值。

## 自动化评分建议 (Adaptive Suggestion)

系统内置了一个 `suggestRating` 逻辑（位于 `src/lib/fsrs.ts`），可以根据响应时间自动建议评分：
- **错误/未想起** → `Again`
- **想起 & 耗时 < 2秒 & 稳定性 > 7** → `Easy`
- **想起 & 耗时 < 5秒** → `Good`
- **想起 & 耗时 > 5秒** → `Hard`

## 数据指标监控

你可以通过以下字段了解每个句子的状态：
- `stability`：记忆能撑多久（天）。
- `dr` (Difficulty Rating)：该句子的绝对难度 (1-10)。
- `retrieval`：累计成功回忆次数。
- `lapse`：累计遗忘次数。

## 参考资料
- [FSRS-4.5 算法论文](https://github.com/open-spaced-repetition/fsrs-rs/blob/main/algorithm.md)
- [ts-fsrs 实现库](https://github.com/open-spaced-repetition/ts-fsrs)