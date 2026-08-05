# 普通学习者首次成功体验任务分解

**状态：** Execution ledger；核心任务已部分实施，未关闭任务仍保持 open，逐项证据见 [implementation-status.md](./implementation-status.md)
**执行目标：** 每个任务应能在一个聚焦的 AI turn 或半个工作日内完成并独立评审
**默认验证：** 先定向测试，再 `npm run verify`；Desktop/数据任务追加各自 Adversarial 证据

## 0. 执行规则

### 0.1 并行标记

- **可并行：是（Lane X）**：依赖满足后，可与同波次其他 Lane 同时执行，前提是文件所有权不重叠。
- **可并行：条件式**：只能在独立工作树/分支或冻结共享合同后并行；当前共享工作区中默认串行。
- **可并行：否**：数据库/schema、上传状态机集成、翻译 JSON、Desktop packaging/release 等单一 owner 工作。
- 后续使用 subagent 时，调度者必须先读取每个任务的 `Owned files`，不得把同一文件同时交给两个 agent。

### 0.2 全局禁止项

- 不得读取、迁移、覆盖或删除活跃 `prisma/dev.db`。
- 不得删除/覆盖 `public/uploads/`、`public/videos/` 或 `.env*`。
- 不得用真实密钥、私有媒体或用户笔记作为测试夹具。
- 不得为了通过测试削弱 lint/build/test/security 配置。
- 不得把计划行为写进 Tier 1 当前事实文档，除非实现和验证已经完成。
- 不得由 AI 自行确认 Demo 版权、代码签名、notarization、Windows 签名或正式发布。

### 0.3 人工闸门

| Gate | 所需人工决策 | 阻塞任务 |
| --- | --- | --- |
| HG-01 Demo 资产批准 | 批准英语脚本、说话人/来源、再分发权、署名和最终音频 | T122、T123、T124、T403 |
| HG-02 Provider 推荐批准 | 批准默认推荐依据、地区/网络说明和不易过时的比较文案 | T132 |
| HG-03 发布资格 | 提供签名证书、平台账号并明确批准打包/发布 | 上游 `desktop-first-distribution` 发布任务 |
| HG-04 可用性参与者 | 安排 5 名非开发英语学习者并同意观察协议 | T403、T405 |

## Wave 0：对账与合同冻结

### T000 建立本变更 Adversarial Session

- **Requirements:** 全部，重点 OFS-002/OFS-007/OFS-010
- **Depends on:** 无
- **Parallel:** 否；所有实现任务的前置
- **Mode:** Adversarial
- **Owned files:** 新建 `docs/agent-harness/sessions/<date>-ordinary-first-success/**`
- **Work:** 复制 safety profile、sprint contract、evaluator report；列明活跃数据绝不接触、测试 data root、允许命令、回滚和停止条件。
- **Verify:** 文档包含 protected-data 清单、disposable root、rollback、targeted/full gate。
- **Evidence:** session 路径和合同评审记录。
- **Effort:** S

### T001 对账 Desktop OpenSpec 与当前代码

- **Requirements:** OFS-001/OFS-002/OFS-004/OFS-005
- **Depends on:** T000
- **Parallel:** 是（Lane A），可与 T002–T008 并行
- **Owned files:** `openspec/changes/desktop-first-distribution/tasks.md`、本 session 对账报告；不得改代码
- **Work:** 对上游 DDF-060 至 DDF-193 等任务逐项标记 implemented/partial/spec-only/blocked；引用 `runtime-paths`、migration runner、secrets store、provider UI、demo seed 等证据；禁止仅凭文件存在判定完成。
- **Verify:** 每个改变状态的任务有源文件、测试和未满足项证据。
- **Evidence:** `openspec-reconciliation.md` + 最小任务状态 diff。
- **Effort:** M

### T002 捕获首次成功基线

- **Requirements:** OFS-003/OFS-009/OFS-010
- **Depends on:** T000
- **Parallel:** 是（Lane B）
- **Owned files:** session 下 `baseline.md` 与截图目录；不改产品代码
- **Work:** 在一次性配置中走 Landing、引导、Setup、Library 失败、Provider 帮助；记录键盘、200% zoom、中文/英文、窄屏基线和无法验证项。
- **Verify:** 每个关键步骤有截图/DOM/行为证据或明确 blocker。
- **Evidence:** 有序截图和编号步骤。
- **Effort:** M

### T003 冻结启动/readiness/恢复合同

- **Requirements:** OFS-001/OFS-002
- **Depends on:** T000
- **Parallel:** 是（Lane C）
- **Owned files:** 新建 session `startup-readiness-contract.md`
- **Work:** 定义 Desktop/Server 状态、健康响应字段、错误代码、路由门控范围、可选 FFmpeg 降级和 redaction；不得实现。
- **Verify:** 覆盖新配置、不可写 DB、迁移失败、缺 asset、纯音频可用场景。
- **Evidence:** Given/When/Then 合同和 JSON 示例（无私有路径）。
- **Effort:** S

### T004 冻结可执行 onboarding journey 合同

- **Requirements:** OFS-003/OFS-004/OFS-009
- **Depends on:** T000
- **Parallel:** 是（Lane D）
- **Owned files:** 新建 session `onboarding-journey-contract.md`
- **Work:** 定义 step descriptor、primary action、completion signal、fallback、focus、Escape、reduced motion 和 completion/skip 区别。
- **Verify:** 所有按钮动词有对应真实动作；无“完成=只关闭”歧义。
- **Evidence:** 状态图和控件矩阵。
- **Effort:** S

### T005 冻结可恢复导入 operation 合同

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T000
- **Parallel:** 是（Lane E）
- **Owned files:** 新建 session `import-operation-contract.md`
- **Work:** 对齐上游 DDF-063/DDF-123/DDF-124；定义状态、manifest 版本、storage key、ownership、幂等、attempt、重启恢复、磁盘预检和清理策略。
- **Verify:** 超时、迟到响应、重复请求、进程退出、磁盘不足、取消和失败删除均有确定结果。
- **Evidence:** 状态转换表与不变量。
- **Effort:** M

### T006 盘点首次会话术语与 i18n keys

- **Requirements:** OFS-005/OFS-008/OFS-009
- **Depends on:** T000
- **Parallel:** 是（Lane F）
- **Owned files:** 新建 session `copy-inventory.md`；不改 `messages/*.json`
- **Work:** 列出 Landing、Setup、引导、导入、Practice handoff、Vault/Review 的工程术语、当前 keys、目标学习者文案和高级披露位置。
- **Verify:** 中英文一一映射；不翻译用户内容。
- **Evidence:** copy matrix 与禁止词清单。
- **Effort:** M

### T007 准备真实英语 Demo 教学脚本与 provenance 模板

- **Requirements:** OFS-004
- **Depends on:** T000
- **Parallel:** 是（Lane G）
- **Owned files:** `docs/desktop-w0/demo-script.md` 或 session 新版脚本、provenance 模板；不得替换音频
- **Work:** 设计 20–45 秒、2–4 句脚本、目标听力现象、盲听/揭示/收藏步骤、时间轴草案、资产验收清单。
- **Verify:** 脚本可在无麦克风/无网络下展示完整闭环；明确“等待 HG-01”。
- **Evidence:** 教学评审稿与 provenance 空表。
- **Effort:** S

### T008 冻结 SRT/VTT 配对导入合同

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T000
- **Parallel:** 是（Lane H）
- **Owned files:** 新建 session `sidecar-subtitle-contract.md`
- **Work:** 定义首期格式、编码、媒体/字幕选择顺序、时间范围容差、重叠策略、错误恢复和 Provider 零请求要求。
- **Verify:** 合法、乱码、恶意文本、超时长、空 cue、重叠和不匹配夹具均有预期。
- **Evidence:** fixture matrix。
- **Effort:** S

### T009 冻结 Provider 决策与错误分类

- **Requirements:** OFS-005/OFS-007
- **Depends on:** T000
- **Parallel:** 是（Lane I）
- **Owned files:** 新建 session `provider-decision-contract.md`
- **Work:** 复用 DCS-004/005；定义推荐信息字段、官方价格链接、网络/代理提示、configured/unverified/verified 和 retryable 分类。
- **Verify:** 打开设置零网络请求；所有外部请求由显式动作触发。
- **Evidence:** Provider matrix 和 safe error payload。
- **Effort:** S

### T010 合同集成与重复范围清除

- **Requirements:** 全部
- **Depends on:** T001–T009
- **Parallel:** 否；Wave 1 gate
- **Owned files:** 本 change proposal/design/spec/tasks、小范围上游 OpenSpec 交叉引用
- **Work:** 解决与 desktop-first 的重复任务；决定文件 manifest 还是独立 schema change；冻结 requirement-to-task mapping。
- **Verify:** 无两个任务声称同时拥有 schema、upload route、messages JSON 或 Desktop packaging。
- **Evidence:** contract review checklist，无 unresolved P0。
- **Effort:** M

### T011 预置全部新增 i18n keys

- **Requirements:** OFS-002/OFS-003/OFS-005/OFS-008/OFS-009
- **Depends on:** T006、T010
- **Parallel:** 否；共享文件单一 owner
- **Mode:** Contrac
- **Owned files:** `messages/en.json`、`messages/zh-CN.json`、`src/i18n/messages.test.ts`
- **Work:** 按冻结 copy matrix 一次性加入新 keys 和占位文案；建立 key parity 和禁止混合语言测试。后续并行 UI agent 不得改这两个 JSON。
- **Verify:** `node --import tsx --test src/i18n/messages.test.ts`
- **Evidence:** key 列表和测试输出。
- **Effort:** M

## Wave 1：免密钥首次成功（可并行 Lanes）

### T100 增加 readiness 结果与错误代码纯函数合同

- **Requirements:** OFS-001/OFS-002
- **Depends on:** T003、T010
- **Parallel:** 是（Lane A）；可与 Lane B/C/D 并行
- **Owned files:** `src/lib/setup-readiness.ts`、`src/lib/setup-readiness.test.ts`，必要时新建 `src/lib/readiness-state.ts`
- **Work:** 把 database compatible/writable、runtime assets、optional capability 和 safe recovery code 建模为稳定结果；保持 secrets/path redaction。
- **Verify:** `node --import tsx --test src/lib/setup-readiness.test.ts <new-tests>`
- **Evidence:** normal/edge/failure assertions。
- **Effort:** M

### T101 实现 Server 数据路由 readiness guard

- **Requirements:** OFS-002
- **Depends on:** T100
- **Parallel:** 条件式（Lane A）；与 T102 文件不重叠时可并行
- **Owned files:** 新建 `src/lib/route-readiness.ts` 与测试；数据页面集成由 T103 单独拥有
- **Work:** 提供只读 guard，把已知 database-not-ready 映射为 Setup recovery destination；未知异常不吞掉。
- **Verify:** 定向纯函数/组件测试。
- **Evidence:** missing/read-only/compatible DB cases。
- **Effort:** S

### T102 实现 Desktop 启动恢复状态合同

- **Requirements:** OFS-001/OFS-002
- **Depends on:** T100
- **Parallel:** 是（Lane A2），不得与 Desktop packaging agent 并行
- **Mode:** Adversarial
- **Owned files:** `desktop/main.js`、专用 Desktop startup tests；不改 packaging config
- **Work:** 仅在健康允许时打开正常 UI；失败打开/返回受控 recovery payload；不得包含密钥或绝对用户路径。
- **Verify:** disposable data root startup tests、service-failure injection。
- **Evidence:** startup logs（redacted）和 no-normal-window-on-failure 断言。
- **Effort:** M

### T103 集成数据页面门控和有效恢复 CTA

- **Requirements:** OFS-002/OFS-008
- **Depends on:** T101、T011
- **Parallel:** 否；多个 route/page 的集成 owner
- **Owned files:** `src/app/library/page.tsx`、`src/app/vault/page.tsx`、`src/app/review/page.tsx`、`src/app/dashboard/page.tsx`、相关测试；避免改 `src/app/error.tsx` 以外未知错误语义
- **Work:** 已知 readiness 阻塞时导航/渲染专用说明和 Setup 链接；“重试”仅在状态可能变化时出现。
- **Verify:** 定向 route/source tests + browser smoke。
- **Evidence:** 每个页面 blocked/ready 截图和 DOM。
- **Effort:** M

### T110 修复 OnboardingGuide 层级、焦点和 Escape

- **Requirements:** OFS-003/OFS-009
- **Depends on:** T004、T010、T011
- **Parallel:** 是（Lane B）；不得与 T111 同时修改 onboarding 文件
- **Owned files:** `src/components/onboarding/OnboardingGuide.tsx`、`OnboardingGuide.test.ts`
- **Work:** 使目标可点击；明确 dialog/target 模式；实现初始焦点、Tab、Escape、focus return、reduced motion 和窄屏 fallback。
- **Verify:** 定向组件测试 + keyboard browser flow。
- **Evidence:** pointer/keyboard/200% zoom 记录。
- **Effort:** M

### T111 增加可执行 journey descriptor 与真实 CTA

- **Requirements:** OFS-003
- **Depends on:** T110
- **Parallel:** 否；Onboarding 单一 owner
- **Owned files:** `src/components/onboarding/**`、`src/components/app-shell/AppShell.tsx`、`src/app/onboarding.test.ts`
- **Work:** 定义 action/completion/fallback；区分 skip 与 complete；“开始学习”调用 Demo 路径，“使用素材/检查设置”真实导航。
- **Verify:** onboarding tests + browser navigation assertions。
- **Evidence:** 每步 action-to-result 表。
- **Effort:** M

### T112 建立 Demo journey 事件接口

- **Requirements:** OFS-003/OFS-004
- **Depends on:** T004、T010
- **Parallel:** 是（Lane B2），前期仅新增独立 helper/tests；Practice 集成由 T124
- **Owned files:** 新建 `src/lib/demo-journey.ts` 与测试
- **Work:** 定义 `played/revealed/sentenceSelected/saved/reviewHandoffSeen` 事件、顺序容错和 presentation-only 状态。
- **Verify:** 纯函数状态机测试，不依赖数据库。
- **Evidence:** event transition table。
- **Effort:** S

### T120 增加 Demo 资产验收脚本测试

- **Requirements:** OFS-004
- **Depends on:** T007、T010
- **Parallel:** 是（Lane C）
- **Owned files:** `scripts/desktop-preflight.mjs`、`src/lib/demo-replacement-contract.test.ts` 或独立 demo audit tes
- **Work:** 强制 release Demo 包含 speech/provenance/timeline/checksum；明确正弦波只能用于内部 Alpha，不能通过 learner-release gate。
- **Verify:** 用当前正弦波 fixture 证明 learner-release gate 失败；内部 Alpha gate 行为保持明确。
- **Evidence:** expected-fail fixture 和清晰诊断。
- **Effort:** M

### T121 生成并验证 Demo 时间轴候选

- **Requirements:** OFS-004
- **Depends on:** T007、HG-01 脚本批准；不要求最终音频
- **Parallel:** 是（Lane C2）
- **Owned files:** `scripts/demo-timeline.example.json`、session 候选时间轴/验证报告；不替换正式资产
- **Work:** 根据批准脚本准备 cue、学习现象标注和验证命令；记录最终音频到达后需要重新校准。
- **Verify:** timeline schema/ordering/coverage tests。
- **Evidence:** 候选 timeline 报告。
- **Effort:** S

### T122 集成经批准的真实语音 Demo 资产

- **Requirements:** OFS-004
- **Depends on:** HG-01、T120、T121
- **Parallel:** 否；资产与 seed 单一 owner
- **Owned files:** `public/demo/**`、`src/lib/demo-seed.ts`、`scripts/replace-demo-audio.mjs`、相关 tests
- **Work:** 使用批准音频替换资产、更新时间轴/provenance/checksum；保持 stable demo ownership/idempotency。
- **Verify:** demo replacement contract、demo seed tests、package preflight。
- **Evidence:** 人工批准引用、checksum、测试输出。
- **Effort:** M

### T123 验证 Demo 离线与个人数据隔离

- **Requirements:** OFS-004
- **Depends on:** T122
- **Parallel:** 是（Lane C test），不改 seed implementation
- **Owned files:** Demo E2E/contract tests、disposable fixtures
- **Work:** 断网/无 key 运行；seed twice；personal Track 共存后 remove Demo；验证个人计数/媒体/历史不变。
- **Verify:** targeted tests on disposable DB only。
- **Evidence:** before/after invariants。
- **Effort:** M

### T124 集成 Demo guided journey

- **Requirements:** OFS-003/OFS-004/OFS-008/OFS-009
- **Depends on:** T111、T112、T122、T011
- **Parallel:** 否；Practice/UI 集成 owner
- **Owned files:** `src/app/practice/[id]/PracticeClient.tsx`、相关 state tests；不改播放器内部组件
- **Work:** 仅在 Demo 模式把播放、揭示、选句、收藏事件接入 T112 状态机；普通 Practice 不创建 journey 状态。
- **Verify:** Practice structure/behavior tests，验证 Demo/normal Track 分支。
- **Evidence:** event-to-state assertions。
- **Effort:** M

### T125 实现 Demo 步骤呈现和复习 handoff

- **Requirements:** OFS-003/OFS-004/OFS-008/OFS-009
- **Depends on:** T124、T011
- **Parallel:** 否；Demo presentation owner
- **Owned files:** 新建 Demo journey UI、必要的 `src/components/feature/audio-player/**` adapter、相关 tests
- **Work:** 呈现当前步骤、跳过/退出、收藏完成和复习继续；使用可访问控件，不改变播放器业务语义。
- **Verify:** component tests、keyboard/focus tests。
- **Evidence:** Demo step/action matrix。
- **Effort:** M

### T126 验证 Demo 与普通 Practice 行为隔离

- **Requirements:** OFS-003/OFS-004/OFS-009
- **Depends on:** T125
- **Parallel:** 是（Lane C test），只改测试/报告
- **Owned files:** Demo browser journey tests、session repor
- **Work:** 完成 Demo 盲听→揭示→选句→收藏→复习发现；对照普通 Track 无引导覆盖。
- **Verify:** targeted browser journey + existing Practice tests。
- **Evidence:** ordered screenshots/DOM and no-regression result。
- **Effort:** S

## Wave 2：个人媒体低摩擦与可恢复导入

### T130 建立 Provider 推荐静态模型

- **Requirements:** OFS-005
- **Depends on:** T009、T010、T011
- **Parallel:** 是（Lane D）
- **Owned files:** 新建 `src/lib/provider-guidance.ts` 与 tests；不改 UI/messages
- **Work:** 定义 provider label、适用场景、external disclosure、pricing URL、console URL、network note key；不放密钥或实时价格。
- **Verify:** schema/URL/provider parity tests。
- **Evidence:** model snapshot。
- **Effort:** S

### T131 实现“先判断字幕，再配置 Provider”的向导

- **Requirements:** OFS-005/OFS-006
- **Depends on:** T130、T008、T011
- **Parallel:** 是（Lane D UI），不得与 T132 同改 ProviderConfigDialog
- **Owned files:** 新建 `src/app/setup/TranscriptionDecisionGuide.tsx` 与 tests；ProviderConfigDialog 集成留给 T132
- **Work:** 提供内嵌字幕、sidecar 字幕、外部转写、返回 Demo 四条决策路径。
- **Verify:** component tests，打开页面零网络请求。
- **Evidence:** state/action matrix。
- **Effort:** M

### T132 集成 Provider 比较、推荐与显式测试入口

- **Requirements:** OFS-005
- **Depends on:** HG-02、T130、T131
- **Parallel:** 否；Provider UI 单一 owner
- **Owned files:** `src/app/setup/ProviderConfigDialog.tsx`、`ProviderCardActions.tsx`、相关 API/tests
- **Work:** 显示批准的推荐理由和官方链接；保持秘密只写不回显；连接测试必须显式确认并复用 safe taxonomy。
- **Verify:** setup/provider route tests + network interception browser test。
- **Evidence:** zero-request-on-open、selected-provider-only request。
- **Effort:** M

### T140 增加 VTT 纯文本解析与恶意夹具

- **Requirements:** OFS-006/OFS-009
- **Depends on:** T008、T010
- **Parallel:** 是（Lane E1）
- **Owned files:** `src/lib/subtitle-utils.ts`、`src/lib/subtitle-utils.test.ts`
- **Work:** 在 SRT 基线上增加首期 VTT；处理 BOM、CRLF、空 cue、排序、重叠、HTML-like 文本作为纯文本/受控清理；不记录全文。
- **Verify:** `node --import tsx --test src/lib/subtitle-utils.test.ts`
- **Evidence:** valid/malformed/malicious fixtures。
- **Effort:** M

### T141 增加媒体/字幕匹配验证纯函数

- **Requirements:** OFS-006
- **Depends on:** T008、T140
- **Parallel:** 是（Lane E2），与 ingestion API 分离
- **Owned files:** 新建 `src/lib/subtitle-media-validation.ts` 与 tests
- **Work:** 验证 cue 范围、媒体时长容差、空时间轴和警告/阻断等级；不访问用户真实媒体。
- **Verify:** fixture table tests。
- **Evidence:** tolerance decisions。
- **Effort:** S

### T200 实现 import manifest 原子存储

- **Requirements:** OFS-007
- **Depends on:** T005、T010，且已决定采用 file manifes
- **Parallel:** 是（Lane F1），可与 T140/T141 并行
- **Mode:** Adversarial
- **Owned files:** 新建 `src/lib/import-jobs/manifest.ts` 与 tests
- **Work:** versioned schema、safe relative keys、atomic write、load/validate、corrupt manifest 处理；禁止绝对路径/secret。
- **Verify:** temp-root tests、interrupted write/corrupt JSON/path escape cases。
- **Evidence:** disposable filesystem report。
- **Effort:** M

### T201 实现 operation-owned staging 与空间预检

- **Requirements:** OFS-007
- **Depends on:** T200
- **Parallel:** 条件式（Lane F1），不得与 T202/T207 同时改 import-jobs core
- **Mode:** Adversarial
- **Owned files:** 新建 `src/lib/import-jobs/staging.ts` 与 tests
- **Work:** 创建 operation directory、流式接收 partial、校验后原子 rename、ownership manifest、disk estimate；复用 upload policy。
- **Verify:** partial upload、oversize、disk-low、path traversal、restart fixture。
- **Evidence:** no artifact escape/no false complete。
- **Effort:** M

### T202 实现 import-job create/status API

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T201
- **Parallel:** 是（Lane F2），API 文件独占
- **Owned files:** 新建 `src/app/api/import-jobs/**`、API schema/tests
- **Work:** 创建/接收单媒体，返回 operation ID；status 只返回安全字段；请求校验、大小限制和 launch authorization 复用现有政策。
- **Verify:** route tests for create/status/error/redaction。
- **Evidence:** API examples。
- **Effort:** M

### T203 实现 sidecar 字幕关联/解析 API

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T141、T202
- **Parallel:** 是（Lane F3），仅 subtitle 子路由
- **Owned files:** `src/app/api/import-jobs/[id]/subtitle/**`、tests
- **Work:** 关联 SRT/VTT、解析、媒体匹配、记录状态；失败保留源媒体并允许替换字幕。
- **Verify:** route + zero-provider-call tests。
- **Evidence:** valid/mismatch/malformed results。
- **Effort:** M

### T204 实现可恢复 Provider attempt 服务

- **Requirements:** OFS-005/OFS-007
- **Depends on:** T200、T202、T009
- **Parallel:** 条件式（Lane F4），只能新增独立 service；不得改 upload route
- **Mode:** Adversarial
- **Owned files:** 新建 `src/lib/import-jobs/transcription-attempt.ts` 与纯状态 tests
- **Work:** 定义 attempt ID、claim、safe error category、timeout/late response fencing 和状态转换；本任务不调用真实 provider adapter。
- **Verify:** pure tests for claim/timeout/late/double completion。
- **Evidence:** no duplicate attempt overwrite。
- **Effort:** M

### T212 将 selected Provider 执行接入 attempt 服务

- **Requirements:** OFS-005/OFS-007
- **Depends on:** T204、T009
- **Parallel:** 条件式（Lane F4 adapter），不得改 API/UI/upload route
- **Mode:** Adversarial
- **Owned files:** 新建 `src/lib/import-jobs/run-transcription.ts` 与 tests
- **Work:** 仅注入 selected Provider 配置，复用 staged media，映射 auth/network/quota/unusable errors；不存密钥。
- **Verify:** fake providers for success/auth/timeout/quota and selected-provider-only injection。
- **Evidence:** request/error matrix and redaction check。
- **Effort:** M

### T205 实现幂等 Track 激活服务

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T200、T203、T212
- **Parallel:** 否；数据库写 owner
- **Mode:** Adversarial
- **Owned files:** 新建 `src/lib/import-jobs/activate.ts`、tests；若需要 schema 变更则停止并另立 migration contrac
- **Work:** timeline ready 后事务创建唯一 Track/sentences；记录 Track ID；重复激活返回同一 Track；失败保持可恢复。
- **Verify:** disposable DB concurrency/idempotency/rollback tests。
- **Evidence:** exactly-one-Track invariants。
- **Effort:** M

### T206 实现 resume/retry/change-provider API

- **Requirements:** OFS-007
- **Depends on:** T204、T205
- **Parallel:** 是（Lane F API），与 UI 并行但 API 文件独占
- **Owned files:** `src/app/api/import-jobs/[id]/resume/**`、`transcribe/**`、tests
- **Work:** 校验当前状态、选择 Provider、调用 attempt/activate；重复请求幂等；返回已保留工作说明。
- **Verify:** timeout → retry、invalid key → change provider、double submit。
- **Evidence:** route state transitions。
- **Effort:** M

### T207 实现失败任务确认删除与保留策略

- **Requirements:** OFS-007
- **Depends on:** T201、T205
- **Parallel:** 否；staging cleanup 单一 owner
- **Mode:** Adversarial
- **Owned files:** `src/lib/import-jobs/cleanup.ts`、DELETE route、tests
- **Work:** 只删 operation-owned staged artifacts；拒绝删除 active Track media；第一版不自动清理或只提供 dry-run inventory。
- **Verify:** personal/demo/other-operation sentinel files remain unchanged。
- **Evidence:** before/after manifest and file hashes。
- **Effort:** M

### T208 将旧单文件上传适配到 import-job 编排

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T202–T207
- **Parallel:** 否；**全局 ingestion owner**，不得与任何 upload route/media processing refactor 并行
- **Mode:** Adversarial
- **Owned files:** `src/app/api/upload/route.ts`、upload route tests、必要的 compatibility adapter；不改客户端
- **Work:** 保持旧单文件 API 响应或提供明确兼容响应；将后端处理接入 import job；移除失败即删源媒体；批量路径不在本任务迁移。
- **Verify:** upload route structure/contract tests、success/failure compatibility。
- **Evidence:** old/new compatibility table，no-regression。
- **Effort:** M

### T209 实现个人媒体 + 字幕 UI

- **Requirements:** OFS-005/OFS-006/OFS-007/OFS-009
- **Depends on:** T131、T202、T203、T011
- **Parallel:** 是（Lane G UI），不得改 ProviderConfigDialog/messages JSON/upload route
- **Owned files:** 新建 `src/app/library/ImportMediaWizard.tsx` 与 tests；最终触发器集成由 T211
- **Work:** 单媒体选择、字幕可选、no-key 提示、验证警告、处理状态、恢复入口；使用既有 UI primitives。
- **Verify:** component tests + keyboard/zoom browser flow。
- **Evidence:** state screenshots and accessible names。
- **Effort:** M

### T213 将现有单文件客户端接入 import-job 状态

- **Requirements:** OFS-006/OFS-007
- **Depends on:** T208、T209、T210
- **Parallel:** 否；single-upload client owner
- **Owned files:** `src/app/library/UploadButton.tsx`、`UploadButton.test.ts`、必要 client response helper
- **Work:** 创建/跟踪 operation，成功导航 Practice，失败显示恢复入口；保持 elapsed progress；不迁移 BatchUploadButton。
- **Verify:** UploadButton tests + mocked create/status/retry flow。
- **Evidence:** old/new client behavior table。
- **Effort:** M

### T210 实现失败任务恢复 UI

- **Requirements:** OFS-007/OFS-008/OFS-009
- **Depends on:** T206、T207、T011
- **Parallel:** 是（Lane G2），文件与 T209 不重叠
- **Owned files:** 新建 `src/app/library/ImportRecoveryList.tsx` 与 tests
- **Work:** 显示已保留媒体、失败类别、重试、换 Provider、换字幕、确认删除；不显示绝对路径/密钥/原始错误栈。
- **Verify:** component tests for every safe error category。
- **Evidence:** recovery action matrix。
- **Effort:** M

### T211 集成 Library 新导入/恢复旅程

- **Requirements:** OFS-005/OFS-006/OFS-007
- **Depends on:** T208–T210、T213
- **Parallel:** 否；Library 集成 owner
- **Owned files:** `src/app/library/LibraryManager.tsx`、`UploadButton.tsx`/trigger integration、Library tests
- **Work:** 连接 wizard/recovery list；保持现有 Track 列表、批量播放和笔记行为；必要时保留旧路径 feature flag 供回滚。
- **Verify:** Library targeted tests + browser end-to-end。
- **Evidence:** existing feature regression checklist。
- **Effort:** M

## Wave 3：学习者语言、无障碍与集成验证

### T300 增加首次会话术语 policy tes

- **Requirements:** OFS-008
- **Depends on:** T006、T011
- **Parallel:** 是（Lane H）
- **Owned files:** 新建 `src/i18n/first-session-language.test.ts`
- **Work:** 限制首次 surfaces 直接暴露 `DATABASE_URL`、Prisma、UNLEARNT 等；Setup advanced detail 允许白名单。
- **Verify:** targeted test。
- **Evidence:** allow/deny list。
- **Effort:** S

### T301 应用渐进披露文案

- **Requirements:** OFS-008
- **Depends on:** T300、T103、T124、T132、T211
- **Parallel:** 条件式；按非重叠组件分支可以并行，但共享工作区默认由单一 copy integrator 串行
- **Owned files:** Landing/Setup/Onboarding/Library/Practice handoff UI；**不得改 `messages/*.json`**
- **Work:** 使用 T011 keys 替换默认术语；保留 advanced details；不改算法/API/internal enum。
- **Verify:** language policy + relevant component tests。
- **Evidence:** before/after copy matrix。
- **Effort:** M

### T310 运行首次成功键盘与屏幕阅读器审查

- **Requirements:** OFS-009
- **Depends on:** T103、T111、T126、T132、T211、T301
- **Parallel:** 是（Lane QA1），只报告不改代码
- **Owned files:** session `accessibility-audit.md`、截图
- **Work:** 键盘、焦点、Escape、live region、200% zoom、窄屏、reduced motion、中英文 accessible name；列出确认/风险/无法验证。
- **Verify:** 每个 OFS-009 场景有证据。
- **Evidence:** audit report。
- **Effort:** M

### T311 运行网络与秘密边界审查

- **Requirements:** OFS-004/OFS-005/OFS-006/OFS-007/OFS-010
- **Depends on:** T123、T132、T203、T206
- **Parallel:** 是（Lane QA2），只改测试/报告
- **Status:** automated evidence complete; real Provider/network E2E remains intentionally deferred
- **Owned files:** network interception tests、session `privacy-boundary-report.md`
- **Work:** 证明 Demo/设置打开/字幕导入零 Provider 请求；显式测试/转写只联系 selected Provider；日志/diagnostics/manifest 无 secret/private content。
- **Verify:** fake endpoint/request counter + redaction assertions。
- **Evidence:** request matrix。
- **Effort:** M

### T312 运行导入故障注入与数据不变量审查

- **Requirements:** OFS-007/OFS-010
- **Depends on:** T208、T211
- **Parallel:** 是（Lane QA3），使用 disposable roots
- **Mode:** Adversarial
- **Owned files:** import E2E tests、session `import-recovery-report.md`
- **Work:** 覆盖 timeout、invalid key、quota、late response 和换 Provider retry；比较 DB/media hashes/counts。
- **Verify:** targeted E2E，禁止活跃路径。
- **Evidence:** invariant table and rollback result。
- **Effort:** M

### T314 运行导入文件系统与重启故障审查

- **Requirements:** OFS-007/OFS-010
- **Depends on:** T208、T211
- **Parallel:** 是（Lane QA4），与 T312 使用不同 disposable roo
- **Mode:** Adversarial
- **Owned files:** filesystem/restart E2E、session repor
- **Work:** kill/restart、disk low、corrupt manifest、partial staging 和 confirmed delete；验证 operation ownership。
- **Verify:** targeted E2E，sentinel hashes 不变。
- **Evidence:** filesystem invariant table。
- **Effort:** M

### T315 运行重复请求与激活幂等审查

- **Requirements:** OFS-007/OFS-010
- **Depends on:** T205、T206、T208
- **Parallel:** 是（Lane QA5），独立 disposable DB
- **Mode:** Adversarial
- **Owned files:** concurrency/idempotency E2E、session repor
- **Work:** double submit、并发 resume、迟到 attempt、重复 activate；验证 exactly-one-Track 与 attempt fencing。
- **Verify:** targeted concurrency tests。
- **Evidence:** Track/sentence counts and operation manifest。
- **Effort:** M

### T313 修复 T310–T312 的 must-fix

- **Requirements:** 由审查 finding 指定
- **Depends on:** T310–T312、T314、T315
- **Parallel:** 条件式；仅不重叠 finding 可并行，每个 finding 一个小任务
- **Owned files:** 每个 finding 显式声明；不得开展 drive-by refactor
- **Work:** 按 P0/P1/P2 创建独立 remediation；每次最多 3 次修复尝试并复跑失败命令。
- **Verify:** finding-specific + regression。
- **Evidence:** resolved finding list。
- **Effort:** S（仅拆分/调度；实际修复必须另建 S/M task）

## Wave 4：发行证据与目标用户验证

### T400 运行完整本地质量门

- **Requirements:** 全部
- **Depends on:** T313
- **Parallel:** 否；integration owner
- **Owned files:** evaluator report，仅修复明确 gate failure
- **Work:** Prisma client 如需生成则先生成；运行 targeted suite、`npm run verify`、Desktop preflight；记录真实结果。
- **Verify:** 所有命令实际绿色或有明确 blocker。
- **Evidence:** evaluator report。
- **Effort:** M

### T401 运行 macOS 干净 Desktop 首次成功 E2E

- **Requirements:** OFS-001–OFS-010
- **Depends on:** T400、上游可安装包任务完成
- **Parallel:** 是（Lane Release QA macOS），可与 T408 并行
- **Mode:** Adversarial
- **Owned files:** platform E2E/report；不改共享 packaging
- **Work:** 在声明支持的 macOS 架构上验证无开发工具链安装、启动、Demo、收藏、复习发现、个人字幕、Provider failure/retry、restart。
- **Verify:** macOS 原生结果。
- **Evidence:** installer hash、OS/arch、screenshots、logs redacted。
- **Effort:** M

### T408 运行 Windows 干净 Desktop 首次成功 E2E

- **Requirements:** OFS-001–OFS-010
- **Depends on:** T400、上游 Windows installer/runtime tasks
- **Parallel:** 是（Lane Release QA Windows），可与 T401 并行
- **Mode:** Adversarial
- **Owned files:** Windows E2E/report；不改共享 packaging
- **Work:** 在 Windows x64 干净配置重复与 T401 相同的 learner journey；不得以 macOS 结果替代。
- **Verify:** Windows 原生结果。
- **Evidence:** installer hash、OS build/arch、screenshots、logs redacted。
- **Effort:** M

### T402 运行升级与迁移回滚测试

- **Requirements:** OFS-010 + 上游 DLR
- **Depends on:** T400、上游 release/migration tasks
- **Parallel:** 是（Lane Release Data），不同平台/fixture 可并行；同一 backup fixture 单一 owner
- **Mode:** Adversarial
- **Owned files:** release E2E/repor
- **Work:** 旧版→新版、迁移中断、失败回滚和 post-update health；比较全部不变量。
- **Verify:** native target OS tests。
- **Evidence:** before/after manifests and hashes。
- **Effort:** M/platform

### T409 运行备份、恢复、Demo 删除和卸载保留测试

- **Requirements:** OFS-004/OFS-010 + 上游 DLR
- **Depends on:** T400、上游 backup/restore/release tasks
- **Parallel:** 是（Lane Release Data 2），使用与 T402 不同 fixture
- **Mode:** Adversarial
- **Owned files:** backup/restore/uninstall E2E/repor
- **Work:** backup/restore、Demo removal、uninstall data retention；验证个人媒体、笔记、复习和 study history。
- **Verify:** native target OS tests。
- **Evidence:** before/after manifests and hashes。
- **Effort:** M/platform

### T403 开展前 3 名目标用户观察

- **Requirements:** OFS-010
- **Depends on:** HG-01、HG-04、T401
- **Parallel:** 条件式；会话可以分别进行，分析由单一 owner 汇总
- **Owned files:** anonymized session notes；不得收集不必要个人数据
- **Work:** 不提供终端或代操作；记录时间、卡点、误解、求助和恢复；不在会话中临时教学来掩盖问题。
- **Verify:** protocol completeness。
- **Evidence:** KPI table and repeated blockers。
- **Effort:** M

### T404 将重复阻塞点转为 remediation tasks

- **Requirements:** OFS-010
- **Depends on:** T403
- **Parallel:** 否；产品/任务图 owner
- **Owned files:** 本 tasks follow-up 或新 audit remediation 文档
- **Work:** 两人及以上重复卡点必须进入 P0/P1；定义 file, fix, verify, effort, owner。
- **Verify:** 每个 repeated blocker 有任务或有证据的非问题判定。
- **Evidence:** traceability matrix。
- **Effort:** S

### T405 开展最终 2 名目标用户复测

- **Requirements:** OFS-010
- **Depends on:** T404 的 P0/P1 已完成并通过 T400/T401
- **Parallel:** 是；两会话可并行，汇总串行
- **Owned files:** anonymized session notes/final KPI repor
- **Work:** 使用修复后的干净包重复相同协议；不沿用已学会产品的参与者替代陌生用户。
- **Verify:** KPI-01–07。
- **Evidence:** final usability gate report。
- **Effort:** M

### T406 更新当前事实文档

- **Requirements:** 已实现要求
- **Depends on:** T400–T405
- **Parallel:** 否；documentation truth owner
- **Owned files:** `README.md`、`README.zh-CN.md`、`docs/requirement.md`、`docs/architecture.md`、`docs/desktop-user-guide.md`、`docs/README.md`、`CHANGELOG.md`
- **Work:** 只把实际验证的平台/能力写成当前事实；保留未完成项为 target state；写安装、Demo、字幕、恢复、隐私和故障说明。
- **Verify:** links、commands、platform claims 与证据一致。
- **Evidence:** documentation truth checklist。
- **Effort:** M

### T407 最终 OpenSpec 验证与归档候选

- **Requirements:** 全部
- **Depends on:** T406
- **Parallel:** 否
- **Owned files:** 本 change、evaluator report、decision log
- **Work:** 逐条映射 OFS-001–010 到代码、测试、用户证据；未满足项保持 open，不得为归档勾选。
- **Verify:** requirement-task-evidence 三向追踪完整。
- **Evidence:** final compliance matrix。
- **Effort:** M

## 5. 推荐的并行调度波次

### 并行波次 P0：仅文档/合同

在 T000 后可同时启动 8 个逻辑 Lane，但受实际 subagent 数限制：

- Lane A：T001 OpenSpec 对账
- Lane B：T002 UX 基线
- Lane C：T003 readiness 合同
- Lane D：T004 onboarding 合同
- Lane E：T005 import operation 合同
- Lane F：T006 copy inventory
- Lane G：T007 Demo 脚本
- Lane H：T008 subtitle 合同
- Lane I：T009 Provider 合同

这些任务不共享产品代码，可安全并行。T010 由主 agent 串行集成。

### 并行波次 P1：免密钥价值路径

T010/T011 后：

- Lane A：T100 → T101；T102 可由 Desktop 专属 agent 并行
- Lane B：T110 → T111；T112 可并行开发独立 helper
- Lane C：T120、T121；T122 等待 HG-01 后串行集成
- Lane D：T130 → T131；T132 等待 HG-02

T103、T124–T126 是跨页面集成/验收任务，放在 Lane 产出稳定后串行执行。

### 并行波次 P2：个人媒体

- Subtitle Lane：T140 → T141
- Operation core Lane：T200 → T201 → T202
- Provider attempt Lane：T204 → T212（T200/T202 后）
- UI Lane：T209/T210 在 API 合同冻结后可并行

T205（DB 激活）、T207（删除）、T208（旧上传集成）、T211（Library 集成）必须由单一 owner 串行收口。

### 并行波次 P3：独立审查

T310、T311、T312、T314、T315 可由独立审查 agent 并行，只提交报告/测试 finding；修复由 T313 重新按文件拆分。

## 6. 严禁并行的共享面

- `prisma/schema.prisma` 与 `prisma/migrations/**`
- `src/app/api/upload/route.ts` 和任何同时进行的 ingestion refactor
- `src/lib/import-jobs/**` 的状态机核心集成/清理阶段
- `messages/en.json`、`messages/zh-CN.json`
- `desktop/main.js` 与 Desktop packaging/signing 配置
- Demo 正式资产、`src/lib/demo-seed.ts` 和 provenance 集成
- 发布、签名、notarization、installer metadata 和正式 publish

## 7. Requirement Traceability

| Requirement | Tasks |
| --- | --- |
| OFS-001 | T001、T003、T100、T102、T401 |
| OFS-002 | T003、T100–T103、T310、T401 |
| OFS-003 | T004、T110–T112、T124–T126、T310、T403–T405 |
| OFS-004 | T007、T112、T120–T126、T311、T403、T409 |
| OFS-005 | T009、T130–T132、T204、T212、T209、T311 |
| OFS-006 | T008、T131、T140–T141、T203、T209、T311 |
| OFS-007 | T005、T200–T213、T312、T314–T315、T402、T409 |
| OFS-008 | T006、T011、T300–T301、T403–T405 |
| OFS-009 | T002、T004、T110、T124、T209–T210、T310 |
| OFS-010 | T000–T002、T310–T315、T400–T409 |
