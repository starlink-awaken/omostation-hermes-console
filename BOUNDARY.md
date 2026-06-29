# cockpit-ui — System Boundary

> 本文档描述 cockpit-ui 与 eCOS 系统其他部分的边界：暴露的接口、依赖的上游、影响的下游。
>
> 架构演进对比参见：[`docs/ARCHITECTURE-EVOLUTION.md`](../docs/ARCHITECTURE-EVOLUTION.md)

---

## 1. 暴露接口

### BOS URI



### 入口

- **Dev**: `bun run dev` :5173
- **Build**: `bun run build` 
- **Production**: `mounted by cockpit FastAPI at /hermes` 

## 2. 上游依赖

- cockpit (L3)
- agora :7430

## 3. 下游影响



## 4. 配置 / SSOT

- 项目源码：`projects/cockpit-ui/`
- 入口定义：`projects/cockpit-ui/pyproject.toml` 或 `package.json`
- 测试：`cd projects/cockpit-ui && bun run lint && bunx tsc --noEmit`
