# Product Requirements Document (PRD): DeepListener

**Version:** 3.1 (Updated 2026-01-25)
**Tech Stack:** Next.js, Prisma (SQLite), Tailwind CSS, WaveSurfer.js, Deepgram/OpenAI/Gemini

## 1. 产品核心理念 (Core Philosophy)
- **原子级解码**：不放过任何一个连读或弱读。
- **闭环训练**：听 (Blind) -> 诊 (Capture) -> 练 (Shadowing) -> 复 (SRS)。

## 2. 核心功能模块 (Feature Modules)

### 模块 A: 波形精听台 (The Workbench)
- **多模型支持**：Deepgram (Nova-2), OpenAI, Google Gemini.
- **交互升级**：
    - 右键拖拽平移 (无 Shadow DOM 阻挡)。
    - 智能圈选：松开即循环播放选区。
    - 列表强力同步：无论如何操作，当前句子始终居中。
- **盲听模式 (Blind Mode)**：
    - 全局开关，文本默认模糊。
    - 点击单句揭晓，辅助听力验证。
- **笔记可视化**：已加入 Vault 的句子显示琥珀色高亮。

### 模块 B: Shadowing 工作台 (跟读)
- **入口**：顶部 "Start Shadowing" 或列表单句 Mic 图标。
- **沉浸式 UI**：全屏覆盖，专注当前句。
- **双波形轨道**：
    - Track 1: 原音 (Web Audio API 实时切片)。
    - Track 2: 用户录音。
- **工作流**：Play Original -> Auto Record -> Auto Replay Recording。
- **控制**：支持 "Rec Again" (跳过听原音直接重录)。

### 模块 C: 难句生词库 (Vault)
- 列表展示与搜索。
- 支持编辑笔记、删除条目。
- 关联 SRS 复习算法。

### 模块 D: 归档系统 (Archive)
- **软删除**：素材不再需要时可归档，不影响已摘录的笔记复习。
- **Library 过滤**：支持查看 Active / Archived 列表。

## 3. 数据库设计 (Schema)

```prisma
model Track {
  id            String     @id @default(uuid())
  title         String
  audioUrl      String
  transcription String     // JSON string
  isArchived    Boolean    @default(false) // 软删除标记
  createdAt     DateTime   @default(now())
  sentences     Sentence[]
}

model ReviewItem {
  id          String   @id @default(uuid())
  sentenceId  String   @unique
  // ... SRS fields
}
```

## 4. 技术挑战与解决方案

- **Node.js 代理**：使用 `undici` 全局调度器解决原生 fetch 不走代理的问题。
- **波形交互**：通过 `shadowDOM: false` 和全局捕获事件解决右键平移冲突。
- **Shadowing 延迟**：通过预加载解码 `AudioBuffer` 并在内存中切片，实现零延迟切句。

---
*Last Updated: 2026-01-25*