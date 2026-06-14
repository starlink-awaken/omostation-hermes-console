# AGENTS.md — Hermes Console

> eCOS v5 Web 控制台 · Hermes Agent 集群管理 + 配置 + 监控

## Quick Commands

```bash
cd projects/hermes-console
bun install
bun run dev     # 开发服务器
bun run build   # 生产构建
bun run lint    # ESLint 检查
```

## Architecture

已集成至 cockpit Web Dashboard：

```
hermes-console/        ── 前端 UI（本仓，TypeScript + React + Vite）
projects/cockpit/     ── 后端 API + 数据（Cockpit FastAPI 启动时自动 Mount dist 目录至 /hermes）
```

### 功能

- Agent 集群状态面板
- 配置管理界面
- 运行日志查看
- 任务调度管理

## Dependencies

- Bun runtime, TypeScript, React, Vite, React Flow

## Testing

```bash
bun run lint
bunx tsc --noEmit   # 类型检查
```
