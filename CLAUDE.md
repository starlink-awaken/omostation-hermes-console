# CLAUDE.md — hermes-console

> AI Agent 操作指南。修改此项目前请先阅读。

## 核心概念

hermes-console 是 eCOS v5 中的 **Agent 控制台 UI** —— Vite + React 19 + TypeScript，用于观察/调度/调试运行中的 Agent 工作流。

- **数据源**: 通过 agora HTTP / MCP 读取注册中心、调用 event_bus
- **渲染**: ReactFlow 工作流图、react 组件 + lucide-react icons
- **构建**: bun (推荐) 或 vite

## §bus 子包接入 (R59, Month 1)

> **决策**: hermes-console 是 TypeScript 项目，不直接 import `agora.bus` (Python package)。改用 HTTP 适配模式。

### 适配器

`src/hermes_console/bus_adapter.ts` — 105 行 TypeScript，封装：

- `HermesBus` 类 — 镜像 agora.bus facade 的 `publish/subscribe` 契约
- `BusEnvelope` 接口 — 与 `agora.bus.envelope.BusEnvelope` 字段一一对应
- HTTP 出口: `POST {agoraUrl}/mcp/event/publish` (走 agora MCP event tool)
- 本地 fan-out: 始终本地广播一份，UI 状态不阻塞网络
- 失败处理: 网络异常被吞掉，由 agora 路由器 + DLQ 兜底 (RETRY-OWNERSHIP)

### 使用

```ts
import { hermesBus } from "@/hermes_console/bus_adapter";

const env = hermesBus.buildEnvelope("pipeline:completed", { runId: "abc" });
await hermesBus.publish(env);

const unsub = hermesBus.subscribe("message:received", async (e) => {
  console.log("got event", e.id, e.payload);
});
```

### 配置

设置环境变量 `VITE_AGORA_URL=http://localhost:7070` 即可让 adapter 启用 HTTP 出口。未设置时仅本地 fan-out（开发模式）。

### 测试

```bash
bun test src/hermes_console/bus_adapter.test.ts
```

3 个 case 覆盖：envelope 字段、local fan-out、agora 不可达时吞错。

## 文件职责

| 文件 | 职责 |
|------|------|
| `src/hermes_console/bus_adapter.ts` | agora.bus TS 适配器 (publish/subscribe) |
| `src/hermes_console/bus_adapter.test.ts` | 适配器单测 (3 cases) |
| `src/components/*` | React 组件层 (WorkflowGraph / EnginesView 等) |
| `vite.config.ts` | Vite 构建配置 |

## 安全检查清单

- [x] adapter 失败不重试 (透传给 agora 路由器 + DLQ)
- [x] agoraUrl 必须以 http(s):// 开头 (前端环境变量来源可信)
- [x] 事件 payload 走 JSON 序列化，不注入 HTML
