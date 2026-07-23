# DeepListener 开发维护手册

Last updated: 2026-07-12

## 1. 转录 Provider 现状

项目当前内置 3 个 Provider：

- `openai`
- `deepgram`
- `google`

选择逻辑位于 `src/lib/transcription/factory.ts`：

- 通过 `TRANSCRIPTION_PROVIDER` 选择具体实现
- 未设置时默认使用 `deepgram`；设置为未知值时 fallback 到 `openai`
- 如果存在 `HTTPS_PROXY` 或 `https_proxy`，工厂会使用 `undici` 的 `ProxyAgent` 接管 Node 侧请求

### 如何增加新的 Provider

1. 在 `src/lib/transcription/` 下创建新的 `*-provider.ts`
2. 实现 `TranscriptionProvider` 接口，返回符合 `TranscriptionResponse` 的 `fullText`、`segments` 与 `rawJson`
3. 在 `factory.ts` 中注册新的 provider 标识
4. 同步更新 `README.md`、`AGENTS.md` 或其他使用文档中的环境变量说明

## 2. 核心转录策略

### 2.1 Deepgram 本地重组分句

Deepgram Provider 会请求单词级时间戳，然后在本地按标点符号 (`. ? !`) 重组句子边界，而不是完全依赖服务端返回的句级边界。

当前策略的作用：

- 避免快语速音频被切成超长句
- 保留更稳定的句子时间轴
- 让 Practice / Shadowing / Export 都基于统一的句子切分

### 2.2 Gemini 时间轴热修复

Gemini 偶尔会出现时间轴错位。前端 `AudioPlayer` 仍保留对重叠时间段的防御性处理，用于缓解 `endTime > next.startTime` 之类的异常输入。

## 3. 数据与文件维护

项目当前使用 SQLite。本地数据库通常由 `DATABASE_URL="file:./dev.db"` 指向默认文件；注意 Prisma 会按 `prisma/schema.prisma` 所在目录解析相对路径，所以默认文件实际是 `prisma/dev.db`。

- **Schema**：`prisma/schema.prisma`
- **数据库查看**：`npx prisma studio`
- **迁移**：修改 schema 后运行 `npx prisma migrate dev`；普通 setup/CI 环境只应用现有 migrations 时使用 `npx prisma migrate deploy`
- **音频文件**：原始音频和视频派生 MP3 保存在 `public/uploads/`
- **原始视频**：本地 MP4/WebM 保存在 `public/videos/`，不进入 Git 或现有远程同步
- **上传策略**：`src/lib/upload-policy.ts` 负责文件名清洗、媒体类型检查、音频 250 MB / 视频 1 GB 上限和路径逃逸防御
- **大文件路径**：单文件 Import Media 直接流式写入 `.part` 文件并原子重命名；Batch 仍使用 multipart，只用于较小文件

维护原则：

- 不要手工删除或覆盖 `prisma/dev.db`，除非用户明确确认。
- 不要手工清空 `public/uploads/`，除非用户明确确认。
- 不要手工删除、覆盖或提交 `public/videos/` 下的用户视频。
- 不要编辑 `.env*`、credential 或本机私有配置。
- 如果修改 `prisma/schema.prisma`，先说明数据风险，再运行迁移并重新生成 Prisma Client。
- 如果迁移历史显示“数据库中存在、仓库目录缺失”的旧 migration，不要通过 reset 修复。先备份数据库并用 `prisma migrate diff` 核对实时 schema，再采取定向修复。
- `bin/setup` 只检查 `.env` 是否存在并打印提示，不会创建、复制或追加本机 secret 文件。

## 4. 导出链路

### 音频导出

`POST /api/audio/export` 导出 Vault 句子音频，支持 4 种模式：

- `all`
- `due`
- `track`
- `filtered`

实现要点：

- 按 Track 分组
- 组内按 `Sentence.orderIndex` 排序
- 最多导出 500 个句子片段
- 每个片段会被重采样到 44100 Hz，并以 192 kbps 输出
- 使用 `ffmpeg` 拼接片段并插入 2 秒静音
- 对音频路径做 path traversal 防御
- 如果任何被选中的句子引用缺失或非法源音频，接口返回 400，不会静默跳过并生成不完整文件

### Library 整轨导出

`POST /api/library/export` 导出 Library 中的完整 Track 音频，支持：

- 当前 `trackType` / `trackTopic` / 上传日期筛选
- archived / active 视图
- 多选 Track

实现要点：

- 使用 `src/lib/api-schemas.ts` 中的 `libraryExportSchema` 校验输入
- 每个 Track 重新编码为 192 kbps MP3
- Track 之间插入 2 秒静音
- 对存储路径做同样的 path traversal 防御
- 如果任何被选中的 Track 引用缺失或非法源音频，接口返回 400，不会静默跳过

### 笔记导出

`POST /api/vault/export` 支持以下过滤维度：

- `tags`
- `difficulties`
- `trackIds`
- `dateFrom`
- `dateTo`

导出的文本会按标签分组，并附带来源 Track、难度和纯文本备注。

## 5. Vault 查询维护

Vault 当前不是一次性加载全部数据。关键实现拆分为：

- `src/app/vault/vault-query-helpers.ts`：纯查询构造、select、排序、URL 参数解析和数据映射
- `src/app/vault/vault-query.ts`：Prisma 读取和页面数据组装

- 默认页大小为 50，最大页大小为 100。
- 列表数据和 Play All 播放数据分开查询，避免把重 UI 列表字段混进播放队列。
- URL 参数承载筛选状态：`page`、`pageSize`、`archived`、`trackId`、`trackIds`、`difficulties`、`tags`、`search`、`sort`、`dateFrom`、`dateTo`。
- `buildVaultWhere` 负责页面列表筛选；`buildVaultExportWhere` 负责导出计数，默认只导出未归档项。
- 排序选项当前为 `createdAt`、`due`、`stability`、`dr`。

## 6. API 校验与错误响应

核心 JSON route 的输入 schema 位于 `src/lib/api-schemas.ts`，包括：

- `reviewGradeSchema`
- `vaultCreateSchema`
- `vaultPatchSchema`
- `trackPatchSchema`
- `sentencePatchSchema`
- `studyTimeSchema`
- `reviewLogSchema`
- `vaultExportSchema`
- `libraryExportSchema`
- `audioExportSchema`

新增或修改 route 时，优先扩展这些 schema，再在对应 route 中使用 `safeParse`。共享错误 helper 位于 `src/lib/api-response.ts`。

500 响应必须使用 `internalServerError()` 这类客户端安全 helper；真实异常可以 `console.error` 到服务端日志，但不要把原始 `error.message` 直接返回给客户端。

## 7. 主题与界面维护

全局主题由 `src/components/theme/ThemeProvider.tsx`、`src/components/theme/ThemeToggle.tsx` 和 `src/app/globals.css` 共同维护。

维护原则：

- 默认行为必须继续跟随系统偏好：`defaultTheme="system"`、`enableSystem`、`attribute="class"`。
- 右上角主题按钮必须在 client mount 后再读取 resolved theme，避免服务端 / 客户端 hydration mismatch。
- 新增页面或组件时优先使用 semantic token：`bg-background`、`bg-card`、`text-foreground`、`text-muted-foreground`、`border-border`、`bg-muted`、`bg-accent`。
- 如果必须使用旧 Tailwind 色阶，先确认 `.dark` 兼容桥是否已经覆盖；不要新增大面积 `bg-white` / `bg-gray-50` 而不做暗色检查。
- 默认按钮的暗色外观来自 `--primary` / `--primary-foreground`，不要在业务组件里用一次性 class 修正全局主按钮颜色。
- 图表、富文本、contenteditable、input/select/textarea、弹窗和 floating action button 都需要在暗色下做一次浏览器检查。

建议检查路径：

- `/library`
- `/vault`
- `/dashboard`
- `/review`
- `/practice/[id]`

主题变更是 UI-only 变更，不应修改 Prisma schema、`prisma/dev.db`、`public/uploads/`、转录 provider、导出音频逻辑或同步脚本。

## 8. 常见问题

### Q: 为什么 Node.js 报错 `fetch failed`？

A: 先检查 `.env` 中的 `HTTPS_PROXY` 是否正确。OpenAI / Google 在受限网络环境下通常需要代理；Deepgram 一般不需要，但如果设置了代理变量，工厂层仍会统一接管请求。

### Q: 为什么 Google API 报 429？

A: 常见原因是免费层级配额或代理出口限制。可以更换代理出口，或切换为 OpenAI / Deepgram。

### Q: 为什么音频导出失败？

A: 优先检查：

- `ffmpeg` 是否已安装并在 `PATH` 中
- 导出所引用的音频文件是否仍存在于 `public/uploads/`
- 导出过滤条件下是否真的有可导出的句子

### Q: 为什么笔记编辑时光标会突然跳回开头？

A: 先检查 `contentEditable` 编辑器有没有在父组件回传相同内容时，再次执行 `innerHTML = ...`。这不是键盘监听问题，而是 DOM 被重复写回后浏览器重置了 caret / selection。

当前维护约束：

- `src/components/feature/NoteEditor.tsx`
- `src/components/feature/ReviewNoteEditor.tsx`
- `src/components/feature/RichTextNoteEditor.tsx`

对这些编辑器，必须遵守：

- 只有在源内容真的变化时，才允许写回 `editorRef.current.innerHTML`
- 如果只是父组件把当前编辑中的内容原样回传，不能重新写 DOM
- 排查“输入后跳到开头”时，先查 `innerHTML` 写回路径，再查键盘事件
- 保留 `src/components/feature/contentEditable-sync.test.ts` 这个回归测试，不要删除

## 9. 数据同步与备份

为了防止本地音频文件和数据库丢失，项目保留了基于 `rsync` 的同步脚本：

```bash
npm run sync
```

同步内容：

- `public/uploads/`
- `prisma/dev.db`

`public/videos/` 不在同步范围内。视频 Track 的派生 MP3、字幕时间轴和数据库元数据会同步，原视频需要使用者自行备份。

执行前必须确认当前本地数据就是要备份的数据；这个脚本会写远端备份目标。建议先确认 SSH Key、远端路径和当前 `prisma/dev.db` 状态，再执行同步脚本。
