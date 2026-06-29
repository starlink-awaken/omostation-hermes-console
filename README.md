# Cockpit UI

    > L3/X · cockpit 挂载的 Web 控制台 UI
    > Metadata SSOT: [`../../docs/project-registry.yaml`](../../docs/project-registry.yaml)

    ## What It Owns

    cockpit 挂载的 Web 控制台 UI.

    ## Quick Start

    ```bash
    bun install
bun run build
bun run lint
    ```

    ## Key Surfaces

    - `src/`
- `src/lib/`
- vite.config.*
- `package.json`

    ## Documentation

    - Developer guide: [`AGENTS.md`](AGENTS.md)
    - AI context loader: [`CLAUDE.md`](CLAUDE.md) when present
    - Workspace architecture: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)
    - Layer placement: [`../../LAYER-INDEX.md`](../../LAYER-INDEX.md)

    ## SSOT Rules

    Runtime facts, counts, ports, health, and generated inventories are intentionally not maintained here. Use the workspace registries and project source as the truth.
