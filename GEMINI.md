# DeepListener Context

## Project Overview
DeepListener is an advanced English listening practice tool designed for high-level learners. It focuses on "atomic decoding" of speech, allowing users to drill down into specific sentences, diagnose listening errors (e.g., linking, speed, vocabulary), and practice via shadowing.

## Technology Stack
*   **Framework:** Next.js 16 (App Router)
*   **Database:** SQLite (Prisma)
*   **Audio:** WaveSurfer.js, Web Audio API
*   **AI:** OpenAI (fallback default), Deepgram, Google Gemini

## Code Quality Standards (Core Guidelines)

### OOP Design Principles
1. **开闭原则 (OCP)**: 软件实体应对扩展开放，对修改关闭。使用组合和依赖注入。
2. **里氏替换原则 (LSP)**: 子类必须能够替换其基类，确保接口契约被维护。
3. **依赖倒置原则 (DIP)**: 依赖于抽象而非具体实现。
4. **单一职责原则 (SRP)**: 每个类或模块应只有一个改变的原因。
5. **接口隔离原则 (ISP)**: 使用多个专门的接口，而不使用单一的总接口。
6. **迪米特法则 (LoD)**: 一个对象应当对其他对象有尽可能少的了解。
7. **合成复用原则**: 优先使用组合，而非继承。

### Maintainability Metrics
1. **圈复杂度 (CNN)**: 函数复杂度控制在 10 以内，避免深层嵌套。
2. **扇入扇出度 (FFC)**: 最小化模块间依赖，追求高内聚低耦合。
3. **模块间耦合度 (CBO)**: 减少对象间依赖，利用接口解耦。
4. **模块的响应 (RFC)**: 保持公共 API 精简。
5. **紧内聚度 (TCC)**: 类的方法应紧密协作实现共同目标。
6. **松内聚度 (LCC)**: 监控并拆分具有不相关职责的类。

### Development Constraints
*   **文件大小**: 每个文件最多 **500 行**。超过则必须拆分。
*   **YAGNI 原则**: 除非需要，否则不要构建抽象；避免过度设计。
*   **错误处理**: 优先使用更健壮的模式（如 Result 类型），避免过滥的 try/catch。

## Setup & Running
*   **Dev**: `npm run dev`
*   **Build**: `npm run build`
*   **Lint**: `npm run lint`
*   **Tests**: `node --import tsx --test <paths>`
*   **DB**: `npx prisma migrate dev`
*   **Sync**: `npm run sync` (rsync to remote)

## Architecture Details
*   `src/lib/transcription`: Provider 工厂模式；`TRANSCRIPTION_PROVIDER` 未设置时回退到 `openai`。
*   `src/components/feature`: 包含 AudioPlayer 和 ShadowingConsole。
*   `src/lib/fsrs.ts`: 基于 FSRS-4.5 的复习调度逻辑，详见 [docs/review-system.md](./docs/review-system.md)。
*   `undici`: 负责全局 fetch 代理拦截。

---
*Note: This file serves as the primary instructional context for Gemini Agent, including all project-specific coding standards (Equivalent to CLAUDE.md).*
