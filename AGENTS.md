# AGENTS.md — Cockpit UI

    > Scope: project-local developer guide for `cockpit-ui`.
    > Workspace rules live in [`../../AGENTS.md`](../../AGENTS.md); project metadata lives in [`../../docs/project-registry.yaml`](../../docs/project-registry.yaml).

    ## Role

    - Layer: L3/X
    - Stack: TypeScript / Vite / Bun
    - Responsibility: cockpit 挂载的 Web 控制台 UI

    Do not copy volatile facts such as test counts, tool counts, service counts, ports, or current health into this file.

    ## Before Editing

    1. Read this file and [`CLAUDE.md`](CLAUDE.md) when it exists.
    2. Check `git status --short` inside this project and at the workspace root.
    3. Read the specific source or tests you are about to change.
    4. Prefer project-local commands and targeted tests.

    ## Commands

    ```bash
    bun install
bun run build
bun run lint
    ```

    ## Key Files

    - `src/`
- `src/lib/`
- vite.config.*
- `package.json`

    ## Gotchas

    - UI 入口挂载关系以 cockpit 文档和端口注册表为准。
- 不要在 UI 文档复制后端接口数量或端口。

    ## Verification

    - Documentation-only changes: run `uv run --with "pyyaml" python "../../bin/doc-ssot-lint.py" --json` from this project or from the workspace root.
    - Code changes: run the narrowest relevant project test first, then broaden if shared contracts changed.
    - Cross-layer behavior: verify the caller and the callee, not just the touched module.

    ## SSOT Pointers

    - Workspace architecture: [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md)
    - Layer index: [`../../LAYER-INDEX.md`](../../LAYER-INDEX.md)
    - Project metadata: [`../../docs/project-registry.yaml`](../../docs/project-registry.yaml)
    - Runtime state: [`../../.omo/state/system.yaml`](../../.omo/state/system.yaml)
