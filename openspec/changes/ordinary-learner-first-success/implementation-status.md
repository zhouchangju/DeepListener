# 当前实施状态与证据

更新时间：2026-08-05

本文是本变更的当前事实补充。`proposal.md`、`prd.md`、`design.md` 和 `spec.md` 仍描述目标状态；它们不因代码存在就自动视为全部验收通过。

## 总体结论

首屏引导、readiness 恢复、Provider 决策、字幕配对、可恢复导入、恢复 UI，以及本轮新增的 manifest 备份/恢复和脱敏诊断 API 已形成可运行实现，并有定向测试、故障注入、disposable root/Prisma 和生产构建证据。正式发布仍未通过：真实英语 Demo 资产、跨平台干净安装、目标用户观察、屏幕阅读器/200% 缩放人工证据、真实 Provider 网络调用和真实 FFmpeg 视频链路仍缺失。

## Requirement 对账

| Requirement | 当前状态 | 已有证据 | 未完成/限制 |
| --- | --- | --- | --- |
| OFS-001 | 部分实现 | `src/lib/setup-readiness.ts`、Desktop 启动恢复代码、readiness tests | clean install、打包运行时和发行包资产尚未在目标 OS 验证 |
| OFS-002 | 已实现代码；待平台验收 | 数据依赖路由门控、Demo API readiness recovery、Setup 恢复页、readiness/route tests | 仍需干净配置和失败迁移 E2E |
| OFS-003 | 已实现代码；待用户验收 | `src/components/onboarding/**`、AppShell、Demo CTA、键盘/焦点 tests | 目标用户旅程和窄屏/辅助技术人工验证待做 |
| OFS-004 | 部分实现，HG-01 阻塞 | Demo journey 状态机、Practice handoff、Demo 隔离代码 | 当前 `public/demo/demo-listening.mp3` 仍为合成音；真实语音、provenance、版权/再分发批准未提供 |
| OFS-005 | 已实现代码；fake Provider E2E 通过，待真实 Provider 验证 | Provider 向导、官方链接、显式连接测试、密钥不回显 tests；Setup 仅标记一个默认推荐起点；配额/换 Provider/超时故障注入 | 未使用真实密钥；网络、配额和真实跨 Provider 成功率仍未做 E2E；默认推荐仍待 HG-02 产品批准 |
| OFS-006 | 已实现代码；disposable Prisma 通过，待真实媒体 E2E | SRT/VTT 解析、媒体匹配、sidecar API、ImportMediaWizard、激活幂等、真实 disposable Prisma Track 测试 | 真实视频/FFmpeg 提取与 embedded-subtitle 路径仍需有 FFmpeg 的环境验证 |
| OFS-007 | 核心实现；故障注入与进程级恢复验证通过 | manifest 原子写入、operation staging、空间预检、锁、重试/换 Provider API、批量上传迁移、失败恢复 UI、timeout/late-response/DB/stale-lock/child-process restart tests | 真实 Provider timeout 和并发多进程 retry 仍需在发行环境验证 |
| OFS-008 | 已实现代码；待用户验收 | 中英文 key parity、首次会话文案、恢复文案、`first-session-language.test.ts` allow/deny 审计 | 仍需在完整目标用户旅程中确认语言切换体验 |
| OFS-009 | 部分实现 | 引导 focus/Escape、短视口/200% zoom 下可滚动气泡、恢复 `aria-live`、Provider/批量状态 accessible semantics、窄屏 Setup smoke、全局 reduced-motion CSS | 200% zoom、屏幕阅读器和 reduced-motion 实机人工验收未完成 |
| OFS-010 | 未通过 | Harness 合同、保护数据规则、定向质量证据 | HG-01～HG-04、macOS/Windows clean install、5 名目标用户和最终发布证据均未关闭 |

## 已实现的关键行为

- 单文件和批量媒体上传均先创建 operation-owned import job；转写失败不删除唯一媒体副本。
- 激活前复制到最终媒体目录但保留 staging；只有 manifest 持久化为 `ACTIVATED` 后才清理 staging。
- 同一 operation 使用确定性 Track ID，重复 resume 不创建第二条 Track。
- 活跃转写期间禁止替换字幕或确认删除；取消与恢复请求不会把已取消 operation 重新激活。
- 字幕替换使用新的 operation 内部 key，解析失败不会覆盖原来有效的 sidecar。
- 每次 Provider/转写执行记录不含密钥的 attempt ID；完成、超时和迟到结果按当前 attempt fencing；生产默认 Provider 不变，测试可注入 fake adapter 和短 timeout。
- 配额、rate-limit、网络失败统一转为安全的换 Provider/重试提示，不回显 SDK 或凭据错误细节。
- 子进程被终止后，持久化 manifest 与过期 lock 可在新进程中恢复，且不会创建第二条 Track。
- Provider 连接测试只在用户显式操作后发生，只写入 OS 临时目录，不创建 Track 或 import manifest。
- 首次会话默认文案已移除 FSRS、SQLite、BYOK 等内部术语；Setup 卡片默认只显示学习者语言状态，Node/SQLite/FFmpeg、环境变量和具体修复命令通过“技术详情”渐进披露。`src/i18n/first-session-language.test.ts` 与 `src/app/setup/page.structure.test.ts` 固化该边界。
- Setup 汇总卡在存在阻塞项时提供跳转到检查项的真实目的地，不再呈现不可操作的 disabled CTA；批量导入在请求进行中把每个条目标记为 uploading，并以本地化文本向屏幕阅读器报告 pending/uploading/success/error。
- Setup 的“选择最简单路径”现在是可执行决策入口：内嵌字幕和 SRT/VTT 旁挂字幕会深链并自动打开导入向导，服务商入口直接定位到“配置服务商”按钮，Demo 入口通过显式 query 启动首页 Demo；导入向导在处理期间提供 `role=status` 的中英文 live region。
- 首页和引导 Demo CTA 在检测到已知数据库未就绪时返回安全的 `DATABASE_NOT_READY` 状态并导航到 Setup，不再把普通学习者留在通用 500 错误上。
- Setup 的 Provider 决策卡现在对 Deepgram 显示唯一的本地化“推荐起点”标记，同时保留 OpenAI 和 Google 的官方入口与比较说明；该标记只表达当前默认起点，不声称地区可用性、价格或网络成功率。

## 质量证据

- `npm run lint`：通过，0 warning。
- `npm run build`：通过。`scripts/next-build.mjs` 现在在 Windows 临时目录与工作区跨盘时自动回退到 `.next` 同卷清理路径，不再要求用户手动设置 `TEMP`/`TMP`；仍有 1 条非阻塞 Turbopack NFT tracing warning。
- `npm run desktop:preflight`：按预期阻断公开发行，原因是缺少 bundled FFmpeg/ffprobe 和真实 Demo provenance；这两个阻断项未被绕过。
- 定向导入、Provider、字幕、引导、readiness 和 i18n tests：通过。
- `npm run test:ci`：当前 Windows 环境 495 个测试中 493 个通过、0 个失败、2 个明确跳过（Windows 不提供 POSIX 0600 mode bits；symlink 场景受创建权限限制）；测试 runner 同时收集 `src/**/*.test.ts(x)` 与 `desktop/**/*.test.js`。路径、CRLF、junction、disposable sqlite、API 合同、Demo readiness handoff、首次会话术语策略、Setup 渐进披露、可执行决策路径、Provider 推荐起点、无服务商导入快速阻断、字幕内容上传前预检、Provider/批量导入 accessible semantics、Practice/Shadowing/Review/Library/Vault playback controls、child-process restart、备份恢复、原生备份导入/导出、bounded logger、原生诊断导出和运行时资产契约均通过。跳过项只覆盖环境能力，不替代 Windows ACL/symlink 人工审查。

## 人工闸门

- **HG-01 Demo 资产**：需要用户批准真实英语脚本、音频来源/说话人、再分发许可、provenance、checksum 和最终时间轴。AI 不自行替换当前 Demo 音频。
- **HG-02 Provider 推荐**：需要批准默认推荐的地区、网络和成本说明。
- **HG-03 发行资格**：需要平台打包、签名、notarization/Windows 发布证据。
- **HG-04 目标用户**：需要至少 5 名不会软件开发的英语学习者完成观察和复测。

## 下一步

1. 在 disposable data root 上补真实音频/视频 + sidecar 的 FFmpeg/Track E2E，以及真实 Provider timeout 和多进程 retry 验证（Provider fake 的 timeout/retry/late-response/DB/stale-lock/child-process restart 已通过）。
2. 完成 200% zoom、屏幕阅读器、reduced-motion 和完整浏览器旅程审查。
3. 用户提供并批准真实 Demo 资产后关闭 HG-01。
4. 完成 macOS/Windows clean install、打包和目标用户观察后，才可把 OFS-010 标为通过。

## 2026-08-04 数据可移植性实现增补

本轮在 disposable data root 上完成了三个可执行能力面：

- `src/lib/backup-service.ts`：创建 `deeplistener-backup` v1 目录 bundle，只包含相对路径的数据库和音频/视频媒体；每个文件记录大小与 SHA-256，数据库执行 SQLite `quick_check`；拒绝遍历、外部 symlink、损坏或不完整 bundle。
- `src/app/api/backups/route.ts`：列出有效本地备份、创建备份、分阶段恢复，并在替换已有数据前要求显式确认；激活前保留同级 previous-root 作为回滚证据。Desktop 原生导出/导入通过 staging 目录接入，API 会再次验证 manifest、大小、checksum 与 SQLite 后才提升为本地备份；恢复仍必须经过现有显式冲突确认流程。
- `src/lib/diagnostics.ts` 与 `src/app/api/diagnostics/route.ts`：导出 allow-list JSON，包含运行时/目录/Provider 配置状态、前次启动失败摘要和有限结构化日志；密钥、token、绝对路径、转写/笔记/媒体内容不进入导出。Desktop 主进程现在会写入并在成功启动后清理 bounded startup-failure summary。
- `desktop/bounded-log.js`：Desktop 主进程日志写入 `<data-root>/logs/desktop.log`，默认单文件上限 512 KiB、保留 3 个历史文件；目录不可写时降级到 stdout/stderr，不阻塞启动。日志写入复用已有脱敏边界。
- `desktop/native-export.js`、`desktop/native-backup.js`、`desktop/main.js`、`desktop/preload.js`：Electron 通过无参数 IPC 打开原生 JSON 诊断导出、备份目录导出和备份目录导入对话框；renderer 不接收路径、不暴露 `fs`/任意 IPC。导出目标拒绝覆盖已有目录并在复制后重新校验；导入先复制到 `.deeplistener-backup-import-<uuid>` staging，API 验证通过后才提升为本地备份，非法 staging 会被清理且不触碰活动数据；浏览器环境继续使用服务端下载/选择回退。

验证证据：`backup-service.test.ts`、`diagnostics.test.ts`、`/api/backups` 和 `/api/diagnostics` 相关套件覆盖备份创建、校验、冲突恢复、原生导入 staging、非法 staging 清理和诊断导出；Desktop startup contract、`desktop/bounded-log.test.js`、`desktop/native-export-contract.test.js` 与 `desktop/native-backup-contract.test.js` 均通过。`npm run lint`、`npm run test:ci`（451 个测试，449 通过，2 个明确跳过）和生产 `npm run build` 通过。Windows 默认临时目录跨盘的 `EXDEV` 已由 `scripts/next-build.mjs` 的同卷 fallback 处理；Turbopack 仍提示动态文件路径 NFT tracing warning，未绕过该警告。

## 2026-08-04 Browser smoke evidence

Local Codex in-app browser smoke evidence is recorded in
`docs/agent-harness/sessions/2026-08-04-ordinary-first-success/browser-smoke-2026-08-04.md`.
It covers the landing CTA split, Setup progressive disclosure, onboarding
dialog focus return, the 640x900 narrow layout, the provider-settings deep
link, and the bounded database-not-ready route. This is not a substitute for
real 200% zoom, screen-reader, reduced-motion, or HG-04 learner acceptance;
those gates remain open.

## 2026-08-05 Provider deep-link follow-up

`/setup#provider-settings` now opens the actual Provider configuration dialog
on mount and on subsequent hash changes while the Setup page remains open.
This closes the extra discovery click for the learner-facing decision card;
the existing `配置服务商` button remains available as the non-deep-link path.
Evidence: `src/app/setup/ProviderCardActions.test.ts`, targeted lint/test,
and a local browser check that observed one labelled Provider dialog after
navigating directly to the deep link. No provider request or key entry was
performed.

## 2026-08-05 Setup-first onboarding follow-up

The global onboarding tour no longer auto-opens on `/setup`; Setup is already
the learner's readiness-first recovery surface and should not be obscured by a
tour whose first step points to Library. The global navigation `引导` control
still provides an explicit replay action on Setup. Evidence:
`src/components/app-shell/AppShell.test.ts` and the browser smoke record.

## 2026-08-05 Desktop preflight message follow-up

`npm run desktop:preflight -- --allow-system-ffmpeg --allow-synthetic-demo`
now distinguishes a missing system `ffmpeg`/`ffprobe` alpha prerequisite from
the normal public-release asset block. The public preflight remains fail-closed;
the change only makes the recovery instruction truthful when the alpha flag is
already present. Evidence: `src/lib/desktop-packaging-contract.test.ts` and
the observed Windows output in the current environment.

## T311 Privacy Boundary Evidence

Automated privacy-boundary evidence is complete; see [privacy-boundary-report.md](../../../docs/agent-harness/sessions/2026-08-04-ordinary-first-success/privacy-boundary-report.md).

- Demo and Setup opening paths do not construct or call a transcription Provider.
- SRT/VTT sidecar import keeps Provider factory calls at zero.
- Explicit connectivity tests call only the selected Provider and remove the temporary sample before responding.
- Provider failures, transcript text, media errors, absolute paths, and secret values are not returned or written to the relevant diagnostics.
- Desktop main-process diagnostics now redact credentials and absolute private paths before writing logs.
- This evidence does not replace real Provider/network E2E and does not close HG-01 through HG-04 or OFS-010.

## 2026-08-05 Provider status self-check follow-up

The provider configuration slice now has a bounded, explicit connectivity taxonomy: credential/authentication failures become `invalid`; network, proxy, quota, and timeout failures become `unknown`; an empty provider transcript is rejected instead of being marked verified. The probe still uses only the selected provider credential, writes the sample to an OS temporary directory, returns a count rather than transcript text, and removes the temporary sample before responding.

Evidence: `src/app/api/setup/provider/test/route.test.ts` and `src/lib/upload-error.test.ts` targeted 22/22 passed; the full suite reports 551 passed, 2 Windows capability skips, and 0 failures; `npm run lint` and `npm run build` passed. The Settings dialog exposes status, explicit external-request consent, sample selection, replacement, and removal. A browser check confirmed deep-link open, Esc close, and focus return to the configuration button. Screen-reader, configured-provider consent flow, real provider/network, clean-install, and target-learner gates remain open.

## 2026-08-05 T133 local semantics follow-up

The Provider Settings dialog now exposes the connectivity consent disclosure
through `aria-describedby`, announces status changes as an atomic live region,
and keeps the request guard explicit: no sample request is sent unless a
configured provider, sample file, and checked consent are all present. The
structure contract covers these relationships. `npm run lint`, `npm run build`,
the focused Provider Settings tests (5/5), and `npm run test:ci` (559 passed,
2 Windows capability skips) all pass. This closes the local semantic slice;
manual screen-reader and configured-provider browser checks remain human gates.

## Automated audit addendum

- T310: [accessibility-audit.md](../../../docs/agent-harness/sessions/2026-08-04-ordinary-first-success/accessibility-audit.md) records automated accessibility evidence; manual zoom, screen-reader, reduced-motion, and learner observation remain open.
- T312: [import-recovery-report.md](../../../docs/agent-harness/sessions/2026-08-04-ordinary-first-success/import-recovery-report.md) — 10 focused recovery scenarios passed.
- T314: [filesystem-restart-report.md](../../../docs/agent-harness/sessions/2026-08-04-ordinary-first-success/filesystem-restart-report.md) — 8 focused filesystem/restart scenarios passed.
- T315: [concurrency-idempotency-report.md](../../../docs/agent-harness/sessions/2026-08-04-ordinary-first-success/concurrency-idempotency-report.md) — duplicate activation and attempt-fencing scenarios passed.
- Latest full test run: 464 tests, 462 passed, 2 environment-limited skips, 0 failures. `scripts/run-node-tests.mjs` includes Desktop JavaScript contract tests. This supersedes the earlier pre-T311, pre-desktop-portability, pre-native-export, pre-runtime-asset, and pre-executable-decision-path counts in the historical quality-evidence notes above.

## 2026-08-04 Desktop runtime asset contract implementation

本轮补齐了此前文档中只存在设计、但会直接影响普通用户安装成功率的运行时资产边界：

- `src/lib/runtime-asset-manifest.ts`：实现版本化 manifest、相对路径防穿越、平台/架构匹配、许可证与 nonfree/GPL 一致性、FFmpeg 能力下限和 SHA-256 校验；`resolveRuntimeAsset` 只在文件内容与 manifest 一致时返回路径。
- `desktop/runtime-assets.js`：为 Electron 主进程提供不依赖 TypeScript 的同等校验适配器；要求 ffmpeg/ffprobe 成对存在，任一缺失、篡改或平台不匹配都拒绝启动媒体工具。
- `desktop/main.js` 与 `src/lib/setup-readiness.ts`：打包 Desktop 使用已验证 manifest 的绝对路径；校验失败时设置明确的 missing 状态和不存在的 sentinel 路径，禁止 fluent-ffmpeg 回退到用户 PATH。Server/开发环境保留原有显式环境变量和 PATH 行为。
- `scripts/desktop-package.mjs` 与 `scripts/desktop-preflight.mjs`：不再硬编码 darwin-arm64；按 `DEEPLISTENER_TARGET_PLATFORM`/`DEEPLISTENER_TARGET_ARCH` 选择 Prisma engine，按目标目录复制媒体工具，并且只有在真实二进制与 `assets.json` 元数据齐全时才生成并校验 `runtime/assets.manifest.json`。

证据：新增 runtime asset、Electron adapter、readiness、启动合同、packaging contract 和可执行决策路径测试；`npm run test:ci` 当前 451/449/2/0。当前仓库没有真实可再分发 FFmpeg/ffprobe 二进制和 provenance，公开 Desktop preflight 仍按设计阻断；这不是用虚假资产绕过的实现缺口。

## 2026-08-04 构建跨盘恢复补充

自检发现 Windows 的系统临时目录位于 C 盘、工作区位于 D 盘时，旧 standalone 输出的跨盘 `rename` 会触发 `EXDEV`，使普通 `npm run verify` 在 build 阶段中断。已在 `scripts/next-build.mjs` 增加最小恢复路径：优先使用系统临时目录；遇到 `EXDEV` 时改用 `.next` 内同卷的 disposable sibling，再按原有有界重试清理。`src/lib/ci-workflow.test.ts` 固化该合同。

验证：针对性 CI 合同测试 8/8 通过；默认环境 `npm run build` 通过；`npm run lint` 通过。该修复不触碰数据库、媒体、密钥或网络同步。

## 2026-08-04 可执行决策路径补充

Setup 原先的字幕/转写决策卡只有说明文字，无法兑现“选择这条路径”的动作承诺。现已补齐四条真实入口：

- `?import=media`：打开资料库并自动打开媒体导入向导，用于带内嵌字幕的视频或音频。
- `?import=subtitle`：打开同一向导并提供 SRT/VTT 选择，用于无 Provider 的旁挂字幕路径。
- `#provider-settings`：定位到实际的服务商配置按钮，而非只停留在比较卡片。
- `/?demo=1`：从 Setup 返回首页后，仅对这个用户主动点击产生的 query 触发 Demo API；普通首页访问不产生副作用。

证据：`src/app/setup/page.structure.test.ts`、`src/app/library/UploadButton.test.ts`、`src/app/library/ImportMediaWizard.test.ts`、`src/app/page.first-success.test.ts`；相关定向测试与 lint 通过，生产 build 通过。

## 2026-08-05 自检与质量门更新

- `npm run verify`：lint 通过；`npm run test:ci` 共 460 个测试，458 通过、2 个 Windows 环境限制跳过、0 失败；生产 `npm run build` 通过。构建仍有 1 条非阻塞 Turbopack NFT tracing warning，未通过放宽规则绕过。
- `npm run desktop:preflight -- --allow-system-ffmpeg --allow-synthetic-demo` 按设计 fail-closed：当前 Windows 环境没有 `ffmpeg`/`ffprobe`，命令明确要求安装两者或提供目标平台可再分发资产；没有把 `--allow-system-ffmpeg` 当成虚假的工具存在证明。
- 本次自检未发现 `prisma/dev.db`、`public/uploads/`、`public/videos/`、`.env*` 的工作区变更。正式发布闸门仍由真实 Demo provenance、真实媒体工具、跨平台 clean install、真实 Provider 网络 E2E 和目标用户/辅助技术人工验收决定。

## 2026-08-05 浏览器发现与本地化修复

- 浏览器冒烟发现：中文 `/setup#provider-settings` 深链虽然正确打开了配置对话框，但 Dialog 原语的关闭按钮仍向辅助技术报告英文 `Close`。
- 修复：`DialogContent` 新增可注入的 `closeLabel`；Provider、媒体导入、批量导入、重命名、收藏编辑、诊断和快捷键对话框统一传入当前语言的 `common.close`。这只改变可访问名称，不改变关闭行为或数据边界。
- 证据：浏览器复核中中文关闭按钮数量为 1，英文 `Close` 按钮数量为 0；`ProviderConfigDialog.structure.test.ts`、相关 18 个定向测试、`npm run lint` 和完整 `npm run verify` 均通过（460/458/2/0，生产 build 通过）。

## 2026-08-05 中文首成功路径本地化补充

- 修复 `library.viewTracks` 的中文回退值（由英文 `Tracks` 改为“素材”）。富文本颜色按钮新增中英文 `colors.*` 翻译，并同时写入 `title` 和 `aria-label`；自定义颜色仍可使用调用方传入的 `label`。
- 同步把中文状态标签中的 `Shadowing`、`Speed Shadowing`、`Paraphrase` 改为“跟读”“倍速跟读”“复述”，避免学习流程中出现未解释的英文模式名。
- 将跟读模式标题中的 `Chunk` 改为“语块”，并把该术语加入中文首成功路径回归测试。
- Practice 与 Shadowing 中的盲听、重命名、收藏、关闭、句子跟读/复制、波形播放/清除/循环和听写复制按钮补齐了与当前语言一致的 `aria-label`；新增结构测试覆盖窄屏和宽屏两套句子操作布局。
- Review 衔接页的播放与快捷键帮助图标改为可键盘聚焦、可本地化命名的按钮，避免只显示图标却无法发现或操作。
- 听写输入框补充本地化 `aria-label`，不再仅依赖 placeholder 作为字段名称。
- Library 批量播放、Vault 单句播放与 Play All 控件补齐本地化 `title/aria-label`，新增回归测试，覆盖暂停、继续、下一句和停止等状态。
- 新增 `src/components/feature/rich-text/RichTextToolbar.test.ts`，覆盖颜色翻译 key parity 和中文素材切换器回退检查。
- 定向测试与 lint 通过；最新完整 `npm run verify`：460 个测试，458 通过、2 个 Windows 环境限制跳过、0 失败；生产 build 通过，仍有 1 条非阻塞 Turbopack NFT tracing warning。

## 2026-08-05 隔离首次成功旅程补充

- 在临时 `DEEPLISTENER_DATA_DIR` 上启动可写开发 profile，真实浏览器验证 `/?demo=1`：Demo 创建后进入 Practice，自动新手引导不再覆盖页面；完成播放、揭示/选句、收藏和复习衔接后，五步状态全部完成。
- 同一旅程发现 Practice 播放器的 `Play`、`Position`、`Loop`、`Clear` 和波形操作提示仍是英文；已接入 `feature.audioPlayer` 的中英文 key，并在浏览器确认中文名称全部生效。
- 同一 profile 验证 `/library?import=subtitle`：仅打开字幕导入对话框，不再与自动新手引导叠加；页面明确说明不需要 Provider API 密钥。
- 修复覆盖 `AppShell` 的显式 Demo/导入深链门控、播放器/波形本地化和对应测试。定向测试 14/14 通过；完整 `npm run verify` 已通过（460/458/2/0，生产 build 通过）。外部 HG-01～HG-04 仍未关闭。

## 2026-08-05 全局控件审计补充

- 素材卡片的“打开”和批量选择辅助标签改用 `library.openTrack` / `library.selectTrack`，补齐中英文消息，避免中文界面回退为硬编码英文。
- Vault 日期范围的 X 清除控件新增本地化 `aria-label`，保留原有 tooltip 和清除行为。
- 新增 `TrackList.accessibility.test.ts` 与 `ExportButtons.accessibility.test.ts`，锁定上述可访问名称合同。
- 本轮验证：定向测试 2/2 通过；`npm run lint` 通过；`npm run build` 通过（仍有 1 条非阻塞 Turbopack NFT tracing warning）；`npm run test:ci` 共 462 个测试，460 通过、2 个 Windows 环境限制跳过、0 失败。
- 目标仍保持 active。HG-01～HG-04、真实 Provider/FFmpeg E2E、跨平台 clean install、200% 缩放/屏幕阅读器/Reduced Motion 实机验收和最终 OpenSpec 归档仍是外部闸门，不能由本地测试虚构关闭。

## 2026-08-05 键盘筛选与句子选择补充

- Vault 筛选折叠栏由鼠标专用 `div` 改为带 `aria-expanded` / `aria-controls` 的真实按钮；搜索框补充显式 `label` 关联，难度、标签和排序按钮明确 `type="button"`。
- Library 与 Vault 的日期范围输入补充中英文“开始日期/结束日期”可访问名称；日期清除控件继续保留本地化 `title` 与 `aria-label`。
- Practice 句子卡支持键盘聚焦、Enter/空格选句，并以本地化句号标签暴露当前操作；内部跟读、复制、收藏按钮的键盘事件不会重复触发选句。
- Shadowing 盲听揭示区域支持键盘触发，文本编辑框补充本地化 `aria-label`。
- 新增 `VaultFilters.accessibility.test.ts`、`LibraryManager.accessibility.test.ts`，并扩展句子/Shadowing 结构测试。
- 本轮验证：定向测试通过；`npm run lint` 通过；`npm run build` 通过（仍有 1 条非阻塞 Turbopack NFT tracing warning）；`npm run test:ci` 共 464 个测试，462 通过、2 个 Windows 环境限制跳过、0 失败。
- 随后运行项目统一闸门 `npm run verify`，lint、`test:ci`（464/462/2/0）和 build 均通过。
- Latest follow-up (2026-08-05): desktop sentence actions now show short learner-facing labels at large widths (Shadowing/Copy/Save, localized through the existing audio-player keys) while preserving compact narrow-screen controls and accessible names. Targeted SentenceList test, `npm run lint`, `npm run test:ci` (466 total, 464 passed, 2 environment-limited skips), and `npm run build` pass. The existing non-blocking Turbopack NFT tracing warning remains. This does not close HG-01 through HG-04 or OFS-010.

## 2026-08-05 导入恢复“非卡死”补充

- 失败/中断导入恢复列表现在只展示服务端确认已配置的 Provider；未配置的 Provider 不再作为必然失败的切换选项，且不会向客户端传递密钥值。
- `RECEIVING` 状态禁止切换 Provider，避免用户在原始媒体仍接收时触发互相矛盾的操作；重试期间以本地化 `role=status` 显示秒级耗时，失败后仍保留安全的恢复动作。
- 单文件与批量导入均把恢复列表接入同一刷新信号；批量请求期间每个条目明确报告“上传中”，而不是长期停留在“等待上传”。
- 证据：`ImportRecoveryList`、`UploadButton`、`BatchUploadButton` 定向测试 17/17 通过；`npm run lint` 通过；`npm run test:ci` 共 471 个测试，469 通过、2 个 Windows 环境限制跳过、0 失败；`npm run build` 通过，仍有 1 条非阻塞 Turbopack NFT tracing warning；`git diff --check` 无差异格式错误。
- 这轮只改善本地可恢复性与状态可见性，不关闭真实 Provider/FFmpeg、跨平台 clean install、目标用户观察、屏幕阅读器/200% 缩放人工验收或 HG-01～HG-04。

## 2026-08-05 首启动媒体就绪与计时器播报补充

- 修复 Desktop 全新数据根的 readiness 误报：当 `media/audio`、`media/video` 或其共同父目录尚未创建、但最近已有祖先可写时，检查结果现在报告“就绪”；检查仍是只读，不会为显示状态而创建目录。不可写的现有目录仍保持阻塞。
- 修复恢复重试的辅助技术体验：秒级计时保留为视觉反馈并从可访问树隐藏；屏幕阅读器只收到一次“正在重试”状态，避免每秒重复播报。
- 浏览器复核（临时 Desktop 数据根）确认 Setup 从“还有 2 项核心设置待处理”变为仅 Provider 未配置；`/setup#provider-settings` 深链仍能直接打开真实配置对话框；`/library?import=subtitle` 仍能直接打开字幕导入向导。
- 证据：`src/lib/setup-readiness.test.ts`、`src/app/library/ImportRecoveryList.test.ts` 等定向测试 32/32 通过；`npm run lint` 通过；`npm run build` 通过（保留 1 条非阻塞 Turbopack NFT tracing warning）；`npm run test:ci` 共 472 个测试，470 通过、2 个 Windows 环境限制跳过、0 失败。
- 外部闸门状态不变：真实 Demo provenance、真实 Provider/FFmpeg E2E、macOS/Windows clean install、目标用户观察以及屏幕阅读器/200% 缩放/Reduced Motion 实机验收仍未完成。

## 2026-08-05 Self-check: first-session language and accessibility contracts

The self-check found no stalled process or failing local quality gate. The remaining
localizable friction was that first-session copy used “API key” in no-key paths,
which can make an ordinary learner believe an API setup is required before trying
the Demo or attaching local subtitles. The copy now uses “service key” / “服务密钥”
in the landing, decision-guide, subtitle-import, upload-recovery, and Demo-note
surfaces; the explicit Provider configuration dialog keeps “API key” because it is
the exact credential the learner must paste there.

Automated first-session contracts now cover both locales and the concrete learner
paths: Demo progress announcements, Practice blind-mode state and saved handoff,
Setup progressive disclosure and executable destinations, Provider dialog labels
and write-only key handling, subtitle-import progress, and import-recovery status
and Setup recovery links. The terminology audit scans both `en.json` and
`zh-CN.json` for implementation-only terms in those paths.

Evidence:

- `src/i18n/first-session-language.test.ts`
- `src/app/first-session-accessibility.test.ts`
- `npm run lint` passed.
- `npm run test:ci` passed: 482 tests, 480 passed, 2 Windows capability skips, 0 failures.
- `npm run build` passed; the existing non-blocking Turbopack NFT tracing warning remains.
- `git diff --check` passed.

This does not close real Demo provenance/audio approval, real Provider or FFmpeg
E2E, target-OS clean-install/signing checks, manual 200% zoom/screen-reader/
reduced-motion acceptance, or the five-learner observation gate.

## T120 Demo release preflight contract

The release contract now executes the public Desktop preflight against a
disposable target name and asserts that the current synthetic Demo fixture
fails the public gate with an explicit provenance diagnosis. The same test
also asserts that the missing target-specific FFmpeg assets are reported as a
release blocker. This proves the current internal-alpha fixture cannot be
mistaken for a releasable Demo; it does not replace the HG-01 asset approval.

Evidence: `src/lib/desktop-packaging-contract.test.ts` (4/4 targeted tests),
full `npm run verify` with 482 tests / 480 passed / 2 Windows skips / 0
failures, and the existing non-blocking Turbopack NFT tracing warning.

## 2026-08-05 post-fix quality-gate correction

After the Provider dialog copy fix, the local gates were executed again rather
than carried forward from the previous baseline. `npm run lint`, `npm run
build`, the 13-test first-session targeted suite, `npm run test:ci`, and
`git diff --check` all passed. The current full suite reports 483 tests, 481
passed, 2 Windows capability skips, and 0 failures. The skipped checks are
environment-limited POSIX mode-bit/symlink checks; they do not represent product
test failures. The non-blocking Turbopack NFT tracing warning remains.

## 2026-08-05 导入死路阻断补充

本轮对普通用户首条导入路径做对抗式复核时发现：没有配置服务商、也没有附加字幕时，音频文件仍可直接上传，直到转写阶段才失败。现在字幕导入向导会在客户端提前阻断这条确定失败的音频路径，并给出“附加 SRT/VTT 或打开服务商设置”的双语提示；视频路径仍然允许继续，因为视频可能包含内嵌字幕，附加旁挂字幕也会解除阻断。

证据：`src/app/library/ImportMediaWizard.tsx`、`src/app/library/ImportMediaWizard.test.ts`（7/7）、双语 `noProviderAudioHint`；本轮 `npm run lint`、`npm run build`、`npm run test:ci`（484/482/2/0）和 `git diff --check` 均通过。该修复不改变可恢复导入、Provider 或媒体存储合同。

## 2026-08-05 字幕与媒体时长校验（T141）

- 新增纯函数 `src/lib/subtitle-media-validation.ts`，在媒体进入持久化前检查空字幕、负时间、反向区间、实质重叠，以及字幕末尾相对媒体时长是否越界。
- 媒体时长不可用时返回可解释的 warning；已知时长使用至少 2 秒或 10% 的容差，超出容差才阻断，避免容器四舍五入造成误报。
- `validateSubtitleMatch()` 复用同一校验器，保留原有调用方的安全 reason contract；新增 4 个边界测试覆盖 clean/warning/block、容差和相邻 cue。
- 最新验证：`npm run verify` 通过；`test:ci` 共 488 个测试，486 通过、2 个 Windows 能力跳过、0 失败；lint/build 通过。构建仍有 1 条非阻断 Turbopack NFT tracing warning。

该项只关闭本地可验证的 T141 逻辑缺口，不替代真实 FFmpeg、Provider、跨平台 clean install 或目标用户验收闸门。

## 2026-08-05 Demo 内容清理入口补充

- Setup 的数据安全区域现在读取 `GET /api/demo`，仅当服务端确认存在 Demo 时显示“移除 Demo 内容”操作。
- 操作要求显式确认，随后只调用已有的 `DELETE /api/demo`；成功后显示本地化结果，并保留个人素材、笔记、复习记录和学习历史的说明。
- 没有新增数据库或媒体删除逻辑，Demo/个人数据隔离仍由 `removeDemoTracks()` 的 `trackType = "DEMO"` 条件保证。
- 证据：`src/app/setup/DataSafetyActions.test.ts`、`src/app/api/demo/route.structure.test.ts`、`src/lib/demo-seed.test.ts` 定向测试 9/9；最新完整质量门为 `npm run verify` 通过，`test:ci` 共 488 个测试，486 通过、2 个 Windows 能力跳过、0 失败，lint/build 通过。

## 2026-08-05 Demo 清理 disposable browser smoke

- 在一次性 `DEEPLISTENER_DATA_DIR=.tmp/self-check-desktop-data` 上复核 Setup 的 Demo 数据安全区域：seeded 状态的 `GET /api/demo` 返回 `demoSeeded: true`，页面显示“移除 Demo 内容”。
- 通过同一 disposable 服务调用既有 `DELETE /api/demo`，得到 `200 / removedTracks: 1 / demoSeeded: false`；刷新 `/setup` 后清理入口消失，个人数据保护说明仍保留。
- 浏览器原生 confirm 弹窗已出现，但自动化通道在句柄处理时发生竞态；显式确认本身继续由 `src/app/setup/DataSafetyActions.test.ts` 覆盖。本轮没有触碰活跃 `prisma/dev.db`、`public/uploads/`、`public/videos/` 或 `.env*`。
- 证据：`docs/agent-harness/sessions/2026-08-05-demo-removal/SPR-001-evaluator-report.md`。该项补充关闭本地 disposable 验证，不关闭 HG-01～HG-04 或 OFS-010 的外部闸门。

## 2026-08-05 资料库无服务商提示补充

- 资料库通用“导入媒体”入口现在读取服务端传入的 masked provider 状态；当明确没有配置服务商时，额外显示学习者语言提示，说明“带内嵌字幕的视频 / SRT/VTT 可以免服务商，没字幕的音频需要先设置”。配置状态未知时不猜测，也不显示误导性提示。
- 提示提供两个真实目的地：`/library?import=subtitle`（“选择媒体和字幕”）与 `/setup#provider-settings`（“打开服务商设置”）。同时修正通用 `importTip`，不再无条件声称每条素材都会自动转写。
- 证据：`src/app/library/UploadButton.test.ts`、`src/i18n/first-session-language.test.ts`（定向 14/14）；`npm run lint`、`npm run build`、`npm run test:ci`（489/487/2/0）和 `git diff --check` 通过；disposable `/library` 浏览器 DOM 已确认中英文提示及两个深链。
- 该修复不改变上传 API、import-job 状态机或 Provider 请求边界；真实 Provider、FFmpeg、跨平台安装和目标用户闸门仍保持开放。

## 2026-08-05 内嵌字幕路径文案校正

- 对抗式复核发现设置页“内嵌字幕”卡片把音频和视频并列描述，但当前实现只有视频内嵌字幕路径；音频无字幕时必须使用 SRT/VTT 或 Provider。
- 英文和中文卡片文案已改为明确区分：视频可使用内嵌字幕，音频请附加 SRT/VTT；导入入口、Provider 请求边界和媒体处理逻辑未改变。
- 证据：`src/i18n/first-session-language.test.ts` 7/7；`npm run verify` 492 个测试中 490 通过、2 个 Windows 能力跳过、0 失败；lint/build 通过；`git diff --check` 通过。

## 2026-08-05 无服务商通用导入快速阻断

- 对抗式复核进一步发现：字幕向导已经阻断“无服务商 + 无字幕音频”，但资料库的通用单文件和批量入口仍会先上传，再在转写阶段失败。
- 现在当服务端明确返回“没有已配置服务商”时，单文件和批量入口会在客户端上传前阻断音频，并给出字幕导入/设置方向；视频仍允许继续，因为可能包含内嵌字幕。Provider 状态未知或已配置时不改变原有流程。
- 证据：`src/app/library/UploadButton.test.ts`、`src/app/library/BatchUploadButton.test.ts`、`src/app/library/ImportMediaWizard.test.ts` 与 `src/i18n/first-session-language.test.ts` 定向 31/31；`npm run verify` 494 个测试中 492 通过、2 个 Windows 能力跳过、0 失败；lint/build 通过；`git diff --check` 通过。
- 额外在当前没有 `ffmpeg`/`ffprobe` 的环境运行 disposable Prisma 激活测试：附加 SRT 的音频素材仍能激活为唯一 Track，重复 resume 不重复建 Track（`src/lib/import-jobs/prisma-activation.e2e.test.ts` 1/1）。

## 2026-08-05 字幕内容上传前预检

- 字幕向导在创建 import job 前读取本地 SRT/VTT 文件，用同一纯解析器和时间轴校验器检查是否存在可用 cue；空文件、损坏文件和无效时间轴会立即提示，不上传媒体、不创建恢复任务。
- 有效字幕仍通过原有流式媒体上传、旁挂字幕关联、Provider 零请求/激活幂等路径；服务端仍是最终权威校验。
- 证据：`src/app/library/ImportMediaWizard.test.ts`、`src/lib/subtitle-utils.test.ts`、`src/lib/subtitle-media-validation.test.ts` 定向 16/16；`npm run verify` 495 个测试中 493 个通过、2 个 Windows 能力跳过、0 失败；lint/build 通过；`git diff --check` 通过。

## 2026-08-05 Demo 候选时间轴资产补充（T121）

- 新增 `scripts/demo-timeline.example.json`，与 `scripts/replace-demo-audio.mjs --timeline` 的输入格式一致，提供 6 条已排序、无重叠的候选英语口语 cue；它是替换真实 Demo 资产时的维护者模板，不会替换当前合成音频或伪装成发行资产。
- 新增 `src/lib/demo-timeline-contract.test.ts`，验证候选时间轴的文本、数值、正时长、排序和不重叠约束，并锁定替换脚本对示例路径和校验函数的文档合同。
- 证据：T121 定向测试 2/2；`npm run lint`、`npm run build`、`npm run test:ci`（502/500/2/0）和 `git diff --check` 通过。现有合成 Demo、真实语音 provenance、FFmpeg 资产和 HG-01 仍保持明确阻塞，不因候选时间轴而关闭。

## 2026-08-05 导入错误文案本地化与错误边界

- 对抗式复核发现：单文件、批量、字幕向导和恢复列表在遇到 Provider、媒体、字幕、超时或网络失败时，可能直接把服务端英文错误原文展示给中文学习者；客户端文件预检也返回了英文硬编码提示。
- 新增 `src/lib/import-jobs/recovery-copy.ts` 与 `src/lib/client-upload-validation-copy.ts`，把已知安全错误码/预检码映射到中英文学习者提示；导入恢复、单文件上传、批量上传和字幕向导均不再渲染原始 `error.message`。
- 服务器仍保留安全错误码和诊断消息用于恢复与日志，状态机、重试、换服务商、字幕替换和数据所有权合同未改变。
- 证据：`recovery-copy.test.ts`、`client-upload-validation-copy.test.ts`、`UploadButton.test.ts`、`BatchUploadButton.test.ts`、`ImportMediaWizard.test.ts`、`ImportRecoveryList.test.ts`、`first-session-language.test.ts`；定向套件 33/33，通过 `npm run lint`、`npm run build`、`npm run test:ci`（500/498/2/0）和浏览器 `/library?import=subtitle` smoke（无控制台错误）。
- Contract 证据：`docs/agent-harness/sessions/2026-08-05-import-error-copy/`。该项改善语言与信任边界，不关闭真实 Provider/FFmpeg、跨平台发行或目标用户闸门。

## 2026-08-05 T121 Harness 证据补齐

- T121 的 Harness 证据已补到 `docs/agent-harness/sessions/2026-08-05-demo-timeline/`，包含 safety profile、SPR-001 contract 和 evaluator report。
- 该证据只确认候选时间轴/替换脚本的本地合同，不批准或替换 Demo 音频，也不关闭 HG-01/OFS-010。

## 2026-08-05 自检后完整质量门

- 本轮自检未发现挂起的项目命令；现存 Node 进程是已启动的开发服务器或 Codex/MCP 基础进程，并非失败重试循环。
- `npm run verify` 重新通过：lint 通过，`npm run test:ci` 为 502 个测试中 500 通过、2 个 Windows 能力跳过、0 失败，生产 build 通过。
- build 仍有已知非阻塞 Turbopack NFT tracing warning（`/api/backups` 动态文件路径）；没有放宽规则绕过它。
- `prisma/dev.db`、`public/uploads/`、`public/videos/` 和 `.env*` 均无工作区变更；本轮没有运行 `npm run sync`。

## 2026-08-05 批量导入上传前预检

- 对抗式复核发现批量入口只阻断“无服务商的音频”，却没有复用单文件入口的文件名、空文件、格式和大小预检；普通学习者会先上传整批文件，再在服务端失败。
- `BatchUploadButton` 现在在设置 uploading 状态和创建 `FormData` 之前，对每个文件调用 `validateClientUpload`；遇到第一个无效文件立即停止，并用文件名加本地化原因提示，不发起上传请求。
- 新增 `library.batchValidationError` 中英文文案；有效批量上传、无服务商音频阻断、进度、恢复和服务端权威校验保持不变。整批拒绝而非部分上传是本轮明确的合同边界。
- 证据：`src/app/library/BatchUploadButton.test.ts`、`src/lib/client-upload-validation.test.ts`、`src/i18n/first-session-language.test.ts` 定向 23/23；`npm run verify` 502/500/2/0；`git diff --check` 通过；Contract 证据在 `docs/agent-harness/sessions/2026-08-05-batch-upload-preflight/`。
## 2026-08-05 Batch upload preflight evidence correction

The batch-upload preflight implementation and its harness evidence are now
aligned with the latest local run. `npm run verify` reports 503 tests, 501
passed, 2 Windows capability skips, and 0 failures; lint and build also pass.
The known non-blocking Turbopack NFT tracing warning remains. Browser evidence
for `/library?batch=true` is recorded in the batch-upload evaluator report:
selecting `scripts/demo-timeline.example.json` shows the localized filename
error `demo-timeline.example.json：请选择音频、MP4 或 WebM 文件。`, with no upload
progress and no request sent. This closes the local batch-preflight evidence
gap only; HG-01 through HG-04 and the real Provider/FFmpeg/platform gates stay
open.

## 2026-08-05 Review 导航与待复习徽标补充

- 全局导航现在按普通学习者的持续学习路径排列为 `Library → Review → Vault → Analytics → Setup`；当前路由同时有可见高亮、`aria-current="page"` 和 `data-active`，桌面与移动菜单都保留原有目的地，移动菜单也复用同一套 active class。
- Review 导航项新增只读今日待复习数量徽标。数量复用 Review 页面现有的 due/relearning 语义（包括当天已复习但 Again/Hard 仍需重学的条目），接口失败或数量为零时静默隐藏，不把错误变成误导性数字。
- Review 成功评分后发出全局刷新信号，徽标无需整页刷新即可更新；评分失败不会伪造刷新结果。中英文导航文案与可访问名称已补齐。
- 本轮证据：`docs/agent-harness/sessions/2026-08-05-review-nav-badge/SPR-001-evaluator-report.md`；合同定向测试 18/18；`npm run verify` 为 513 个测试中 511 通过、2 个 Windows 能力跳过、0 失败，lint/build 通过；`git diff --check` 通过；`/library` 与 `/review` 浏览器 smoke 无控制台错误或警告。
- 该补充只关闭 Review 导航本地可验证性，不关闭 HG-01～HG-04、真实 Provider/FFmpeg E2E、macOS/Windows clean install、200% 缩放/屏幕阅读器/Reduced Motion 人工验收或 OFS-010。

## 2026-08-05 移动端 Review 徽标补充

- 对抗式复核发现桌面导航虽已显示待复习数量，但移动菜单的 Review 项没有挂载同一徽标；小屏学习者需要先进入 Review 才能发现队列，持续学习路径不一致。
- 移动菜单现在复用 `NavReviewCount`，在数量已知且大于零时显示同一中英文可访问名称；数量不可用或为零时仍静默隐藏，不阻断菜单导航。
- 证据：`docs/agent-harness/sessions/2026-08-05-review-mobile-badge/SPR-001-evaluator-report.md`；AppShell + NavReviewCount 定向测试 9/9；390×844 浏览器 smoke 已确认菜单项 `复习 复习，1 条待复习`；`npm run verify` 为 513/511/2/0，lint/build 通过；`git diff --check` 通过。
- 该补充只改善移动端导航发现性，不关闭 HG-01～HG-04、真实 Provider/FFmpeg E2E、跨平台发行和人工可用性闸门。

## 2026-08-05 首页 Demo 加载状态无障碍补充

- 首页“试用演示”在创建 Demo 期间现在标记 `aria-busy`，并提供一次性的本地化 `role="status"` live region；屏幕阅读器不会只看到按钮文字变化，也不会收到重复计时播报。
- Demo 请求、数据库就绪跳转、错误文案和显式 query 启动逻辑均未改变。
- 证据：`docs/agent-harness/sessions/2026-08-05-landing-demo-status/SPR-001-evaluator-report.md`；首页 + 首次会话无障碍定向测试 8/8；`npm run verify` 为 514/512/2/0，lint/build 通过；`git diff --check` 通过。
- 该补充只改善本地可验证的状态沟通，不关闭真实 Demo 语音/provenance、平台发行和目标用户人工验收闸门。

## 2026-08-05 Server edition 边界文案补充

- 首页原先只写“自托管边界”，现在明确标注为 `Server / self-hosted（面向技术维护者）`，说明这条路径需要维护本地服务和运行环境；没有新增或暗示已完成的 Desktop 发行能力。
- 英文和中文标签均已覆盖，Demo、设置入口、无密钥说明和其他学习者文案不变。
- 证据：`docs/agent-harness/sessions/2026-08-05-server-edition-label/SPR-001-evaluator-report.md`；`page.first-success.test.ts` 4/4；`npm run verify` 为 515/513/2/0，lint/build 通过；`git diff --check` 通过。
- 该补充只关闭 Server 入口的文案歧义，不关闭 HG-01～HG-04、签名发行或目标用户闸门。

## 2026-08-05 Demo 标题本地化补充

- 对抗式 UX 复核发现：中文资料库的字幕导入弹窗已经本地化，但内置 Demo 卡片仍显示英文标题，造成语言切换不完整。
- `LibraryContent` 现在只对 `trackType === "DEMO"` 投影独立的 `displayTitle`，使用 `library.demoTrackTitle`；数据库中的 Demo 原始标题、个人素材标题和 Demo 所有权标记均不变，重命名流程仍使用原始 `title`。
- 中文浏览器 smoke 在 `/library?import=subtitle` 确认卡片显示“离线 Demo：盲听练习”，字幕导入弹窗仍正常打开；未触发上传或写入数据。
- 证据：`src/app/library/demo-title.test.ts`、`src/app/library/TrackList.accessibility.test.ts` 与 `src/i18n/first-session-language.test.ts` 定向 9/9；最新 `npm run verify` 为 516 个测试，514 通过、2 个 Windows 能力跳过、0 失败，lint/build 通过；合同与评估记录见 `docs/agent-harness/sessions/2026-08-05-demo-title-localization/`。
- 该补充只关闭本地显示层语言缺口，不关闭 HG-01～HG-04、真实 Provider/FFmpeg E2E、跨平台发行和目标用户人工验收闸门。

## 2026-08-05 T140/T142 迁移与备份任务对账

- 对账发现 T140/T142 的实现已经存在于当前基线代码，但任务表仍显示未完成；本条仅补齐状态与证据，不新增迁移行为。
- `src/lib/migration-runner.ts` 在显式目标路径上重放冻结 Prisma migration，使用 `_deeplistener_migrations` 跟踪表、漂移检测、逐迁移事务和失败回滚；`preflightBackup` / `ensureDatabaseReady` 在已有数据库上执行带时间戳的备份与尺寸校验，备份失败时阻断迁移，新 profile 明确跳过备份。
- `src/lib/migration-runner.test.ts` 定向 12/12 通过，覆盖新库初始化、幂等重跑、待迁移识别、失败 SQL 回滚、备份跳过/复制/不可写目标、组合流程和活跃数据库保护断言。测试仅使用 disposable 临时目录；未触碰 `prisma/dev.db`、媒体目录或 `.env*`。
- 该对账不关闭 T144 copy-first legacy import、T150/T152 打包、真实跨平台安装或 HG-03 发布闸门。

## 2026-08-05 T144 copy-first legacy import

- 新增 `src/lib/legacy-import.ts`：从显式 legacy root（`prisma/dev.db`、`public/uploads`、`public/videos`）创建 manifest-backed 副本，复制到 operation-owned staging，在 staging 数据库上执行离线迁移并刷新数据库校验和；只有单独调用 `activateLegacyImport({ confirmReplace })` 才会替换 Desktop target，冲突前保留旧 target 作为 rollback sibling。
- 兼容已有 Prisma `_prisma_migrations` 的 legacy 数据库：只把已完成且仍在打包 migration 集合中的记录映射到 portable tracker，避免对现有 schema 重放初始建表 SQL。
- `src/lib/legacy-import.test.ts` 定向 4/4 通过，覆盖成功导入、冲突确认、迁移失败清理、非法根目录及源 DB/媒体 SHA-256 不变；所有测试使用 disposable 临时目录。
- 该项不接入 UI/API，不触碰活跃 `prisma/dev.db`、`public/uploads/`、`public/videos/` 或 `.env*`，也不关闭真实跨平台迁移、打包签名和发布闸门。

## 2026-08-06 T150 standalone 打包对账

- T150 的代码已经在当前工作树中完成，但任务表之前漏标：`next.config.ts` 使用 standalone 输出，`scripts/desktop-package.mjs` 组装 standalone server、静态资源、Prisma client/engine、冻结 migrations，并剔除 traced secrets、数据库和用户媒体后写入脱敏 `runtime-manifest.json`。
- 隔离 Windows staging 实测 `npm run desktop:package -- --no-build --staging .tmp/t150-package-smoke-*` 成功，校验 7 项必需运行时资产并打包 16 条 migration；从该 staging 启动 `server.js` 的独立路由 smoke 返回 HTTP 200；package-content mutation audit 3/3 通过。
- 本地 package smoke 不代表真实 FFmpeg 二进制、签名、macOS/Windows clean install 或发布资格；这些仍由 T181/T272 及后续人工/外部闸门负责。

## 2026-08-06 T152 非发布 Desktop CI smoke

- 新增 `.github/workflows/desktop-package.yml`，以 `macos-14`/darwin-arm64 与 `windows-latest`/win32-x64 矩阵执行依赖安装、Prisma 生成、standalone build、目标打包和脱敏内容审计，并上传 7 天过期的 smoke artifact；工作流没有签名、发布、notarization 或 provider secret 步骤。
- 新增 `scripts/desktop-package-audit.mjs`，跨平台检查 server/static/migrations/Prisma 资产、manifest 结构，并 fail-closed 拒绝 traced DB、secrets 和用户媒体；`src/lib/desktop-package-workflow.test.ts` 2/2 通过，YAML 解析通过，审计脚本对 disposable staging 通过。
- GitHub-hosted macOS/Windows runner 的实际执行仍需 CI 外部证据；这不等同于已完成签名、clean install 或公开发布。

## 2026-08-06 T134 Setup 诊断摘要

- Setup 的数据安全区域新增 `DiagnosticsSummary`：通过现有脱敏 `GET /api/diagnostics` 显示应用数据目录、数据库、音频/视频存储、日志目录和服务商配置的分类状态，并提示是否存在上次启动问题或日志截断；用户可手动刷新，接口失败只显示本地化不可用提示。
- 组件只读取 allow-listed response，不显示绝对路径、密钥、transcript、note、媒体名称或日志正文；现有下载脱敏诊断和 Desktop 原生保存/备份对话框保持不变。
- 定向测试 2/2、`npm run lint`、`npm run build`、`npm run test:ci`（561/559/2/0）通过。真实 macOS/Windows clean install、屏幕阅读器和发布签名仍是外部闸门。
