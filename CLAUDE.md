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

### Reviewer

The Reviewer is read-only by construction: its role tool set contains no tool with
`mutatesWorkspace = true`.
Its verdict is computed by code from the severities it reports and from unmet acceptance criteria,
never taken from the model.
Severity definitions live in the Reviewer definition and must not be changed without updating
`BLOCKING_SEVERITIES`.

### Orchestrator

The Orchestrator is defined as one task definition per output (`ORCHESTRATOR_TASKS`): Plan, Brief,
Decide, Summarize.
Only the Plan task has tools. It never calls the other agents: `PlanExecutor` runs them and applies
its decisions.
Every decision passes through `DecisionGuard`, which may override it on recorded facts; overrides
are stored and reported, never silent.
Findings of other agents are forwarded to the Developer verbatim by `ReworkBriefBuilder`.

### Execution

`PlanExecutor` owns the run: planning, the ordered steps, attempts, budget and the final report.
`StepRunner` owns one step.
Agents are reached only through the `AgentInvoker` port, so core code never imports the SDK.
Decisions pass through `DecisionGuard`; accepted steps are committed one per step on the run
branch; nothing is ever pushed.

### Database

- DB: PostgreSQL 16 via docker-compose, **Prisma** (`prisma/schema.prisma`), migrations only
  (`prisma migrate`).
- All DB changes go through Prisma migrations in `prisma/migrations`. Only repositories in
  `src/db/repositories` use `PrismaService`.
- Model prices live in the `model_prices` table and are applied by `CostCalculator`, never
  hardcoded in logic. Money is `Decimal`, never float: it becomes a number only where it is
  displayed.
- A database write must never lose agent work: everything except the run row is guarded, logged
  and reported as a warning instead of throwing.

### SDK boundary

Only `src/sdk` imports `@openai/agents`. The rest of the code talks to agents through the
`AgentInvoker` port.
Every model call is recorded by the invoker through `AgentCallRepository`: there is no path to a
model that is not accounted for.
A fresh `Agent` and a fresh `AgentCallContext` are built per call, because tools carry that
call's recorders.
Output schemas live in `AgentOutputRegistry`; models per role come from `agents.config.ts` with
env overrides.
