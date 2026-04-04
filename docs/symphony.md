# Symphony 智能开发协调器

Symphony 是一个集成在 DeepListener 中的自动化任务处理服务。它基于 OpenAI 的 Symphony 规范实现，旨在将项目中的任务（Linear Issues）自动分配给 AI 代理进行处理。

## 核心功能

- **任务轮询**：自动监控 Linear 任务看板。
- **隔离运行**：在 `.symphony_workspaces/` 下为每个任务创建独立的隔离环境。
- **自动执行**：根据 `WORKFLOW.md` 中的策略，调用 AI 代理（如 Gemini 或 Codex）完成开发任务。
- **生命周期钩子**：支持任务创建后（`after_create`）、执行前（`before_run`）和执行后（`after_run`）的自定义脚本。

## 快速上手

### 1. 环境准备

你需要一个 [Linear](https://linear.app/) 账号来管理任务：
1. 在 Linear 中创建一个项目（例如 `DeepListener`）。
2. 在 **Settings -> Security & access -> Personal API keys** 中生成一个 Key。
3. 将 Key 添加到项目根目录的 `.env` 文件中：
   ```env
   LINEAR_API_KEY=lin_api_...
   ```

### 2. 初始化项目

在开始使用之前，运行初始化脚本以安装依赖并准备数据库：
```bash
./bin/setup
```

### 3. 配置工作流

查看并根据需要修改根目录下的 `WORKFLOW.md`。该文件定义了：
- **tracker**: 监控的 Linear 项目标识（`project_slug`）。
- **workspace**: 隔离环境的存储位置和初始化脚本。
- **agent**: 最大并发任务数和重试策略。
- **codex**: 具体执行任务的 AI 模型指令。

### 4. 启动 Symphony

运行以下命令启动协调器服务：
```bash
./bin/symphony
```
它将开始轮询 Linear 任务，并在发现符合条件的 Issue（如状态为 "Todo"）时自动触发 AI 开发流程。

## 目录结构

- `bin/symphony`: 服务启动入口脚本。
- `bin/setup`: 环境初始化脚本。
- `WORKFLOW.md`: 核心配置策略文件。
- `src/symphony/`: Symphony 协调器的具体逻辑实现。
- `.symphony_workspaces/`: 运行过程中产生的隔离工作区（不应提交到 Git）。

## 最佳实践

1. **原子化 Issue**: 尽量将 Linear 中的任务拆解为单一功能的 Issue，这有助于 AI 代理更精准地完成工作。
2. **详细描述**: 在 Issue 的描述中提供清晰的需求和验收标准。
3. **监控日志**: Symphony 在运行时会输出详细的调度日志，建议在开发过程中保持关注。
