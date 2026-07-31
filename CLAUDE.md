# CLAUDE.md — Cockpit UI AI Context

    > Session loader for AI work inside `cockpit-ui`.
    > Keep durable engineering rules in [`AGENTS.md`](AGENTS.md) and volatile facts in SSOT files.

    ## Load First

    1. [`AGENTS.md`](AGENTS.md)
    2. [`README.md`](README.md) when present
    3. The source files and tests directly related to the task
    4. Workspace context in [`../../CLAUDE.md`](../../CLAUDE.md) when the task crosses project boundaries

    ## Project Role

    - Layer: L3/X
    - Responsibility: cockpit 挂载的 Web 控制台 UI
    - Stack: TypeScript / Vite / Bun

    ## Commands

    ```bash
    bun install
bun run build
bun run lint
    ```

    ## Safe Editing Rules

    - UI 入口挂载关系以 cockpit 文档和端口注册表为准。
- 不要在 UI 文档复制后端接口数量或端口。

    - Do not commit, push, reset, or bump submodule pointers unless the user explicitly asks.
    - Preserve unrelated dirty changes in this repository.
    - Keep Markdown pointed at SSOT files instead of copying generated facts.

    ## Closeout

    ```bash
    git status --short
    uv run --with "pyyaml" python "../../bin/ssot/doc-ssot-lint.py" --json
    ```

    Report the checks you actually ran and any pre-existing dirty state that remains.
