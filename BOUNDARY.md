# hermes-console — System Boundary

> 本文档描述 hermes-console 与 eCOS 系统其他部分的边界：暴露的接口、依赖的上游、影响的下游。
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

- 项目源码：`projects/hermes-console/`
- 入口定义：`projects/hermes-console/pyproject.toml` 或 `package.json`
- 测试：`cd projects/hermes-console && bun run lint && bunx tsc --noEmit`
