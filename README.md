# hermes-console

> eCOS v5 Hermes 拓扑控制台 — 挂载至 cockpit `/hermes/*`

## Quick Commands

```bash
bun install
bun run dev          # Vite 开发服务器
bun run build        # tsc + vite build
bun run lint         # eslint
```

## Architecture

React 19 + TypeScript + Vite + React Flow (拓扑可视化)。

- 挂载至 cockpit: `projects/hermes-console/dist/` → cockpit `/hermes/*`
- 独立运行: `bun run dev` (port 5173)

## Key Components

| 组件 | 职责 |
|------|------|
| `TopologyView` | Agent 拓扑可视化 (React Flow) |
| `BusAdapter` | Agora bus 事件订阅 |
| `StatusPanel` | 服务状态展示 |
