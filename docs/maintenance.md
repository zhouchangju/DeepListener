# DeepListener 开发维护手册

## 1. 转录 Provider 现状

项目当前内置 3 个 Provider：

- `openai`
- `deepgram`
- `google`

选择逻辑位于 `src/lib/transcription/factory.ts`：

- 通过 `TRANSCRIPTION_PROVIDER` 选择具体实现
- 未设置或设置为未知值时，回退到 `openai`
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

项目当前使用 SQLite，本地数据库通常由 `DATABASE_URL="file:./dev.db"` 指向仓库根目录下的 `dev.db`。

- **Schema**：`prisma/schema.prisma`
- **数据库查看**：`npx prisma studio`
- **迁移**：修改 schema 后运行 `npx prisma migrate dev`
- **音频文件**：上传内容保存在 `public/uploads/`

## 4. 导出链路

### 音频导出

`POST /api/audio/export` 支持 4 种导出模式：

- `all`
- `due`
- `track`
- `filtered`

实现要点：

- 按 Track 分组
- 组内按 `Sentence.orderIndex` 排序
- 使用 `ffmpeg` 拼接片段并插入 2 秒静音
- 对音频路径做 path traversal 防御

### 笔记导出

`POST /api/vault/export` 支持以下过滤维度：

- `tags`
- `difficulties`
- `trackIds`
- `dateFrom`
- `dateTo`

导出的文本会按标签分组，并附带来源 Track、难度和纯文本备注。

## 5. 常见问题

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

## 6. 数据同步与备份

为了防止本地音频文件和数据库丢失，项目保留了基于 `rsync` 的同步脚本：

```bash
npm run sync
```

同步内容：

- `public/uploads/`
- 根目录 `dev.db`

建议提前配置 SSH Key 免密登录，再执行同步脚本。
