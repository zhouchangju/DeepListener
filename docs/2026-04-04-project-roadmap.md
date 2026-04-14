# DeepListener 价值优先 Roadmap

> 更新时间：2026-04-04
> 基础文档：[project-value-and-optimization-analysis.md](./2026-04-04-project-value-and-optimization-analysis.md)
> 说明：这份 roadmap 按“价值大小 + 依赖关系”排序，不按实现成本排序。

## 一、Roadmap 目标

DeepListener 的目标不应该停留在“精听工具”或“带点 SRS 的音频练习器”。

更合适的目标是：

> 把 DeepListener 做成一个高阶英语听力训练操作系统。

这个系统要同时解决 3 个问题：

1. 你为什么听不懂
2. 你下一步最该练什么
3. 你是否真的在变强

所以这份 roadmap 的判断标准只有一个：

> 哪些功能和哪些架构升级，最能提高训练效果、提高长期复利、提高系统可持续性。

## 二、Roadmap 设计原则

### 1. 先做“训练引擎”，再做“外围功能”

高价值项目的核心不是功能数量，而是训练系统的有效性。  
优先级应始终向下面这些能力倾斜：

- 诊断
- 推荐
- 反馈
- 评估
- 长期画像

### 2. 先做“可复利的数据结构”，再做“短期炫功能”

如果一个功能不能沉淀结构化数据，它的长期价值通常有限。  
真正高价值的增量，应该能反过来提升：

- 推荐质量
- 诊断准确性
- 训练编排
- Dashboard 洞察

### 3. 先把系统从“页面驱动”升级为“领域驱动”

当前项目已经进入多子系统阶段。继续沿着“页面里堆逻辑、route 里堆业务”的方式扩展，会很快失控。  
所以 roadmap 里有一部分不是产品功能，而是平台级重构，这不是技术洁癖，而是为了让后续高价值功能真的能落地。

## 三、北极星结果

如果这条 roadmap 执行得足够好，DeepListener 最终应该具备以下能力：

### 产品层

- 能为你生成个性化训练队列，而不是让你手动挑素材
- 能指出你最真实的听力薄弱点，而不是只显示行为数据
- 能给 Shadowing 提供可操作的反馈，而不是只让你自己听回放
- 能把精听、跟读、复习、泛听、总结串成一个完整训练闭环

### 数据层

- 能沉淀结构化的错误数据
- 能沉淀结构化的训练结果数据
- 能形成个人听力能力画像
- 能用长期数据驱动训练推荐

### 工程层

- 核心业务逻辑可以脱离 page/route 单独测试
- 复杂页面不会继续无边界膨胀
- 长耗时任务不依赖同步请求链路
- 指标、推荐、导出、训练模式都能持续扩展

## 四、阶段总览

这份 roadmap 分成 4 个阶段：

### Phase 0：平台基础重构

目标：把系统从“功能集合”升级成“可扩展训练平台”

### Phase 1：训练效果增强

目标：显著提升你每次训练的收益

### Phase 2：个体化智能

目标：让系统开始理解“你是谁、你哪里弱、你该练什么”

### Phase 3：长期复利平台

目标：把 DeepListener 从训练工具升级为长期学习资产系统

---

## 五、Phase 0：平台基础重构

这一阶段不是最炫的，但几乎所有高价值功能都依赖它。

### 0.1 建立明确的领域边界

建议把系统拆成以下领域：

- `ingestion`：上传、转录、句子生成
- `practice`：精听、句级播放、盲听、标注
- `shadowing`：录音、对齐、反馈
- `vault`：收藏、标签、笔记、导出
- `review`：FSRS、队列、评分、重学
- `analytics`：学习时长、成长画像、推荐依据

为什么必须先做：

- 当前功能已经跨多个子系统
- 继续按页面和 route 自由扩张，会让后续每次改动都碰一大片逻辑

当前最明显的热点文件：

- [VaultListClient.tsx](/Users/leozhou/git/DeepListener/src/app/vault/VaultListClient.tsx)
- [ReviewClient.tsx](/Users/leozhou/git/DeepListener/src/app/review/ReviewClient.tsx)
- [ShadowingConsole.tsx](/Users/leozhou/git/DeepListener/src/components/feature/ShadowingConsole.tsx)
- [route.ts](/Users/leozhou/git/DeepListener/src/app/api/audio/export/route.ts)
- [page.tsx](/Users/leozhou/git/DeepListener/src/app/dashboard/page.tsx)

### 0.2 引入服务层

应该把核心业务从 API route 中抽离出来，形成可复用的 service/domain 层。

优先抽离的服务：

- transcription ingestion service
- vault item save/update service
- review grading service
- export planning service
- study time aggregation service
- dashboard aggregation service

价值：

- 核心逻辑可以独立测试
- 将来可以复用于后台任务、CLI、worker、cron
- 能把“业务规则”从 HTTP 入口里解耦出来

### 0.3 引入统一输入校验和错误模型

所有 API 应统一使用 schema 校验。

应该覆盖：

- request body
- query params
- response shape
- domain validation

价值：

- 降低脏数据进入 DB 的概率
- 未来接移动端、CLI、后台任务时更稳

### 0.4 把长耗时链路任务化

以下链路都应该升级为异步 job：

- 上传后转录
- 批量导出音频
- 大规模统计更新
- 将来可能出现的语义索引 / 搜索索引 / Shadowing 分析任务

价值：

- 系统稳定性显著提高
- 用户体验更好
- 为智能功能预留执行空间

### 0.5 修正和统一核心数据模型

重点清理 3 类问题：

1. 遗留概念与实际使用不一致  
例如 `Category/TrackCategory` 与 `trackType/trackTopic` 并存。

2. 业务语义混淆  
例如主观 `difficulty` 与算法难度概念容易混淆。

3. 指标字段职责不清  
例如 `due` 与 `nextReview` 的关系需要重新定义。

价值：

- 后续推荐系统和 Dashboard 会更可靠
- 避免未来做智能功能时概念打架

### 0.6 统一测试体系

从当前的 targeted regression tests，升级为三层保护网：

- service/domain unit tests
- route contract tests
- critical workflow E2E

必须被保护的关键链路：

- 上传 -> 转录 -> 生成句子
- 练习 -> 收藏 -> 更新 Vault
- Review grading -> next due -> queue filtering
- Export filtering -> segment planning -> audio generation

---

## 六、Phase 1：训练效果增强

这是第一批最值得新增的高价值功能。

### 1.1 结构化诊断系统

把现在的 `ErrorTag` 升级为真正的诊断模型。

建议能力：

- 主因 / 次因
- 感知层 / 词汇层 / 语法层 / 语篇层 / 注意力层
- 初次判断与复盘修正
- 与复习结果联动

为什么是第一优先级：

- 它是推荐系统、能力画像、训练路径和统计洞察的共同基础
- 它直接决定系统到底懂不懂你的问题

### 1.2 个性化训练队列

从“用户手动挑练习对象”升级成“系统主动安排训练对象”。

建议包含：

- 今日训练计划
- 今日精听句子队列
- 今日 Shadowing 队列
- 今日复听泛听包
- 今日复习队列之外的专项训练队列

推荐逻辑可以综合：

- 最近错误类型
- 最近 Again/Hard 数据
- 主题分布
- 稳定度
- 新旧内容比例

价值：

- 降低选择成本
- 增强长期使用体验
- 让系统从工具变成教练

### 1.3 Shadowing 自动反馈

当前 Shadowing 已经具备很强的训练基础，但缺少“客观反馈层”。

目标能力：

- 节奏差异
- 停顿差异
- 语速差异
- 重音落点差异
- 局部重练建议

长期价值极高，因为它把 Shadowing 从“回放工具”升级为“反馈式训练器”。

### 1.4 听写 / 挖空 / 重建句子模式

这条线的作用是提升“精确解析能力”。

推荐子模式：

- Dictation
- Cloze
- Sentence reconstruction
- Gist vs detail
- Retelling / paraphrase

价值：

- 能暴露“以为听懂”的错觉
- 让训练从输入感知走到结构解析和输出验证

### 1.5 成长型 Dashboard

当前 Dashboard 已经有数据，但还不够“训练决策导向”。

Phase 1 的 Dashboard 目标不是加更多图，而是加更有行动意义的结论：

- 最近 7 天最常见错误类型
- 最需要补强的主题
- 最近最值得复习的失败模式
- Shadowing 提升趋势
- 高收益训练区 / 低收益训练区

---

## 七、Phase 2：个体化智能

这一阶段的目标是：让系统开始真正理解你。

### 2.1 听力能力画像

画像维度建议包括：

- 错误类型分布
- 主题分布
- 语速耐受度
- 长句耐受度
- Shadowing 偏差类型
- 复习留存能力
- 高频失误句法模式

价值：

- 系统能告诉你“你哪里弱”
- 训练编排不再只是基于到期时间

### 2.2 个体化难度建模

把“主观难度”和“系统估计难度”区分开。

系统估计难度可基于：

- 初次重播次数
- 收藏概率
- Again/Hard 比例
- Shadowing 失败次数
- 同类句迁移表现

价值：

- 能判断“这句客观难”还是“这句对你特别难”
- 推荐系统更聪明

### 2.3 检索与搜索升级

建议升级为三层检索：

- 精确过滤：标签、主题、难度、时间、状态
- 全文检索：句子、笔记、Track
- 相似检索：找相似的句子、相似的错误模式、相似的主题样本

价值：

- 数据越多，检索越重要
- 它是知识图谱和智能推荐的基础设施

### 2.4 智能泛听包生成

导出不应只是“把音频拼起来”，而应成为训练编排的一部分。

建议生成方式：

- 旧弱点复习包
- 今日训练延伸包
- 主题巩固包
- 通勤 20 分钟包
- 新旧混合包

价值：

- 把 Vault 从静态仓库变成动态训练源
- 极大提高碎片时间利用效率

### 2.5 推荐与策略层

最终系统应该能输出建议，而不是只展示指标。

例如：

- 你最近真正的问题不是词汇，是 function words 的感知缺失
- 你应该减少新输入，先巩固中期稳定度不足内容
- 你在学术讲座上的问题集中在长修饰链，而不是词汇本身

这是 DeepListener 从工具走向“听力教练”的关键跃迁。

---

## 八、Phase 3：长期复利平台

这一阶段决定 DeepListener 是否能成为长期资产系统。

### 3.1 课程化训练路径

把 Track 组织升级为“主题路径”和“能力路径”。

可以围绕：

- 校园生活
- 学术讲座
- 社会科学
- 自然科学
- 特定考试场景

每条路径都应该包含：

- 入门内容
- 高频问题模式
- 递进式挑战
- 阶段复盘

### 3.2 句子知识图谱

把句子之间建立可计算关系：

- 同主题
- 同语音现象
- 同结构难点
- 同错误模式
- 同复习失败历史

价值：

- 推荐会更智能
- 训练能做迁移和泛化

### 3.3 个人成长档案

做成真正的长期学习档案：

- 每周总结
- 能力迁移记录
- 最难句子攻克记录
- 错误模式变化趋势
- 长期复盘报告

价值：

- 提升长期动机
- 形成真正有沉淀的数据资产

### 3.4 云同步与多设备

如果项目未来要长期用，这一层非常重要。

建议包括：

- 账号体系
- 云同步
- 多设备接续
- 备份与恢复

### 3.5 离线训练能力

建议包括：

- 常用音频本地缓存
- 离线泛听包
- 离线笔记与训练记录
- 联网后同步

---

## 九、并行进行的工程优化路线

除了产品阶段外，还有一条长期并行的工程路线。

### A. 复杂页面持续拆分

优先拆：

- [VaultListClient.tsx](/Users/leozhou/git/DeepListener/src/app/vault/VaultListClient.tsx)
- [ReviewClient.tsx](/Users/leozhou/git/DeepListener/src/app/review/ReviewClient.tsx)
- [ShadowingConsole.tsx](/Users/leozhou/git/DeepListener/src/components/feature/ShadowingConsole.tsx)
- [ExportButtons.tsx](/Users/leozhou/git/DeepListener/src/app/vault/ExportButtons.tsx)

建议拆法：

- presentation
- selectors
- audio controls
- keyboard commands
- network mutations
- page container

### B. 统计体系重构

需要把 [page.tsx](/Users/leozhou/git/DeepListener/src/app/dashboard/page.tsx) 中的聚合逻辑拆成独立查询和 selector。

### C. 编辑器体系升级

需要把 Track note / review note / rich text note 统一到一个更稳的编辑器模型。

### D. 会话与时长体系升级

需要把 [TimeTrackingContext.tsx](/Users/leozhou/git/DeepListener/src/contexts/TimeTrackingContext.tsx) 的 heartbeat 推断模型，升级为更可靠的 session 事件模型。

### E. 后台任务和队列体系

需要为转录、导出、搜索索引、Shadowing 分析预留统一任务层。

---

## 十、明确不优先的方向

为了避免项目膨胀，以下方向不应抢占前排资源：

### 1. 纯装饰型 UI 升级

视觉可以优化，但它不是当前价值瓶颈。

### 2. 泛社交化功能

例如排行榜、打卡社区、公开 feed。  
这些不属于 DeepListener 当前最强的价值核心。

### 3. 大而泛的内容平台化

如果没有先建立训练引擎和推荐系统，先做海量内容平台只会稀释项目重心。

### 4. 与核心训练无关的 AI 功能堆叠

例如随意加总结、闲聊问答、泛助手能力。  
只有直接强化训练闭环的 AI 能力才值得优先。

## 十一、最终优先级

如果只按价值排序，我建议的总优先级如下。

### Top 5

1. 结构化诊断系统
2. 个性化训练队列
3. Shadowing 自动反馈
4. 听力能力画像
5. 服务层 + 统一校验 + 任务层

### Next 5

1. 听写 / 挖空 / 重建句子训练
2. 智能泛听包生成
3. Dashboard 重构为行动型洞察
4. 搜索与检索升级
5. 数据模型清理和难度建模拆分

### Long-Term Multipliers

1. 句子知识图谱
2. 课程化训练路径
3. 成长档案
4. 云同步
5. 离线训练

## 十二、结论

这条 roadmap 的核心判断只有一句话：

> DeepListener 的真正上限，不在于“再加多少学习功能”，而在于它能否成为一个真正理解你听力问题、并能持续安排训练的系统。

如果沿着这条路线继续做，项目会从：

- 音频精听工具

升级为：

- 高阶听力训练系统

再升级为：

- 个人听力能力操作系统

这才是它最值得追求的方向。
