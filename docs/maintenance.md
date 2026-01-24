# DeepListener 开发维护手册

## 1. 如何增加新的转录 Provider (例如 Deepgram)

系统采用了工厂模式（Factory Pattern），增加新 Provider 仅需三步：

1.  **创建实现类**：在 `src/lib/transcription/` 下创建 `deepgram-provider.ts`，实现 `TranscriptionProvider` 接口。
2.  **实现 `transcribe` 方法**：确保返回符合 `TranscriptionResponse` 接口的数据。
3.  **注册工厂**：在 `factory.ts` 的 `switch` 语句中加入新 Provider 的标识。

## 2. Gemini 转录的“时间轴幻觉” (Known Issue)

**现象**：在使用 Google Gemini 2.0 Flash 进行长音频转录时，可能会出现时间轴严重拉伸。
**原因 (The "60 vs 100" Bug)**：Gemini 有时会将 `1分44秒` (1:44) 错误地格式化为 `144.0` 秒，或者 `1.44`。这种“进制混淆”导致一句话的 `end` 时间比 `start` 晚了几十秒，造成播放器卡死。
**解决方案**：
1.  **Prompt 约束**：在 Prompt 中明确要求 `start/end` 必须是 `SECONDS (float)`，且禁止使用分钟格式。
2.  **后处理修正**：前端 `AudioPlayer` 中已加入“重叠截断”逻辑，强行修正部分溢出。
3.  **终极方案**：使用非生成式的专用 STT 模型（如 OpenAI Whisper 或 Deepgram）。

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