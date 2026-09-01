# DESIGN.md

Cockpit UI — operator-facing React SPA for monitoring and managing the eCOS
multi-agent system, its governance state, and CLI/command capabilities.

## Purpose

Cockpit Console is the human-facing dashboard for the OMO multi-agent system.
It surfaces real-time state from the cockpit MCP server, allowing operators to:

- Inspect running services, agents, and their health
- Browse the full CLI command catalog with search and guidance
- Visualize multi-command chain workflows as DAGs
- Monitor command quality via 15-dimension audit scorecards
- Track resident agent status and BCOS business metrics
- Navigate the full capability landscape (MCP / BOS / CLI / Workflows)

## Architecture

**Stack:** React 19 + TypeScript + Vite 8 (bun) + Tailwind v4

**Data flow:**

```
Operator Browser
     │
     ▼
React SPA (cockpit-ui/)
     │  GET /api/*
     ▼
Cockpit MCP/HTTP Server (localhost:8090)
     │
     ▼
Workspace SSOT files / CLI delegation
```

**Key dependencies:**

- `@tanstack/react-query` — server-state management
- `zustand` — client-state management
- `recharts` — charts (audit scorecards, trends)
- `reactflow` — DAG visualization (chain studio)
- `lucide-react` — icon system

## Design System

**Token source:** `src/styles/theme.css` (`@theme` block) — single SSOT for
colors, spacing, radius, z-index, animation durations.

**Surface hierarchy:** `surface-0` (app base) → `surface-1` (panel) →
`surface-2` (raised/card) → `surface-3` (overlay)

**Status colors:** `status-ok` / `status-warn` / `status-error` (with `-muted`
variants for backgrounds)

**Single accent:** `accent` (indigo) — used for primary actions and links

### Shared Components

| Component | Purpose |
|-----------|---------|
| `PageHeader` | Consistent page title + subtitle + actions |
| `StatusBadge` | Maturity / risk / status indicators |
| `LoadingSkeleton` | Loading placeholder |
| `EmptyState` | Empty / error / no-data states |
| `DataTable` | Sortable data table |

Import from `@/components/ui`:

```tsx
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
```

## Information Architecture

**Route source:** `src/routes.tsx` (`ROUTES` array) — single source of truth
for routing, navigation, and page metadata.

**Route metadata:** `cockpitPageRegistry.ts` and `cockpitNavigation.ts` derive
from `ROUTES` — no independent duplication.

**7 functional domains:**

1. 总览与导航 — Home, Guide, SystemMap, Capabilities
2. 运行与观测 — Overview, Mesh, Topology, Compute, Observability, Logs
3. 治理与合规 — Governance, Audit, P74, L4Health, Debt, Alerts
4. 知识与研究 — Research, Knowledge, KEMS, SceneCards, DecisionInbox
5. Agent 与链路 — Commands, Chain, Resident, BCOS, Swarm, Brain
6. 开发工具 — Tasks, Performance, Sandbox, Workflows, DomainApps
7. 配置 — Settings

## API Surface

All API calls go through `src/api/client.ts` (`apiFetch` / `apiPost` /
`apiPut` / `apiDelete`) with 30s timeout + AbortController.

**Hooks:** `src/api/hooks/` — split by domain (system, tasks, kems, research,
knowledge, governance, observability, workbench, gbrain, swarm). Barrel
`index.ts` re-exports all.

**Reflection endpoints** (new in Phase 2):

| Endpoint | Source |
|----------|--------|
| `/api/commands` | `COMMAND_CATALOG` + `help_map` |
| `/api/chains` | `cockpit/chain/spec.py` |
| `/api/command-audit/*` | `docs/command-audit/*.yaml` |
| `/api/resident` | `omo resident status` (subprocess) |
| `/api/bcos` | `bin/bc-os/north_star_meter_v2.py` (subprocess) |
| `/api/p74` | `bin/agent-workflow.py compliance` (subprocess) |

## Testing

- **Unit/Component:** vitest + `@testing-library/react` (`src/**/__tests__/`)
- **E2E:** puppeteer-core (`tests/e2e/pages-smoke.mjs`) — full page smoke matrix
- **Type checking:** `tsc --noEmit` (in build script)
- **Baseline:** `tests/baseline-check.sh` — install → typecheck → unit → build → preview → e2e
