# DeepListener

DeepListener 是一个专为高阶英语学习者设计的“原子级”听力解码工具，旨在通过数据驱动的精听训练，彻底突破听力瓶颈。

## 🌟 核心特性

- **多模型转录引擎**：
    - **Deepgram (默认)**：结合自定义分句算法，解决超长难句问题。
    - **备选**：OpenAI Whisper, Google Gemini。
- **波形精听台**：
    - **交互升级**：右键平移、滚轮缩放、圈选即播、自动循环、0.5x-2.0x 变速播放。
    - **盲听模式 (Blind Mode)**：一键模糊文本，强制听力理解。
    - **笔记系统**：
        - **状态标记**：已收藏句子自动高亮 (琥珀色)。
        - **难度分级**：支持 Easy, Medium, Hard 三级难度标注。
    - **进度管理**：
        - **状态流转**：支持未学习 -> 精听 -> Shadowing -> 已学习等多阶段状态管理。
- **Shadowing 工作台 (跟读)**：
    - **双波形对比**：原音与录音波形同屏显示，直观对比节奏与重音。
    - **交互升级**：支持单句循环播放、打断式录音、实时进度显示。
    - **沉浸式流程**：听 -> 录 -> 自动回放 -> 对比 -> 重录。
    - **极速切片**：基于内存的音频切片，切换句子零延迟。
- **素材管理 (Library)**：
    - **归档系统**：支持素材软删除 (Archive) 和物理删除 (Delete)。
    - **分类与笔记**：支持添加多标签 (Categories) 和全局 Markdown 笔记。
    - **重命名**：支持修改自动生成的音频标题。
    - **移动端适配**：全站响应式设计，支持手机端操作。
- **归因诊断系统**：强制记录听不懂的原因（连读、生词、语速等）。
- **智能复习 (Vault)**：
    - **间隔复习**：类似 Anki 的复习算法。
    - **音频导出**：将收藏的句子音频合并导出为 MP3，用于泛听复习。每个音频间隔 2 秒静音，支持导出全部、今日复习或单个音频文件的笔记。

## 🚀 快速开始

### 前置要求

**FFmpeg (必需)**：音频导出功能需要安装 FFmpeg。

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get update && sudo apt-get install ffmpeg

# Windows
# 从 https://ffmpeg.org/download.html 下载并添加到 PATH
```

验证安装：
```bash
ffmpeg -version
```

### 1. 安装依赖
```bash
npm install
```

### 2. 环境配置
创建或编辑 `.env` 文件：

```bash
# 推荐使用 Deepgram (无需代理，精准时间轴)
TRANSCRIPTION_PROVIDER=deepgram
DEEPGRAM_API_KEY=your_deepgram_key

# 备选：OpenAI / Google
# OPENAI_API_KEY=sk-...
# GOOGLE_API_KEY=AIza...

# 网络代理 (国内环境必填，针对 OpenAI/Google)
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

### 5. 提交前验证
推荐在提交前至少运行：

```bash
npm run lint
npm run build
```

如果改动涉及 dashboard、vault、review、audio player 或 shadowing 流程，建议再补跑对应的 `node --import tsx --test ...` 定向回归测试。

## 📂 目录结构预览

- `/src/lib/transcription`: 多提供商转录引擎实现。
- `/src/app/practice`: 核心精听训练界面 (AudioPlayer, ShadowingConsole)。
- `/src/app/review`: 间隔复习系统。
- `/src/app/vault`: 生句库列表与管理。

## 🛠️ 交互指南

| 操作 | 作用 |
| :--- | :--- |
| **Space** | 播放 / 暂停 |
| **Scroll** | 缩放波形密度 |
| **Right Drag** | 左右平移波形 |
| **Left Drag** | 圈选区域并自动循环 (松开即播) |
| **Alt + Click** | (在 Position 标题上) 开启时间轴调试模式 |

### 音频导出

在以下位置可以导出音频：
- **Vault 页面**：导出所有收藏的句子或今日需要复习的句子
- **Review 页面**：右下角浮动按钮，导出今日待复习的句子
- **Track 练习页面**：导出当前音频文件的所有笔记

导出的 MP3 文件格式：
- 比特率：192 kbps
- 句子间隔：2 秒静音
- 文件命名：`DeepListener_Export_YYYY-MM-DD.mp3`
- 排序：按来源音频分组，组内按句子顺序排列

导出的音频可用于在其他播放器中进行泛听复习，巩固所学内容。

## 📚 文档资源

- [Symphony 智能开发协调器](./docs/symphony.md) - 自动化任务处理与 AI 开发流程
- [技术原理：解决 Node.js 代理超时](./docs/solving-node-proxy-timeout.md)
- [维护手册：如何扩展 API](./docs/maintenance.md)
- [产品需求文档 (PRD)](./docs/requirement.md)
- [Lint Warning Cleanup Plan](./docs/superpowers/plans/2026-04-04-lint-warning-cleanup.md) - warning 清理分批策略与最终验证结果
