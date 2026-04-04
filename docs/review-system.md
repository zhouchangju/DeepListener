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

### 特殊逻辑：Again/Hard 的短间隔重学（Anki-style Relearning）
在 DeepListener 的实现中（`src/app/api/review/grade/route.ts`），实现了类似 Anki 的短间隔重学机制：
- 如果选择 **Again**，下次复习时间设置为 **当前时间 + 5 分钟**。
- 如果选择 **Hard**，下次复习时间设置为 **当前时间 + 15 分钟**。
- 这允许用户在当天内多次复习困难内容，强化记忆。

**实现细节：**
1. 服务端设置短间隔（覆盖 FSRS 默认的长间隔）
2. 队列查询通过 `ReviewLog.rating` 精确判断：
   - 今天已复习且评级为 Good/Easy (rating 3/4) 的卡片：**不显示**（避免重复）
   - 今天已复习且评级为 Again/Hard (rating 1/2) 的卡片：**显示**（重学阶段，时间到后重新出现）
   - 未复习过的卡片：正常显示

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

## 复习界面统计说明

复习页面（`/review`）显示两个核心统计数据：

### Reviewed（已复习）
- **定义**：页面加载时，统计今天已有 `ReviewLog` 的项目数（按 `reviewItemId` 去重）
- **数据来源**：从数据库 `ReviewLog` 表统计（去重）
- **更新时机**：
  - 页面加载时：统计数据库中今天的复习记录
  - 当前会话内每次评分后：前端先实时 `+1`，刷新页面后再与服务端统计重新同步

### In Queue（待复习）
- **定义**：当前服务端返回的待复习项目数（包含时间已到的重学卡片）
- **数据来源**：从数据库查询所有 `due <= 当前时间` 且 `isArchived = false` 的项目，再结合今日评分记录过滤
- **更新时机**：
  - 页面加载时：当前队列长度
  - 每次评分后：实时 -1
  - 刷新页面：重新从数据库获取最新队列（Again/Hard 卡片时间到后会重新出现）

### 关键设计逻辑

**服务端查询（`src/app/review/page.tsx`）：**
```typescript
// 1. 统计今天已复习的项目及其最新评分
const todayReviews = await prisma.reviewLog.groupBy({
  by: ['reviewItemId'],
  where: { createdAt: { gte: 今天0点, lte: 今天23:59 } },
  _max: { rating: true },
});

// 2. 识别重学阶段的卡片（Again=1 或 Hard=2）
const relearningItemIds = todayReviews
  .filter(r => r._max.rating === 1 || r._max.rating === 2)
  .map(r => r.reviewItemId);

// 3. 查询待复习队列
const rawItems = await prisma.reviewItem.findMany({
  where: {
    due: { lte: 当前时间 },  // 只显示当前已经到期的卡片
    isArchived: false,
    OR: [
      { id: { notIn: todayReviewedIds } },  // 未复习过
      { id: { in: relearningItemIds } }     // 或处于重学阶段
    ]
  }
});
```

**为什么需要区分重学卡片？**
- Again/Hard 设置了短间隔（5-15分钟），时间到后应重新出现
- Good/Easy 已成功复习，今天不应重复出现
- 通过 ReviewLog.rating 精确控制显示逻辑

**评分处理（`src/app/api/review/grade/route.ts`）：**
1. 创建 `ReviewLog` 记录（保存 rating 信息）
2. 更新 `ReviewItem` 的 `stability`、`dr`、`due` 等字段
3. **Again/Hard 特殊处理**：设置短间隔（5/15分钟），允许当天重学

### 前端实时更新

复习客户端（`ReviewClient.tsx`）在每次评分后：
- `reviewed++`：增加已复习计数
- `remaining--`：减少待复习计数
- 刷新页面后，数据会与服务端重新同步；因此页面内的即时数字以“快速反馈”为主，最终以刷新后的服务端统计为准

## 用户界面与交互设计

### 界面布局

复习页面（`/review`）采用简洁的卡片式设计：

1. **进度统计栏**：页面顶部显示今日复习统计
   - Reviewed（已复习）：今日已完成的不同项目数
   - In Queue（待复习）：当前队列剩余项目数
   - 播放统计：总播放次数、日均播放次数

2. **主卡片区域**：
   - 播放按钮：大圆形按钮，点击播放当前句子音频
   - 答案区域：默认隐藏，按空格键或点击按钮显示/隐藏
     - 句子文本（支持音标注记显示）
     - 标签（ErrorTag）
     - 用户笔记
   - 帮助图标：右上角问号图标，悬停或点击查看快捷键指南

3. **操作按钮区**（CardFooter）：
   - Reveal/Hide Answer 按钮：切换答案内容显示
   - 四个评分按钮：Again (1) / Hard (2) / Good (3) / Easy (4)

### 交互逻辑

#### 默认行为
- **自动播放**：切换到新卡片时延迟 0.5 秒后自动播放音频
- **难度按钮始终可见**：无需先显示答案，可直接点击评分进入下一张
- **答案内容独立控制**：通过空格键或按钮切换句子文本/笔记的显示

#### 键盘快捷键

| 按键 | 功能 | 说明 |
|:---|:---|:---|
| **Space** | 切换答案显示 | 显示/隐藏句子文本、标签、笔记 |
| **R** | 重播音频 | 立即重新播放当前句子的音频 |
| **1** | Again 评分 | 完全遗忘，5分钟后重学 |
| **2** | Hard 评分 | 勉强想起，15分钟后重学 |
| **3** | Good 评分 | 正常想起，按标准间隔下次复习 |
| **4** | Easy 评分 | 瞬间想起，大幅延长下次复习间隔 |

#### 移动端适配
- **帮助提示**：移动端通过点击问号图标显示（而非悬停）
- **触摸优化**：按钮高度增加，便于触摸操作
- **响应式布局**：自动适配不同屏幕尺寸

### 设计原则

1. **减少操作步骤**：难度按钮始终可见，可快速连续评分
2. **可选查看详情**：答案内容独立控制，不影响评分流程
3. **多维度反馈**：
   - 听觉：自动播放音频
   - 视觉：答案内容（可选）
   - 记忆：FSRS 算法评分
4. **容错机制**：
   - R键快速重播，支持反复听力
   - Again/Hard 短间隔重学，允许当天内多次练习
   - 显示/隐藏答案，控制提示信息

## 参考资料
- [FSRS-4.5 算法论文](https://github.com/open-spaced-repetition/fsrs-rs/blob/main/algorithm.md)
- [ts-fsrs 实现库](https://github.com/open-spaced-repetition/ts-fsrs)
