# Symphony 智能开发协调器

Symphony 是仓库内置的一套本地任务协调脚手架，用来轮询 Tracker、创建隔离工作区、执行工作流命令，并把运行状态暴露给 Dashboard。它已经能跑通端到端链路，但默认配置仍偏演示/脚手架性质，不应直接视为“无人值守自动开发”。

## 当前实现包含什么

- **任务轮询**：`src/symphony/orchestrator.ts` 按 `WORKFLOW.md` 中的轮询间隔拉取任务
- **Tracker 抽象**：当前提供 `LinearTracker`
- **隔离运行**：在 `.symphony_workspaces/` 下为任务创建独立工作区
- **生命周期钩子**：支持 `after_create` / `before_run` / `after_run`
- **状态落盘**：将运行状态写入 `.symphony_state.json`
- **可视化面板**：`/dashboard/symphony` 通过 `/api/symphony/state` 展示在线状态与活动任务

## 当前边界与注意事项

- 如果 `.env` 中没有有效的 `LINEAR_API_KEY`，`LinearTracker` 会回退到内置 mock issue，便于本地演练整条链路
- 当前 `WORKFLOW.md` 里的 `codex.command` 默认仍是 `echo + sleep` 的占位命令，启动后只会模拟一次 agent run
- 因此，Symphony 目前更适合作为项目内 orchestration scaffold，而不是可直接信赖的生产级自动开发系统

## 快速上手

### 1. 环境准备

如果你要连接真实 Linear：

1. 在 Linear 中创建或确认目标项目
2. 生成 Personal API Key
3. 写入 `.env`

```env
LINEAR_API_KEY=lin_api_...
```

### 2. 初始化项目

```bash
npm run setup
```

这个脚本会：

- 安装 Node 依赖
- 补齐 `.env` 中的 `LINEAR_API_KEY` 占位
- 执行 Prisma generate / migrate

### 3. 配置工作流

编辑根目录 `WORKFLOW.md`，主要关注：

- `tracker.project_slug`
- `tracker.active_states` / `terminal_states`
- `workspace.root`
- `workspace.hooks`
- `agent.max_concurrent_agents`
- `codex.command`

### 4. 启动 Symphony

```bash
npm run symphony
```

启动后：

- 协调器会持续轮询任务
- 运行状态会写入 `.symphony_state.json`
- 可在 `/dashboard/symphony` 查看最近一次轮询和当前活动任务

## 目录结构

- `bin/setup`: Symphony 初始化脚本
- `bin/symphony`: Symphony 启动入口
- `WORKFLOW.md`: 工作流配置与 agent 提示模板
- `src/symphony/`: 协调器、tracker、runner、workspace 等核心逻辑
- `.symphony_workspaces/`: 任务隔离工作区
- `.symphony_state.json`: 运行时状态文件

## 最佳实践

1. 把 Issue 拆得足够原子，避免单个任务横跨多个独立目标
2. 在 Issue 描述中明确验收条件和受影响模块
3. 在替换默认 `codex.command` 之前，不要把当前工作流当成真实自动开发流程
4. 运行期间关注终端日志和 `/dashboard/symphony` 状态页，及时发现卡住的任务
