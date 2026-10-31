# CLAUDE.md

NestJS application that runs purely as a CLI (`nest-commander`): no HTTP server, no controllers.
Node 22+. `npm run lint` and `npm run build` must pass before a change is done.

## Code conventions

Enforced by `eslint.config.mjs`:

- Logic lives in classes. No exported functions and no exported arrow functions.
- `*.types.ts` holds interfaces and type aliases, `*.enum.ts` holds enums, `*.constants.ts` holds
  constants, `*.schema.ts` holds zod schemas. These declarations appear nowhere else.

### Tools

Each file tool is a folder with three layers:

- `*.tool.ts` — thin adapter: calls the validator, then the service, and never throws.
- `*.validator.ts` — all input and policy validation; read-only filesystem checks only.
- `*.service.ts` — does the work and trusts the validated input.

Tools never throw to the model: they return a string starting with `Error: ` that says what went
wrong and what to do next. Reuse `WorkspaceService.resolveSafe`, `PathPolicy`, `BinaryDetector`,
`ErrorInspector`, `ByteSizeFormatter` and `AtomicFileWriter` instead of duplicating them.

Tool descriptions, parameter hints and tool flags come only from `FILE_TOOL_DEFINITIONS` in
`src/workspace/tools/file-tool.constants.ts`, rendered by `ToolDefinitionRenderer`. No description
text inline in `.tool.ts` or `.schema.ts`.

Only `GitService` spawns git: with an argument array, never a shell, user paths after `--`, refs
validated first, and an environment that carries no secrets.

### Agent definitions

Each agent is described by an `AgentDefinition` object in `src/agents/agent-definitions.constants.ts`.
Instruction text is produced only by `AgentDefinitionRenderer`; no prompt text inline in services.
Facts about a run (counts, tokens, durations) are computed by code, never reported by the model.

### Role-scoped rules

Write access can be restricted per agent role in code (`RoleWritePolicy`), not by prompts. QA may
write test files only and tests only the code changed in the current step.
Pass/fail results, counts, freshness, the list of changed files and token usage are computed by code
from recorded facts (`CommandRunRecorder`, `ChangeTracker`, git), never reported by the model.
Agents receive their input from code-built, typed packets rendered by `*InputRenderer` classes.
Claims of other agents are shown as claims.
