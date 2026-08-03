# 未修复 Bug（确定性 < 80%）

记录复现路径、预期结果、实际结果。未修复原因：复现不稳定或修复方案确定性不足。

---

## Open #1 — vault 过滤器切换偶发整页崩溃（Next.js RSC 内部竞态）

- **复现路径**：
  1. 打开 `/vault`，点"全部播放"开始播放
  2. 播放中点击任意过滤器（如"困难"）
  3. 偶发（约 1/5 尝试）：整页进入错误边界，"出了点问题"错误页
- **预期**：过滤器切换正常，页面不崩溃
- **实际**：偶发崩溃，浏览器控制台报 `unhandledRejection: TypeError: frame.join is not a function`，随后 error.tsx 处理报 `chunk.reason.enqueueModel is not a function`
- **分析**：`frame.join` / `enqueueModel` 均出自 `node_modules/next/dist/compiled/react-server-dom-turbopack-client.*`（Next.js 16.2.5 RSC 客户端内部）。`buildFakeCallStack` 对非数组 frame 调用 `.join()` 二次崩溃，掩盖了根源错误；`chunk.reason.enqueueModel` 表明 RSC chunk 状态机在流处理中进入不一致状态。服务端请求均返回 200（`GET /vault?difficulties=HARD 200`），属于客户端 RSC 处理竞态，与应用代码无直接关系。
- **未修复原因**：崩溃为间歇性竞态（后续 4 轮+ 复测均未复现），无法稳定验证修复；修复点在 Next.js 框架内部，应用侧只能通过停止播放（Bug #4 已修复）间接降低触发概率。确定性 < 40%。
- **确定性评分：35%**

---

## Open #2 — AudioPlayer 存在 region 时无条件回跳播放头（疑似设计意图）

- **文件**：`src/components/feature/AudioPlayer.tsx:224-240`
- **复现路径**：
  1. 打开任意 track practice 页面
  2. 在波形图上拖拽创建选区（region）
  3. 播放，播放头到达 region.end 附近会跳回 region.start，即使"Loop"按钮未开启
- **预期**：不开启 Loop 时播放不应被选区困住
- **实际**：任何存在的 region 都会强制循环播放（`timeupdate` 监听无条件 snap-back）
- **分析**：`onRegionUpdateEnd` 在创建 region 后自动 `setTime(region.start)` + `play()`，`handleSentenceClick`/`seekToSentence` 会 `clearRegions()`，且"Clear"按钮可清除选区——整条链路表明"拖拽选区 = 精听循环"是有意的产品设计（选区循环与 Loop 按钮的全轨循环并存）。若按 bug 修复会破坏精听功能。
- **未修复原因**：与产品设计冲突，修复方向不明。确定性 < 50%。
- **确定性评分：40%**

---

## Open #3 — vault play-all 播放中音频源切换（低影响竞态，已被 Bug #4 修复缓解）

- **文件**：`src/app/vault/useVaultPlayback.ts:139-164`
- **复现路径**：play-all 播放中点击当前播放行的播放按钮
- **预期**：再次点击应重新播放该行
- **实际**：`playAllActive`/`playingId` 闭包值可能过时，点击行为与预期不符（可能静默无操作）
- **分析**：依赖快速时序，影响小；Bug #4 的 `stopPlayAll` 修复已覆盖大部分场景
- **未修复原因**：无法稳定复现，确定性 < 60%。
- **确定性评分：50%**

---

## Open #4 — TimeTrackingContext 模式切换时学习时长统计偏差

- **文件**：`src/contexts/TimeTrackingContext.tsx`
- **复现路径**：LISTENING 模式播放 5 秒后切换 SHADOWING 2 秒再切回，观察 `/api/study-time` 累计
- **预期**：按真实活跃时长累计
- **实际**：固定 10s 心跳粒度，快速模式切换时旧模式部分窗口未结算、新模式首个 tick 全额计费
- **分析**：属于 10s 心跳粒度的固有精度取舍，影响小
- **未修复原因**：修复涉及计费模型重构，影响面大、确定性低。确定性 < 55%。
- **确定性评分：45%**

---

## Open #5 — review 音频边界异常句子（endTime <= startTime）可能无声或播到结尾

- **文件**：`src/app/review/useReviewAudio.ts:65-71`
- **复现路径**：数据库中存在 `endTime <= startTime` 的句子时，复习页播放该句
- **预期**：跳过或钳制无效区间
- **实际**：可能立即暂停（无声）或播放超出句尾
- **分析**：依赖异常数据；当前数据库未发现此类句子（只读查询未见），无法浏览器复现
- **未修复原因**：无真实数据触发，确定性 < 60%。
- **确定性评分：50%**
