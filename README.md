# DeepListener

DeepListener 是一个专为高阶英语学习者设计的“原子级”听力解码工具，旨在通过数据驱动的精听训练，彻底突破听力瓶颈。

## 🌟 核心特性

- **多模型转录引擎**：支持 OpenAI Whisper 和 Google Gemini 1.5/2.0 (当前默认)。
- **波形精听台**：基于 `wavesurfer.js` 的可视化交互，支持单句循环、盲听模式。
- **归因诊断系统**：强制记录听不懂的原因（连读、生词、语速等）。
- **智能复习 (SRS)**：类似 Anki 的间隔复习算法，专注攻克难句。
- **现代化架构**：Next.js 15, Prisma (SQLite), Tailwind CSS v4, shadcn/ui。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
创建或编辑 `.env` 文件：

```bash
# 转录提供商 (openai | google)
TRANSCRIPTION_PROVIDER=google

# Google Gemini 配置
GOOGLE_API_KEY=your_google_api_key

# OpenAI 配置 (可选)
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1

# 网络代理 (国内环境必填)
HTTPS_PROXY=http://127.0.0.1:7890
```

### 3. 数据库初始化
```bash
npx prisma migrate dev
```

### 4. 启动开发服务器
```bash
npm run dev
```

## 📂 目录结构预览

- `/src/lib/transcription`: 多提供商转录引擎实现。
- `/src/app/practice`: 核心精听训练界面。
- `/src/app/review`: 间隔复习系统。
- `/src/app/dashboard`: 听力瓶颈数据分析。

## 🛠️ 技术深度解析

- [关于 Node.js 18+ 原生 Fetch 代理超时的解决原理](./docs/solving-node-proxy-timeout.md)
- [产品需求文档 (PRD)](./docs/requirement.md)
