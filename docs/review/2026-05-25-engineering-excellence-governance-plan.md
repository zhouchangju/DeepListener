# DeepListener 卓越工程治理执行计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` before every code change. Prefer `superpowers:subagent-driven-development` when the runtime supports subagents; otherwise execute task-by-task inline. Every task below is designed to preserve existing product behavior while removing weak engineering content.

**制定日期:** 2026-05-25  
**适用范围:** 当前 DeepListener 工作区代码与 `docs/review` 下既有审计文档。  
**目标:** 修正坏内容，保持现有功能可运行，并把项目推进到更稳定、可维护、可验证的工程状态。  
**架构原则:** 不做大爆炸重写；先收敛 API 契约、重复工具、状态常量、遗留端点和高风险边界，再逐步拆大组件和服务层。  
**技术栈:** Next.js App Router、React 19、TypeScript strict、Prisma SQLite、Zod、Node test runner、WaveSurfer、ffmpeg。

---

## 1. 治理边界

### 1.1 允许做的事

- 修正不稳定、重复、脆弱、不可测试或有安全风险的代码。
- 添加测试、helper、schema、纯函数和小型服务层。
- 替换重复逻辑为共享工具，但必须保持 UI 和接口行为兼容。
- 删除或收紧明显遗留且无调用方的危险 API，但必须先用 `rg` 确认调用方。

### 1.2 禁止做的事

- 不允许重写产品流程。
- 不允许改变上传、练习、复习、Vault、Dashboard、导出的用户路径。
- 不允许把未知产品决策伪装成工程优化，例如强行接入登录系统、云存储、任务队列。
- 不允许只为了“看起来高级”引入大型依赖或框架。
- 不允许先改生产代码再补测试。

### 1.3 当前事实基线

最新审计文档：`docs/review/2026-05-25-ai-coding-codebase-assessment.md`。  
当前已验证：

- `npm run lint` 通过。
- `npm run test:ci` 通过，98 个测试全绿。
- `npm run build` 通过。
- 当前工作区有 dictation/shadowing 相关未提交改动，本治理必须与其兼容。

## 2. 治理任务矩阵

评分标准：

- **优先级:** P0 必须先做；P1 高收益治理；P2 需要更多产品/部署决策。
- **重要性:** 1-10，越高越影响正确性、安全或维护。
- **收益率:** 1-10，越高表示投入小、收益明显。
- **风险:** 1-10，越高越容易破坏现有功能。
- **可自动化:** 1-10，越高越适合 AI 按文档执行。

| ID | 任务 | 优先级 | 重要性 | 收益率 | 风险 | 可自动化 | 验收证据 |
|---|---|---:|---:|---:|---:|---:|---|
| G-01 | 扩展 API runtime schema，覆盖 export/review-log 等裸请求 | P0 | 9 | 8 | 3 | 9 | schema tests + route 使用 `safeParse` |
| G-02 | 统一 API 错误响应 helper，减少 `new Response(JSON.stringify())` 和内部错误泄露 | P0 | 8 | 7 | 3 | 8 | response helper tests + routes 迁移 |
| G-03 | 收紧或废弃 `/api/review/log`，防止默认 rating=0 污染统计 | P0 | 8 | 8 | 2 | 9 | schema 拒绝缺 rating；无前端调用 |
| G-04 | 收敛前端下载 blob 逻辑 | P1 | 7 | 9 | 2 | 10 | helper tests + 4 处调用迁移 |
| G-05 | 收敛 Track 状态配置，避免 domain constants 与 `TrackList` 重复 | P1 | 7 | 8 | 2 | 9 | constants tests + UI 使用共享配置 |
| G-06 | 抽取 dashboard 聚合纯函数 | P1 | 7 | 6 | 4 | 7 | aggregation tests + page 行数下降 |
| G-07 | 合并三套富文本编辑器 | P1 | 8 | 6 | 5 | 6 | editor behavior tests + UI smoke |
| G-08 | 拆 `VaultListClient` 播放/过滤/list item 边界 | P1 | 8 | 5 | 6 | 5 | focused tests + manual smoke |
| G-09 | 拆 `ReviewClient` 队列 reducer 和 audio helper | P1 | 8 | 5 | 6 | 5 | queue reducer tests + review smoke |
| G-10 | 引入成熟 sanitizer 或受控富文本 AST | P2 | 9 | 5 | 6 | 5 | XSS payload tests + dependency review |
| G-11 | 认证、授权、CSRF、rate limit | P2 | 10 | 4 | 8 | 3 | 需要部署模式和用户模型决策 |
| G-12 | ffmpeg 导出队列化、并发全局限流、进度反馈 | P2 | 8 | 4 | 8 | 4 | 需要运行环境和 UX 决策 |
| G-13 | Prisma enum 化 status/difficulty 并迁移历史数据 | P2 | 8 | 5 | 7 | 5 | migrate dev + data migration tests |

## 3. 推荐执行批次

### Batch A：本次安全可落地治理

Batch A 只修正坏内容，不改变功能：

1. G-01 API schema 扩展。
2. G-02 API response helper。
3. G-03 review log route 收紧。
4. G-04 下载 helper。
5. G-05 Track 状态配置收敛。

Batch A 的目标是“降低熵、提升边界、保持行为”。

### Batch B：结构性拆分

Batch B 涉及较多 UI 文件，适合单独分支：

1. G-06 dashboard 聚合纯函数。
2. G-07 富文本编辑器合并。
3. G-08 VaultListClient 拆分。
4. G-09 ReviewClient 拆分。

Batch B 必须在 Batch A 全绿后执行。

### Batch C：产品/部署决策后执行

Batch C 不能由 AI 自行拍脑袋：

1. G-10 sanitizer 方案。
2. G-11 认证授权。
3. G-12 导出任务队列。
4. G-13 Prisma enum 迁移。

## 4. Batch A TDD 执行计划

### Task A1: 扩展 API Schema

**Files:**

- Modify: `src/lib/api-schemas.ts`
- Modify: `src/lib/api-schemas.test.ts`

**Goal:** 所有 export/review-log request body 都有运行时契约。

- [ ] **Step 1: 写失败测试**

在 `src/lib/api-schemas.test.ts` 追加：

```ts
import {
  audioExportSchema,
  libraryExportSchema,
  reviewLogSchema,
  vaultExportSchema,
} from "./api-schemas";

test("reviewLogSchema requires a review item id and supported rating", () => {
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1", rating: 3 }).success, true);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1" }).success, false);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "", rating: 3 }).success, false);
  assert.equal(reviewLogSchema.safeParse({ reviewItemId: "item-1", rating: 9 }).success, false);
});

test("audioExportSchema validates export type and filtered fields", () => {
  assert.equal(audioExportSchema.safeParse({ type: "due" }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "track", trackId: "track-1" }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "track" }).success, false);
  assert.equal(audioExportSchema.safeParse({ type: "filtered", difficulties: ["HARD"] }).success, true);
  assert.equal(audioExportSchema.safeParse({ type: "filtered", difficulties: ["NOPE"] }).success, false);
  assert.equal(audioExportSchema.safeParse({ type: "filtered", dateFrom: "2026-05-20", dateTo: "2026-05-19" }).success, false);
});

test("vaultExportSchema and libraryExportSchema reject malformed filters", () => {
  assert.equal(vaultExportSchema.safeParse({ tags: ["Vocab"], trackIds: ["track-1"] }).success, true);
  assert.equal(vaultExportSchema.safeParse({ tags: "Vocab" }).success, false);
  assert.equal(vaultExportSchema.safeParse({ dateFrom: "2026-05-20", dateTo: "2026-05-19" }).success, false);

  assert.equal(libraryExportSchema.safeParse({ trackType: "Lecture", selectedTrackIds: ["track-1"] }).success, true);
  assert.equal(libraryExportSchema.safeParse({ selectedTrackIds: [1] }).success, false);
  assert.equal(libraryExportSchema.safeParse({ dateFrom: "bad-date" }).success, false);
});
```

- [ ] **Step 2: 验证失败**

Run:

```bash
node --import tsx --test src/lib/api-schemas.test.ts
```

Expected: FAIL because new schema exports do not exist.

- [ ] **Step 3: 最小实现**

在 `src/lib/api-schemas.ts` 增加：

- `reviewLogSchema`
- `audioExportSchema`
- `vaultExportSchema`
- `libraryExportSchema`
- reusable `dateString` 和 `dateRangeRefinement`

- [ ] **Step 4: 验证通过**

Run:

```bash
node --import tsx --test src/lib/api-schemas.test.ts
```

Expected: PASS.

### Task A2: API Response Helper

**Files:**

- Create: `src/lib/api-response.ts`
- Create: `src/lib/api-response.test.ts`

**Goal:** JSON 错误响应统一，route 不再各写各的 `new Response(JSON.stringify(...))`。

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { badRequest, internalServerError, jsonError, notFound } from "./api-response";

test("jsonError returns a JSON response with a status code", async () => {
  const response = jsonError("Invalid input", 422);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  assert.deepEqual(await response.json(), { error: "Invalid input" });
});

test("named helpers keep client-safe messages", async () => {
  assert.equal(badRequest("Bad").status, 400);
  assert.equal(notFound("Missing").status, 404);
  const response = internalServerError();
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
});
```

- [ ] **Step 2: 验证失败**

Run:

```bash
node --import tsx --test src/lib/api-response.test.ts
```

Expected: FAIL because `api-response.ts` does not exist.

- [ ] **Step 3: 最小实现**

Create `src/lib/api-response.ts` with:

```ts
import { NextResponse } from "next/server";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function badRequest(error: string) {
  return jsonError(error, 400);
}

export function notFound(error: string) {
  return jsonError(error, 404);
}

export function internalServerError() {
  return jsonError("Internal server error", 500);
}
```

- [ ] **Step 4: 验证通过**

Run:

```bash
node --import tsx --test src/lib/api-response.test.ts
```

Expected: PASS.

### Task A3: Route 迁移到 Schema 和 Response Helper

**Files:**

- Modify: `src/app/api/review/log/route.ts`
- Modify: `src/app/api/vault/export/route.ts`
- Modify: `src/app/api/library/export/route.ts`
- Modify: `src/app/api/audio/export/route.ts`
- Modify: `src/app/api/vault/[id]/archive/route.ts`

**Goal:** 保持现有成功响应，非法 body 返回 400，系统错误不泄露内部 message。

- [ ] **Step 1: 写静态守卫测试**

Create `src/app/api/api-contract-policy.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CONTRACT_ROUTES = [
  "./review/log/route.ts",
  "./vault/export/route.ts",
  "./library/export/route.ts",
  "./audio/export/route.ts",
];

for (const routePath of CONTRACT_ROUTES) {
  test(`${routePath} uses shared api schema parsing`, () => {
    const source = readFileSync(new URL(routePath, import.meta.url), "utf8");
    assert.match(source, /safeParse\(/);
    assert.doesNotMatch(source, /const\s+\{[^}]+\}\s*=\s*await\s+req\.json\(\)/);
  });
}

test("archive route uses shared response helper", () => {
  const source = readFileSync(new URL("./vault/[id]/archive/route.ts", import.meta.url), "utf8");
  assert.match(source, /notFound\(/);
  assert.match(source, /internalServerError\(/);
  assert.doesNotMatch(source, /new Response\(\s*JSON\.stringify/);
});
```

- [ ] **Step 2: 验证失败**

Run:

```bash
node --import tsx --test src/app/api/api-contract-policy.test.ts
```

Expected: FAIL because routes still use direct destructuring or manual Response.

- [ ] **Step 3: 最小实现**

Update each route:

- Parse body with the schema from `src/lib/api-schemas.ts`.
- On parse failure return `badRequest(formatZodError(parsed.error))`.
- On not found return `notFound(...)`.
- On unexpected error log server-side and return `internalServerError()`.
- Keep download `new Response(buffer)` where response body is binary, but use helper for JSON errors.

- [ ] **Step 4: 验证通过**

Run:

```bash
node --import tsx --test src/app/api/api-contract-policy.test.ts src/lib/api-schemas.test.ts src/lib/api-response.test.ts
```

Expected: PASS.

### Task A4: 前端下载 Helper

**Files:**

- Create: `src/lib/client-download.ts`
- Create: `src/lib/client-download.test.ts`
- Modify: `src/app/review/ReviewClient.tsx`
- Modify: `src/app/practice/[id]/PracticeClient.tsx`
- Modify: `src/app/library/LibraryManager.tsx`
- Modify: `src/app/vault/ExportButtons.tsx`

**Goal:** 移除重复下载逻辑，保持下载行为不变。

- [ ] **Step 1: 写失败测试**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { getFilenameFromContentDisposition } from "./client-download";

test("getFilenameFromContentDisposition reads quoted filenames", () => {
  assert.equal(
    getFilenameFromContentDisposition('attachment; filename="DeepListener_Export.mp3"', "fallback.mp3"),
    "DeepListener_Export.mp3"
  );
});

test("getFilenameFromContentDisposition falls back for missing or unsafe names", () => {
  assert.equal(getFilenameFromContentDisposition(null, "fallback.mp3"), "fallback.mp3");
  assert.equal(getFilenameFromContentDisposition('attachment; filename="../bad.mp3"', "fallback.mp3"), "fallback.mp3");
});
```

- [ ] **Step 2: 验证失败**

Run:

```bash
node --import tsx --test src/lib/client-download.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: 最小实现**

Create helper with:

- `getFilenameFromContentDisposition`
- `downloadResponseBlob(response, fallbackName)`
- `downloadTextResponse(response, fallbackName)`

- [ ] **Step 4: 迁移调用点**

Replace repeated blob download blocks in:

- `ReviewClient.exportAudio`
- `PracticeClient.exportAudio`
- `LibraryManager.exportAudio`
- `ExportButtons.exportAudio`
- `ExportButtons.exportNotes`

- [ ] **Step 5: 验证通过**

Run:

```bash
node --import tsx --test src/lib/client-download.test.ts
npm run lint
```

Expected: PASS.

### Task A5: Track 状态配置收敛

**Files:**

- Modify: `src/lib/domain-constants.ts`
- Modify: `src/lib/domain-constants.test.ts`
- Modify: `src/app/library/TrackList.tsx`

**Goal:** Track status label 和 UI style 从共享常量读取，避免重复漂移。

- [ ] **Step 1: 写失败测试**

在 `src/lib/domain-constants.test.ts` 追加：

```ts
import { TRACK_STATUS_DISPLAY } from "./domain-constants";

test("every track status has display metadata", () => {
  for (const status of TRACK_STATUSES) {
    const display = TRACK_STATUS_DISPLAY[status];
    assert.equal(display.label, TRACK_STATUS_LABELS[status]);
    assert.match(display.textClass, /^text-/);
    assert.match(display.bgClass, /^bg-/);
  }
});
```

- [ ] **Step 2: 验证失败**

Run:

```bash
node --import tsx --test src/lib/domain-constants.test.ts
```

Expected: FAIL because `TRACK_STATUS_DISPLAY` does not exist.

- [ ] **Step 3: 最小实现**

Add `TRACK_STATUS_DISPLAY` to `src/lib/domain-constants.ts`.

- [ ] **Step 4: 迁移 TrackList**

Replace local `STATUS_CONFIG` with imported `TRACK_STATUS_DISPLAY`.

- [ ] **Step 5: 验证通过**

Run:

```bash
node --import tsx --test src/lib/domain-constants.test.ts
npm run lint
```

Expected: PASS.

## 5. Batch A 完成门禁

Batch A 完成前必须运行：

```bash
npm run lint
npm run test:ci
npm run build
```

通过标准：

- lint exit code 0。
- test:ci 0 fail。
- build exit code 0。
- 当前 dictation/shadowing 改动不被回退。
- 新增 helper 和 schema 有测试。
- 用户核心流程文件仍可编译。

## 6. Batch B 简化计划

Batch B 不应和 Batch A 混做。每个任务都要新建失败测试，再改实现。

### G-06 Dashboard 聚合纯函数

Create `src/app/dashboard/analytics.ts` and `src/app/dashboard/analytics.test.ts`。

抽出：

- `buildStabilityData`
- `buildRetentionData`
- `buildOverdueData`
- `buildPastFutureReviewData`
- `buildDailyStats`

验收：`page.tsx` 只负责查询和组装，不再持有 100+ 行统计细节。

本轮已完成：

- 新增 `src/app/dashboard/analytics.ts`。
- 新增 `src/app/dashboard/analytics.test.ts`。
- `src/app/dashboard/page.tsx` 从 286 行降到 139 行。
- 删除页面里未被 `DashboardTabs` 消费的 `statusData/typeData` 死计算。
- 覆盖稳定度分桶、留存率、逾期分桶、复习过去/未来队列、heatmap、tag、daily stats、时长格式。

### G-07 富文本编辑器合并

Create shared editor hook/component:

- `src/components/feature/rich-text/useRichTextEditor.ts`
- `src/components/feature/rich-text/useAutosavedRichTextNote.ts`
- `src/components/feature/rich-text/RichTextToolbar.tsx`
- migrate `NoteEditor` and `ReviewNoteEditor` to reuse shared pieces.

验收：现有 contentEditable caret tests 必须继续通过。

本轮已完成：

- 新增 `src/components/feature/rich-text/useRichTextEditor.ts`，集中 `contentEditable` 同步、HTML 读取、纯文本读取和富文本 command 调用。
- 新增 `src/components/feature/rich-text/useAutosavedRichTextNote.ts`，统一自动保存、保存状态、复制文本、快捷格式化行为。
- 新增 `src/components/feature/rich-text/RichTextToolbar.tsx`，统一三套编辑器的 toolbar、颜色按钮和 command 触发入口。
- `NoteEditor`、`ReviewNoteEditor`、`RichTextNoteEditor` 均已迁移到共享 hook/component。
- `document.execCommand` 只剩一个集中入口，旧编辑器不再各自散落 command 逻辑。
- 覆盖 caret 防抖、父级 echo 不重复写 `innerHTML`、三套编辑器复用共享 hook、autosave hook 复用。

### G-08 VaultListClient 拆分

Create:

- `src/app/vault/vault-items.ts`
- `src/app/vault/useVaultPlayback.ts`
- `src/app/vault/VaultFilters.tsx`
- `src/app/vault/VaultListItem.tsx`
- `src/app/vault/VaultPlayAllBar.tsx`

验收：`VaultListClient.tsx` 低于 300 行，并保持删除、归档、播放、筛选可用。

本轮已完成：

- 新增 `src/app/vault/vault-items.ts`，抽出 review date、过滤、排序、tag 收集、筛选状态切换、difficulty style 等纯逻辑。
- 新增 `src/app/vault/useVaultPlayback.ts`，集中批量播放状态、audio 生命周期、播放速度和定时跳转。
- 新增 `VaultFilters`、`VaultListItem`、`VaultPlayAllBar` 三个边界明确的展示组件。
- `VaultListClient.tsx` 从 672 行降到 219 行，低于治理目标 300 行。
- 覆盖 optional review date、过滤组合、排序、filter state、结构委托等测试。

### G-09 ReviewClient 拆分

Create:

- `src/app/review/review-queue.ts`
- `src/app/review/useReviewAudio.ts`
- `src/app/review/ReviewCard.tsx`

验收：Review queue reducer 有测试，`window.location.reload()` 被 `router.refresh()` 或明确状态更新替代。

本轮已完成：

- 新增 `src/app/review/review-queue.ts`。
- 新增 `src/app/review/review-queue.test.ts`。
- `ReviewClient` 评分和归档都通过 `removeCurrentReviewItem` 更新队列。
- 删除 `window.location.reload()`，完成时改为受控状态更新后调用 `router.refresh()`。
- 覆盖“移除中间项”“移除最后一项索引钳制”“移除唯一项完成队列”三类状态机边界。
- 新增 `src/app/review/useReviewAudio.ts`，集中 segment audio 创建、播放速度同步、生命周期清理和定点播放。
- 新增 `src/app/review/ReviewCard.tsx`，集中复习卡片展示、答案揭示、笔记渲染和评分按钮。
- `ReviewClient` 不再直接 `new Audio`、不再持有 audio/current item refs、不再内联大块 flashcard UI。
- `ReviewClient.tsx` 从 495 行降到 354 行。队列、audio、card 三个高风险边界已拆出；剩余 edit modal/数据刷新逻辑暂不继续拆，避免把一次治理扩大成 UI 重写。

## 7. Batch C 决策清单

执行 Batch C 前必须回答：

1. 项目是否只在本机单用户运行？
2. 是否会部署到公网？
3. 是否需要多用户隔离？
4. 上传音频是否包含隐私内容？
5. 导出任务是否允许等待后台完成？
6. 是否接受引入新依赖，例如 DOMPurify、BullMQ、Auth.js？

未回答前，AI 不得擅自接入认证系统、队列系统或新数据库迁移。

## 8. 自检反思记录

### Self-check 1

问题：第一版计划如果把“认证、队列、Prisma enum 迁移”放进本次执行，会高概率破坏现有功能，且缺少产品决策。  
修正：拆成 Batch C，标为需要决策，不允许 AI 擅自实施。

### Self-check 2

问题：只写“拆大组件”不够可执行。  
修正：为 Batch B 指定目标文件、目标 hook/component、行数目标和测试要求。

### Self-check 3

问题：文档如果只描述优先级，没有 TDD 细节，不适合 AI 执行。  
修正：为 Batch A 每个任务写入具体测试代码、命令和预期失败/通过状态。

### Self-check 4

问题：过度追求“顶尖”容易变成重写系统。  
修正：加入治理边界，明确只修坏内容，不改变现有工作流。

### Self-check 5

问题：计划可能忽略当前未提交 dictation/shadowing 改动。  
修正：在基线和完成门禁里明确不能回退这些改动。

### Self-check 6

问题：只完成 Batch A 仍无法回应“结构质量”问题，因为最大的问题之一是页面承载业务统计。  
修正：追加执行 G-06，把 Dashboard 统计逻辑抽成纯函数并用测试固定语义。

### Self-check 7

问题：`ReviewClient` 的硬刷新不只是体验粗糙，还是队列状态机缺陷的遮羞布。  
修正：追加执行 G-09 的队列子任务，先写 reducer 级失败测试，再替换 `window.location.reload()`。

### Self-check 8

问题：如果把 G-10/G-11/G-12/G-13 都声称完成，就是自欺欺人。它们涉及安全依赖、认证模型、运行时队列和数据库迁移，不是纯代码洁癖能拍板的事项。  
修正：本轮完成已有证据和测试能闭环的任务；剩余项保留为可执行 backlog，不伪装成已经卓越。

### Self-check 9

问题：文档若不记录实际验证结果，后续 AI 容易重复做已完成事项或跳过门禁。  
修正：新增本轮执行结果表和验证命令。

### Self-check 10

问题：继续拆 `ReviewClient` 的 edit modal、引入 DOMPurify、改认证或把导出队列化，表面上更“高级”，实际上会越过产品边界和部署边界。  
修正：将当前闭环停在高收益、低产品决策依赖的重构点；保留剩余风险为明确决策项，要求先回答 Batch C 问题再执行。

## 9. 本轮执行结果

| ID | 状态 | 证据 | 备注 |
|---|---|---|---|
| G-01 | 已完成 | `src/lib/api-schemas.test.ts`、API routes 使用 `safeParse` | 覆盖 review-log、vault export、library export、audio export |
| G-02 | 已完成 | `src/lib/api-response.test.ts`、API contract policy tests | JSON 错误响应统一，内部错误不直接泄露 |
| G-03 | 已完成 | `reviewLogSchema` 要求 rating，route 使用 schema | 避免默认 `rating=0` 污染统计 |
| G-04 | 已完成 | `src/lib/client-download.test.ts`、4 处前端调用迁移 | 下载逻辑收敛为 helper |
| G-05 | 已完成 | `src/lib/domain-constants.test.ts`、`TrackList` 使用共享 display metadata | 状态 label/style 不再局部复制 |
| G-06 | 已完成 | `src/app/dashboard/analytics.test.ts`、`page.tsx` 降到 139 行 | Dashboard 统计逻辑可测试 |
| G-07 | 已完成 | `rich-text-consolidation.test.ts`、`contentEditable-sync.test.ts`、`RichTextNoteEditor.test.ts` | 三套富文本编辑器复用共享 toolbar、contentEditable hook、autosave hook |
| G-08 | 已完成 | `vault-items.test.ts`、`VaultListClient.structure.test.ts`、`VaultListClient.test.ts` | Vault 过滤/排序/播放/列表项边界已拆，client 降到 219 行 |
| G-09 | 已完成 | `review-queue.test.ts`、`ReviewClient.test.ts` 静态守卫 | 队列 reducer、硬刷新替换、audio hook、ReviewCard 边界均完成 |
| G-10-G-13 | 未执行 | 需要产品/部署决策 | 不允许 AI 擅自拍板 |

最终验证结果：

- `npm run lint` 通过。
- `npm run test:ci` 通过，98 个测试全绿。
- `npm run build` 通过，Next.js production build 成功。
- `git diff --check` 通过，无 whitespace error。

本轮没有处理的内容不是“忘了做”，而是不能由 AI 在无产品输入的情况下擅自做：

- G-10 是否引入 DOMPurify 或改成受控富文本 AST，需要依赖策略和浏览器/服务端净化方案确认。
- G-11 认证、授权、CSRF、rate limit 需要确认是否公网、多用户、权限模型和会话方案。
- G-12 ffmpeg 队列化需要确认部署环境、后台任务模型、进度 UI 和失败重试策略。
- G-13 Prisma enum 迁移需要确认历史数据兼容、迁移窗口和回滚策略。

本轮验证命令：

```bash
npm run lint
npm run test:ci
npm run build
```

验证结果：

- `npm run lint` exit code 0。
- `npm run test:ci` exit code 0，98 个测试全部通过。
- `npm run build` exit code 0，Next.js production build 成功。

## 10. AI 执行提示词

给后续 AI 的建议提示：

```text
你在 /Users/leozhou/git/DeepListener 工作。先阅读 docs/review/2026-05-25-engineering-excellence-governance-plan.md。
必须使用 TDD：每个任务先写失败测试，运行确认失败，再写实现，再运行目标测试。
Batch A、G-06、G-07、G-08、G-09 已经完成，不要重复施工。
G-10、G-11、G-12、G-13 必须先拿到产品/部署决策，不能擅自拍板。
不得回退用户已有未提交改动。
完成后运行 npm run lint、npm run test:ci、npm run build。
```
