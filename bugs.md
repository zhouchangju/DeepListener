# Bug 挖掘与修复记录

探索时间：2026-08-03（约 80 分钟）
探索方式：本地 dev server + 浏览器操作（landing / library / practice / review / vault / dashboard / setup）+ 服务器日志 + 数据库只读查询
复现原则：所有 bug 均通过浏览器操作复现；修复后通过相同路径回归验证。

---

## Bug #1 — shadowing 音频切片 WAV 编码运算符优先级错误（已修复）

- **文件**：`src/lib/audio-utils.ts:89`（`bufferToWav`）
- **问题**：
  ```js
  sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
  ```
  JS 中 `+` 优先级（13）高于 `<`（11），实际解析为 `(0.5 + sample) < 0 ? ...`。
  因此：
  - 只有 `sample < -0.5` 才走 `* 32768` 分支；`[-0.5, 0)` 区间的负样本错误地使用了 `* 32767`，导致负半幅量化不对称；
  - 预期的 `+0.5` 四舍五入从未生效；
  - 该代码服务于所有 shadowing 句子音频切片（`sliceAudioBuffer` → `bufferToWav`），影响跟读播放的音频质量。
- **复现路径**：
  1. 打开任意 track 的 practice 页面，点击"跟读"（Shadowing）
  2. 进入 shadowing 控制台，触发 `sliceAudioBuffer`（生成切片 WAV）
  3. 用 Node 复算 `(0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0`，可见 `sample=-0.25` 输出 -8191（应为 -8192）
- **预期**：负样本按 `* 32768` 量化（映射到 [-32768, 0)），正样本按 `* 32767`，避免满幅正样本回绕
- **实际**：`[-0.5, 0)` 负样本按 32767 量化，量化不对称
- **修复**：`sample = (sample < 0 ? sample * 32768 : sample * 32767) | 0;`
- **回归验证**：Node 复算 10 组样本，`(-0.5, 0)` 区间全部正确（-1 LSB）；浏览器中重新进入 shadowing，切片播放正常、状态机正常推进
- **确定性评分：95%**

---

## Bug #2 — review 页面未显示答案即可评分，破坏 FSRS 调度（已修复）

- **文件**：`src/app/review/ReviewClient.tsx`（`handleGrade`，键盘 1-4 与屏幕按钮共用此入口）
- **问题**：`handleGrade` 无 `showAnswer` 守卫。用户不点击"显示答案"直接按 1-4 或点评分按钮即可提交 FSRS 评级——对从未测试过的卡片打分，产生无意义的调度数据。
- **复现路径**：
  1. 打开 `/review`
  2. 不按空格/不点"显示答案"，直接按 "3"
  3. "已复习"计数 +1，队列 -1（卡片被按"良好"评级）
- **预期**：必须先显示答案才能评分
- **实际**：未显示答案即可评分
- **修复**：新增 `showAnswerRef` 镜像 `showAnswer`；`handleGrade` 开头 `if (!showAnswerRef.current) { toast(t("revealBeforeGrade")); return; }`。同时新增 en/zh-CN 翻译键。
- **回归验证**：
  - 答案隐藏时按 "3" / 点"良好" → 计数不变 + toast"请先显示答案" ✓
  - 答案显示后按 "3" → 正常评分 ✓
- **确定性评分：95%**

---

## Bug #3 — review 归档按钮使用过时闭包状态，与并发评分竞态（已修复）

- **文件**：`src/app/review/ReviewClient.tsx`（`handleArchive`，原 300 行）
- **问题**：`handleArchive` 使用组件闭包捕获的 `items`/`currentIndex` 做 `removeCurrentReviewItem`，而 `handleGrade` 正确使用 `itemsRef.current`/`currentIndexRef.current`。若评分 POST 在途时点击归档，归档 transition 会基于过时快照，可能恢复已移除卡片或跳过错误卡片。
- **复现路径**（时序敏感）：复习中按 "3" 评分后立即点"归档"，POST 未返回期间归档使用旧 items
- **预期**：归档与评分按最新状态正确组合
- **实际**：并发时基于过时快照移除卡片
- **修复**：`handleArchive` 改用 `itemsRef.current`/`currentIndexRef.current`
- **回归验证**：归档流程正常（队列 -1），全部 13 个 review 单测通过
- **确定性评分：90%**

---

## Bug #4 — vault play-all 播放中切换过滤器，播放继续指向已失效列表（已修复）

- **文件**：`src/app/vault/VaultListClient.tsx`、`src/app/vault/VaultPageClient.tsx`
- **问题**：`useVaultPlayback.ts:221-225` 注释明确说明"组件层应在过滤器变化时调用 stopPlayAll()"，但 `VaultListClient` 未实现；且页面顶部 `ExportButtons` 的难度/素材/日期过滤器直接调用 `VaultPageClient.updateQuery`，绕过列表组件。播放中切换过滤器后：
  - 播放条索引显示新列表位置，但音频元素仍在播旧列表句子；
  - 当前句结束回调 `playItemAtIndex(index+1, filteredItemsRef.current)` 使用**新列表**，跳到无关句子或提前结束。
- **复现路径**：
  1. 打开 `/vault`，点"全部播放"
  2. 播放中点顶部"困难"过滤器
  3. 播放条仍显示"停止"，音频继续播放旧列表，句子结束后跳转到新列表中的句子
- **预期**：过滤器变化（含 ExportButtons 路径）后停止播放
- **实际**：播放继续，索引/音频与屏幕列表脱节
- **修复**：
  - `VaultListClient` 新增 `handleQueryChange` 包装（先 `stopPlayAll()` 再 `onQueryChange`），替换全部内部查询变化调用点；
  - `VaultPageClient` 新增 `queryVersion` 计数并在 `updateQuery` 中递增，传给 `VaultListClient`；后者 `useEffect` 监听版本变化统一 `stopPlayAll()`（覆盖 ExportButtons 路径）。
- **回归验证**：
  - 播放中点"清除" → 停止 ✓
  - 播放中点 ExportButtons"困难" → 停止 + URL 正确更新 ✓
  - 全部 340 个测试通过
- **确定性评分：90%**
