# DeepListener 开发维护手册

## 1. 如何增加新的转录 Provider (例如 Deepgram)

系统采用了工厂模式（Factory Pattern），增加新 Provider 仅需三步：

1.  **创建实现类**：在 `src/lib/transcription/` 下创建 `deepgram-provider.ts`，实现 `TranscriptionProvider` 接口。
2.  **实现 `transcribe` 方法**：确保返回符合 `TranscriptionResponse` 接口的数据。
3.  **注册工厂**：在 `factory.ts` 的 `switch` 语句中加入新 Provider 的标识。

## 2. 核心算法解析

### 2.1 智能分句策略 (Deepgram Provider)
我们不使用 Deepgram 默认的 `utterances` 切分，因为对于语速快且无停顿的音频，它容易产生超长难句。
**当前策略**：
- 请求 `word-level` 时间戳。
- **本地重组**：遍历单词流，基于标点符号 (`. ? !`) 动态合并生成句子。
- **优势**：即使说话人一口气说一分钟，只要语法上有句号，我们就能精准切分出短句，且时间轴精确到毫秒。

### 2.2 Gemini 时间轴修正
Gemini 有时会出现“60进制混淆”问题（把 1:30 识别为 130s）。前端 `AudioPlayer` 内置了重叠检测逻辑 (`endTime > next.startTime`) 来进行运行时热修复。

## 3. 数据库维护

项目当前使用 SQLite (`prisma/dev.db`)。
- **查看数据**：运行 `npx prisma studio` 可视化查看所有记录。
- **修改 Schema**：修改 `prisma/schema.prisma` 后，务必运行 `npx prisma migrate dev`。

## 4. 常见问题 (FAQ)

### Q: 为什么 Node.js 报错 `fetch failed`？
A: 大概率是代理没配对。请确保 `.env` 中的 `HTTPS_PROXY` 协议（http/https）和端口号正确。

### Q: 为什么 Google API 报 429 错误？
A: 免费层级配额限制。Gemini 会根据你的 IP 区域分配配额。如果 429 持续出现，请尝试更换代理出口，或切换到 OpenAI/Deepgram。

## 5. 数据同步与备份 (Remote Sync)

为了防止本地音频文件和数据库丢失，系统内置了基于 `rsync` 的增量同步机制。

### 同步命令
```bash
npm run sync
```

### 运行原理
- **增量传输**：仅上传 `public/uploads/` 中新增的音频文件，节省时间和带宽。
- **数据库备份**：同步本地 `dev.db` 到服务器指定目录。
- **依赖**：要求本地 Mac 和远程服务器均安装 `rsync`（Mac 已内置，Linux 服务器通常也已内置）。

### 免密建议
建议配置 SSH Key 免密登录，以实现一键同步：
`ssh-copy-id root@124.221.194.112`
