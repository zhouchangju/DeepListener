# DeepListener（中文）

**English** · **[简体中文](README.zh-CN.md)**

DeepListener 是一个专为高阶英语学习者设计的"原子级"听力解码工具，旨在通过数据驱动的精听训练，彻底突破听力瓶颈。

- **本地优先**：你的媒体、数据库和 provider key 全部留在你自己的机器上。
- **自带媒体**：DeepListener 不附带任何版权样本媒体，你导入自己有权使用的音频/视频（见 [SECURITY.md](SECURITY.md#media-and-content-boundary)）。
- **多 provider 转录**：OpenAI / Deepgram / Google，通过环境变量选择。
- 协议：[MIT](LICENSE)。

## 两种使用方式

### 1. 桌面客户端（推荐，alpha）

下载 [最新 dmg release](https://github.com/zhouchangju/DeepListener/releases)，双击安装即可。无需安装 Node.js、Prisma 或任何命令行工具。目前仅支持 macOS Apple Silicon；Windows 和签名版本会在 alpha 验证通过后跟进。

首次打开会自动初始化本地数据库，并内置一段 5 秒合成 demo 音频，你可以立即体验"句子级精听"闭环，不需要任何 provider key。要练习真实素材时，打开 `/library` 选择 **Import Media**。

### 2. 从源码运行（开发者）

```bash
npm install
cp .env.example .env        # 填入你的 provider key 以使用转录
npx prisma generate         # 生成 Prisma client（build 前必需）
npx prisma migrate deploy   # 初始化 SQLite schema
npm run dev                 # 打开 http://localhost:3000
```

启动后：

1. 打开 `/setup` 解决任何 **Action needed** 检查项。
2. 打开 `/library` 选择 **Import Media**。
3. 先用一个短音频文件，这样能快速进入练习界面。

> DeepListener 内置一段合成 demo（`public/demo/demo-listening.mp3`，5 秒 FFmpeg 生成的正弦波，无版权），所以第一次使用不需要 provider key。要练习真实素材，请导入你自己有权使用的音频或视频。

## 核心特性

- **通用音频/视频精听**：导入本地音频、MP4、WebM；视频会提取派生 MP3，若带可解析的内嵌字幕则优先使用，否则转录派生音轨。Practice 中视频是唯一播放时钟，波形、字幕、句子跳转、变速和循环共享同一时间轴。
- **多模型转录引擎**：通过 `TRANSCRIPTION_PROVIDER` 选择 `openai` / `deepgram` / `google`；未设置时默认 `deepgram`（单词级时间戳，通常无需代理）。Deepgram 结合单词级时间戳与本地重组分句逻辑，解决超长难句问题。
- **波形精听台**：右键平移、滚轮缩放、圈选即播、自动循环、0.5x-2.0x 变速；盲听模式一键模糊文本；状态标记与难度分级；多阶段状态流转 `UNLEARNT → INTENSIVE → ANALYSIS → SHADOWING → SPEED_SHADOWING → PARAPHRASE → LEARNT`。
- **Shadowing 工作台**：原音与录音双波形对比；单句循环、打断式录音、实时进度；基于内存切片零延迟。
- **素材管理 (Library)**：归档/物理删除、筛选与笔记、重命名、批量循环播放、移动端适配。
- **归因诊断系统**：强制记录听不懂的原因（连读、生词、语速等）。
- **智能复习 (Vault)**：基于 FSRS-4.5，对 `Again` / `Hard` 做 5 分钟 / 15 分钟短间隔重学；支持多种导出（全部/到期/单 Track/过滤，音频与文本笔记）。
- **界面主题**：默认跟随系统浅色/深色，右上角可手动切换并保留选择。

## 交互快捷键

| 操作 | 作用 |
| :--- | :--- |
| **Space** | 播放 / 暂停 |
| **Scroll** | 缩放波形密度 |
| **Right Drag** | 左右平移波形 |
| **Left Drag** | 圈选区域并自动循环（松开即播） |
| **Alt + Click** | （在 Position 标题上）开启时间轴调试模式 |

## 前置要求（从源码运行时）

**FFmpeg（必需）**：视频音轨提取、内嵌字幕探测和音频导出需要 FFmpeg/ffprobe。

```bash
# macOS
brew install ffmpeg
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install ffmpeg
# Windows：从 https://ffmpeg.org/download.html 下载并加入 PATH
```

## 文档资源

- [文档导航地图](./docs/README.md) — 先看这里，区分当前事实、维护手册、历史计划
- [更新日志](./CHANGELOG.md)
- [当前架构](./docs/architecture.md) — routes、API、数据模型、上传/复习流、数据安全边界
- [产品需求文档](./docs/requirement.md)
- [维护手册](./docs/maintenance.md) — Provider、数据库、上传、导出、备份
- [复习系统与 FSRS 算法说明](./docs/review-system.md)

## Support

DeepListener 是**单人维护、尽力而为**的自托管项目，没有 SLA，也没有 LTS 分支。

- Bug 与功能请求：开 GitHub issue，附上版本/commit 与复现步骤。
- 安全报告：见 [SECURITY.md](SECURITY.md) —— **不要**用公开 issue 报告安全问题。
- 贡献：见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE) © zhouchangju。第三方依赖与外部运行时（FFmpeg）的归属见 [NOTICE](NOTICE)。
