# CODE-REPORT

Factual review of `TrusteeAgent` as the code stands at commit `d24c432` plus the uncommitted
working tree. Method: static analysis of all 325 `.ts` files under `src/` (there are no test
files: `find src -name '*.spec.ts' -o -name '*.test.ts'` returns 0 results), plus a transitive
import-reachability walk from `src/main.ts`. `npm run lint` exits 0 and `npm run build` exits 0,
both verified in this session.

Where a claim could not be established statically it is marked **unverified**.

---

## 0. The single most important fact

The `run` command — the one that would drive the multi-agent pipeline — is a stub.

`src/cli/run.command.ts:27-30`:
```
    console.log(`prompt: ${prompt}`);
    console.log(`workspace: ${WorkspacePathResolver.toAbsolute(options.workspace)}`);
    console.log(`tui: ${options.tui ? 'enabled' : 'disabled'}`);
    console.log(RUN_NOT_IMPLEMENTED_MESSAGE);
```
Its `@Command` description is literally `'Run a prompt against the agent team (stub)'`
(`src/cli/run.command.ts:13`).

Consequences, each verified:

- `PlanExecutor` (554 lines, the largest file in the repo) is imported by **no** file.
  `grep -rn "PlanExecutor" src/` returns only matches inside `src/execution/plan-executor.ts`
  itself and a comment in `src/execution/run-state.ts:9`. It appears in no `providers` array:
  the only modules are `src/app.module.ts`, `src/cli/cli.module.ts`, `src/db/db.module.ts`,
  `src/events/events.module.ts`, `src/sdk/sdk.module.ts`, `src/workspace/workspace.module.ts`,
  and `src/cli/cli.module.ts:19-32` lists providers without it.
- `PlanExecutor` injects four DI tokens — `AGENT_INVOKER`, `PLAN_REPOSITORY`,
  `ATTEMPT_REPOSITORY`, `USER_PROMPTER` (`src/execution/plan-executor.ts:75-78`, tokens declared
  at `src/execution/execution.constants.ts:74-77`). **No module provides any of these four
  tokens**; `grep -rn "PLAN_REPOSITORY\|ATTEMPT_REPOSITORY\|USER_PROMPTER\|AGENT_INVOKER" src/`
  shows only the declaration and the two injection sites. So even if `PlanExecutor` were added to
  a `providers` array, Nest could not construct it.
- 30 files / 2,376 lines (14.2% of `src/`) are unreachable from `src/main.ts` by any import
  chain. They are marked `‡` in the inventory in section A and listed in section D.

The reachable product today is: `team agent <role> <task>` (one agent, one call, no branch, no
commit), plus the read-only/reporting commands `agents`, `tools`, `usage`, `history`, `prices`,
`runs:prune`. `src/cli/agent.command.ts:32-33` states this in its own comment: *"This is the
checkpoint that proves the SDK integration before the executor runs the whole pipeline: no
branches, no commits."*

Everything in sections C–F should be read against that: a large part of the layering exists to
serve a caller that does not exist.

---

## A. Inventory

Totals:

| metric | value |
|---|---|
| total `.ts` files under `src/` (no tests exist) | **325** |
| total lines | **16,773** |
| median file size | **30 lines** |
| mean file size | 51.6 lines |
| files ≤ 15 lines | 102 (31.4%) |
| files ≤ 30 lines | 165 (50.8%) |
| files with 0 importers | **4** |
| files unreachable from `src/main.ts` | 30 (2,376 lines) |

The 4 files with zero importers:

| file | lines | note |
|---|---|---|
| `src/main.ts` | 10 | the entry point; correct to have no importers |
| `src/execution/plan-executor.ts` | 554 | dead |
| `src/execution/persistence/in-memory-plan.repository.ts` | 101 | dead |
| `src/execution/persistence/in-memory-attempt.repository.ts` | 29 | dead |

"Importers" counts distinct files containing a relative `import`/`export … from` that resolves to
the file. `exports` counts top-level `export` declarations (`class`/`interface`/`type`/`enum`/
`const`/`function`). Rows marked `‡` are unreachable from `src/main.ts`.

Twelve largest files, for scale:

| file | lines | reachable? |
|---|---|---|
| `src/execution/plan-executor.ts` | 554 | no |
| `src/workspace/git/git.service.ts` | 517 | yes |
| `src/execution/step-runner.ts` | 453 | no |
| `src/workspace/workspace.messages.ts` | 401 | yes |
| `src/workspace/tools/file-tool.constants.ts` | 346 | yes |
| `src/workspace/commands/command.policy.ts` | 273 | yes |
| `src/sdk/sdk-agent-invoker.ts` | 265 | yes |
| `src/agents/qa/qa-report.builder.ts` | 254 | yes |
| `src/db/repositories/agent-call.repository.ts` | 241 | yes |
| `src/agents/agent-definitions.constants.ts` | 229 | yes |
| `src/agents/reviewer/review-report.builder.ts` | 218 | yes |
| `src/execution/report/run-report.formatter.ts` | 217 | no |

The full 325-row table is in [Appendix A1](#appendix-a1--full-file-inventory) at the end of this
document, so the analysis stays readable.

---
## B. Traces

### B.1 — `write_file`: from the model's tool call to bytes on disk

Entered from `SdkAgentInvoker.runOnce`, which hands the built agent to the SDK; the SDK then
invokes the closure the adapter registered.

| # | file:line → function | what this hop adds |
|---|---|---|
| 1 | `src/sdk/sdk-agent-invoker.ts:185` → `SdkAgentInvoker.runOnce` | calls `run(built.agent, …, {stream:true})`; starts the SDK agent loop |
| 2 | *(inside `@openai/agents`)* | the SDK parses the model's tool call and dispatches it to the registered `execute` |
| 3 | `src/sdk/agent-tool.adapter.ts:27` → `execute` closure from `AgentToolAdapter.toSdkTool` | catches any throw and turns it into `"Error: internal tool failure: …"` text (`:33`) so one bad call cannot kill the run |
| 4 | `src/sdk/agent-tool.adapter.ts:28` → `AgentCallContext.countToolCall` (`src/sdk/agent-call.context.ts:32`) | increments the per-call tool counter |
| 5 | `src/sdk/agent-tool.adapter.ts:29` → `emitter?.toolCalled` | **nothing on the default path**: `src/sdk/sdk-agent-invoker.ts:86` passes `streaming ? null : emitter`, and streaming defaults to `true` (`src/sdk/sdk.constants.ts:4`), so `emitter` is `null` here |
| 6 | `src/sdk/agent-tool.adapter.ts:31` → `agentTool.execute(input)` | **forwards only** |
| 7 | *(QA only)* `src/workspace/tools/role-scoped-write.tool.ts:32` → `RoleScopedWriteTool.execute` | re-resolves the path and applies `RoleWritePolicy` before the real tool; skipped for Developer, because `RoleWritePolicy.hasRules` is false for every role but QA (`src/workspace/security/role-write-rules.constants.ts:21-27`, gate at `src/workspace/tools/file-tool.registry.ts:73`) |
| 8 | `src/workspace/tools/write-file/write-file.tool.ts:29` → `WriteFileTool.execute` | **forwards only**: `service.write(await validator.validate(input))`, wrapped in the try/catch at `:28-32` that converts a throw into `Error: …` |
| 9 | `src/workspace/tools/write-file/write-file.validator.ts:18` → `WriteFileValidator.validate` | zod `safeParse`; on failure throws `ToolValidationError` with the issue messages |
| 10 | `src/workspace/tools/write-file/write-file.validator.ts:26` → `WorkspaceService.resolveSafe` | — |
| 11 | `src/workspace/workspace.service.ts:48` → `WorkspaceService.resolveSafe` | rejects empty paths and NUL bytes (`:49-54`), resolves against the root |
| 12 | `src/workspace/workspace.service.ts:63` → `assertInside` | rejects anything resolving outside the workspace root |
| 13 | `src/workspace/workspace.service.ts:73` → `realpathOfNearestExisting` | walks up to the nearest existing ancestor and re-checks, so a symlink cannot escape the root |
| 14 | `src/workspace/workspace.service.ts:43` → `toRelative` | normalises to a POSIX-separated workspace-relative path |
| 15 | `src/workspace/security/path.policy.ts:64` → `PathPolicy.denyWriteReason` | denies `.git`, `.env`, and the other protected paths |
| 16 | `src/workspace/tools/write-file/write-file.validator.ts:36-41` | enforces `MAX_WRITE_CONTENT_BYTES` = 200 KB (`src/workspace/tools/file-tool.constants.ts:13`) |
| 17 | `src/workspace/tools/write-file/write-file.validator.ts:43-56` → `lstat` | reads the existing target's kind and mode without following the link |
| 18 | `src/workspace/security/path.policy.ts:77` → `PathPolicy.denyWriteTargetReason` | denies writing over a directory or a symlink |
| 19 | `src/workspace/tools/write-file/write-file.validator.ts:63-70` | assembles `ValidatedWriteFileRequest`, masking the mode with `FILE_MODE_MASK` |
| 20 | `src/workspace/tools/write-file/write-file.service.ts:18` → `WriteFileService.write` → `AtomicFileWriter.replace` | — |
| 21 | `src/workspace/io/atomic-file.writer.ts:11` → `mkdir(dir, {recursive:true})` | creates missing parent directories |
| 22 | `src/workspace/io/atomic-file.writer.ts:26` → `temporaryPath` | random 6-byte hex suffix so two concurrent writes cannot collide |
| 23 | `src/workspace/io/atomic-file.writer.ts:15` → `writeFile(temporary, …)` | **the bytes reach the disk here**, in the temp file, mode `0o644` |
| 24 | `src/workspace/io/atomic-file.writer.ts:16-18` → `chmod` | restores the previous file's mode when the file existed |
| 25 | `src/workspace/io/atomic-file.writer.ts:19` → `rename` | **the bytes become the target file here**, atomically; `:21` unlinks the temp file on failure |
| 26 | `src/workspace/tools/write-file/write-file.service.ts:20` | derives `WriteOutcome` from `existingTarget === null` |
| 27 | `src/workspace/tools/write-file/write-file.service.ts:21-26` → `AgentCallStore.current()` (`src/workspace/activity/agent-call.store.ts:17`) | reads the current `AsyncLocalStorage` frame; `undefined` outside a call, and then nothing is recorded |
| 28 | `src/workspace/activity/change-tracker.ts:10` → `ChangeTracker.record` | merges with an earlier change to the same path and stamps a sequence number |
| 29 | `src/workspace/tools/write-file/write-file.service.ts:28` → `WorkspaceMessages.writeResult` (`src/workspace/workspace.messages.ts:134`) | formats the string the model sees |
| 30 | returns up through hops 8 → 6 → 3 → SDK | **pure returns** |

- **Hops: 30** (29 in this repo's code, 1 inside the SDK); 24 of them on the Developer path, which skips hop 7.
- **Files touched: 11** — `sdk-agent-invoker.ts`, `agent-tool.adapter.ts`, `agent-call.context.ts`, `write-file.tool.ts`, `write-file.validator.ts`, `write-file.service.ts`, `workspace.service.ts`, `path.policy.ts`, `atomic-file.writer.ts`, `agent-call.store.ts`, `change-tracker.ts` (13 if `role-scoped-write.tool.ts` and `workspace.messages.ts` are counted).
- **Hops that do nothing but forward arguments: 4** — hop 6 (`agentTool.execute(input)`), hop 8 (`WriteFileTool.execute`, whose entire body is `return await this.service.write(await this.validator.validate(input))`), hop 20, and hop 5 which is a no-op on the default path. Hop 27 (`AgentCallStore.current()`) is a one-line delegation to `AsyncLocalStorage.getStore()`.

Everything from hop 9 to hop 25 does real work. The suspect hops are 3–8: four files
(`agent-tool.adapter.ts`, `agent-call.context.ts`, `write-file.tool.ts`, and the `*.types.ts`
beside it) between the SDK and the validator.

### B.2 — `team agents`, from CLI entry to printed output

| # | file:line → function | what this hop adds |
|---|---|---|
| 1 | `src/main.ts:5` → `bootstrap` | the process entry |
| 2 | `src/main.ts:6` → `EnvironmentFile.load` (`src/config/environment-file.ts:6`) | wraps `process.loadEnvFile('.env')` in a try/catch so a missing `.env` is not fatal |
| 3 | `src/main.ts:7` → `CommandFactory.run(AppModule, ['warn','error'])` | hands over to `nest-commander`: builds the Nest container and dispatches on `argv` |
| 4 | `src/app.module.ts:8` → `AppModule` imports | pulls in `DbModule`, `EventsModule`, `CliModule`, `WorkspaceModule` |
| 5 | `src/workspace/workspace.module.ts:40` → `WorkspaceRootResolver.fromArgv(process.argv)` | runs **for this command too**: scans argv for `-w/--workspace`, `existsSync`-checks it, and `process.exit`s if missing (`src/workspace/workspace-root.resolver.ts:22-25`). All 24 tool/service providers at `src/workspace/workspace.module.ts:41-72` are constructed before `agents` prints anything |
| 6 | `src/cli/cli.module.ts:27` → `AgentsCommand` registered as a provider | — |
| 7 | *(inside `nest-commander`/`commander`)* | matches `agents` against the `@Command({name:'agents'})` decorator at `src/cli/agents.command.ts:10-13` |
| 8 | `src/cli/agents.command.ts:15` → `AgentsCommand.run` | — |
| 9 | `src/cli/agents.command.ts:16-23` | computes two column widths from `TEAM_AGENTS` (`src/agents/agents.constants.ts:4`) |
| 10 | `src/cli/agents.command.ts:25-33` → `console.log` ×(2 + 4) | prints header, rule, one line per agent |

- **Hops: 10** (8 in this repo's code).
- **Files touched: 7** — `main.ts`, `environment-file.ts`, `app.module.ts`, `workspace.module.ts`, `workspace-root.resolver.ts`, `cli.module.ts`, `agents.command.ts`, plus the data file `agents.constants.ts`.
- **Hops that only forward: 0.** This trace is short because `AgentsCommand` bypasses the abstractions: it hand-rolls its own padding and rule characters (`src/cli/agents.command.ts:16-33`) instead of using `TableRenderer`, which exists at `src/cli/table.renderer.ts:10` and is used by `tools.command.ts:38`, `history.formatter.ts`, `usage.formatter.ts` and `prices.formatter.ts`. `src/cli/cli.constants.ts:23-24` even defines `AGENTS_TABLE_COLUMN_GAP` and `AGENTS_TABLE_RULE_CHARACTER` as aliases of the `TABLE_*` constants `TableRenderer` uses.

Also note the data duplication this trace exposes: `TEAM_AGENTS`
(`src/agents/agents.constants.ts:4-12`) is a second, independent list of the four agents with
one-line role descriptions, while `AGENT_DEFINITIONS`
(`src/agents/agent-definitions.constants.ts:8`) holds the real definitions with
`toolDescription`/`mission` for three of them and `ORCHESTRATOR_TASKS`
(`src/agents/orchestrator/orchestrator-tasks.constants.ts`) holds the fourth. Nothing keeps the
two in sync.

### B.3 — one agent definition, from its constant to the text sent to the model

Taking the Developer.

| # | file:line → function | what this hop adds |
|---|---|---|
| 1 | `src/agents/agent-definitions.constants.ts:9-67` → `AGENT_DEFINITIONS[AgentRole.Developer]` | the data: `mission`, `workflow[5]`, `rules[5]`, `outputFormat[5]`, `tools[9]`, `maxTurns` |
| 2 | `src/sdk/sdk-agent-invoker.ts:86` → `SdkAgentInvoker.build` | **forwards only**: picks `buildAgent` vs `buildOrchestrator` on `target.task === null` (`:135-141`) |
| 3 | `src/sdk/agent.factory.ts:30` → `AgentFactory.buildAgent` | looks the definition up by role |
| 4 | `src/sdk/agent.factory.ts:31` → `AgentDefinitionRenderer.instructions` | — |
| 5 | `src/agents/agent-definition.renderer.ts:13` | emits `You are the ${role}. ${mission}` |
| 6 | `src/agents/agent-definition.renderer.ts:15-22` → `section('Workflow:', …)` | numbers the workflow steps `1.`…`5.` |
| 7 | `src/agents/agent-definition.renderer.ts:23-25` → `bulleted('Rules:', …)` | prefixes each rule with `- ` |
| 8 | `src/agents/agent-definition.renderer.ts:26-28` → `bulleted('Final answer:', …)` | prefixes each output-format line with `- ` |
| 9 | `src/agents/agent-definition.renderer.ts:44` → `section` | joins header + lines with `\n` |
| 10 | `src/agents/agent-definition.renderer.ts:30` | joins the sections with `\n\n` → the finished instruction string |
| 11 | `src/sdk/agent.factory.ts:37-41` → `AgentFactory.adapt(this.registry.forRole(role), …)` | the tool half of the prompt: resolves the 9 named tools |
| 12 | `src/workspace/tools/file-tool.registry.ts:71` → `forRole` | maps names to instances, wrapping in `RoleScopedWriteTool` only when the role has write rules |
| 13 | `src/workspace/tools/write-file/write-file.tool.ts:17` → `ToolDefinitionRenderer.description(DEFINITION)` *(at class-construction time)* | — |
| 14 | `src/workspace/tools/tool-definition.renderer.ts:8-28` | assembles `summary` + `Before using:` + `Use it when:` + `Do NOT use it when …` + `Limits:` + `Refuses:` + notes into one description string |
| 15 | `src/workspace/tools/write-file/write-file.schema.ts:9-10` → `ToolDefinitionRenderer.parameterHint` | per-parameter `description`/`Example:`/`Default:` text onto the zod schema |
| 16 | `src/sdk/agent-tool.adapter.ts:21-24` → `tool({name, description, parameters})` | converts to the SDK's `FunctionTool` |
| 17 | `src/sdk/agent.factory.ts:32-43` → `new Agent({name, instructions, model, modelSettings, tools, outputType})` | binds instructions + tools + the zod output schema from `AgentOutputRegistry.forRole` (`src/sdk/agent-output.registry.ts:29`) |
| 18 | `src/sdk/agent.factory.ts:45-50` → returns `BuiltAgent` | keeps `instructions` alongside the agent so `:86` of the invoker can hash it |
| 19 | `src/sdk/sdk-agent-invoker.ts:185` → `run(built.agent, inputText, …)` | the SDK serialises instructions + tool schemas and sends them |
| 20 | `src/sdk/sdk-agent-invoker.ts:225` → `SdkAgentInvoker.hashOf(built.instructions)` | sha256 of the prompt, stored on the `agent_calls` row so prompt drift is visible |

- **Hops: 20.**
- **Files touched: 9** — `agent-definitions.constants.ts`, `sdk-agent-invoker.ts`, `agent.factory.ts`, `agent-definition.renderer.ts`, `file-tool.registry.ts`, `write-file.tool.ts`, `write-file.schema.ts`, `tool-definition.renderer.ts`, `agent-tool.adapter.ts` (+ `agent-output.registry.ts`).
- **Hops that only forward: 2** — hop 2 (`SdkAgentInvoker.build`) and hop 18. One more, `AgentDefinitionRenderer.toolDescription` (`src/agents/agent-definition.renderer.ts:33-35`), whose entire body is `return definition.toolDescription;`, is **never called at all** (`grep -rn "AgentDefinitionRenderer.toolDescription" src/` → no hits).

The structured-data-plus-renderer design does buy something here: hop 20 can hash a string that
is deterministic from data, and `src/cli/tools.command.ts` can list tool metadata without
touching a model. What it costs is that the Developer prompt is spread over
`agent-definitions.constants.ts` (229 lines), `agent-definition.renderer.ts` (47),
`agent-definition.types.ts` (15), `file-tool.constants.ts` (346) and
`tool-definition.renderer.ts` (59) — five files to read one prompt.

---
## C. Indirection census

### C.1 Interfaces / ports with exactly one implementation

`grep -rh "implements " src/` yields 7 distinct interface names. One of them is polymorphic; six
are not.

| interface | declared at | implementations | could anything else plausibly implement it here? |
|---|---|---|---|
| `AgentTool` | `src/agents/agent-tool.types.ts:3` | **10** (9 `*.tool.ts` + `RoleScopedWriteTool`) | yes — this is real polymorphism; `FileToolRegistry` and `AgentToolAdapter` both consume it as a list |
| `AgentInvoker` | `src/execution/agents/agent-invoker.port.types.ts` | 1 — `SdkAgentInvoker` (`src/sdk/sdk-agent-invoker.ts:48`) | no second implementation exists and no test double exists (there are no tests). The port's stated purpose is to keep SDK types out of core — but its only consumer, `PlanExecutor`, is dead, and the live consumer `src/cli/agent.command.ts:49` injects the concrete `SdkInvokerFactory` and never mentions the port |
| `PlanRepository` | `src/execution/persistence/plan-repository.port.types.ts:11` | 1 — `InMemoryPlanRepository` (`src/execution/persistence/in-memory-plan.repository.ts:21`), which is itself imported by nothing | **no.** Its own comment (`:9-10`) says *"The PostgreSQL implementation lives in src/db"* — that is **not true today**. `src/db/repositories/plan.repository.ts:10` declares `extends GuardedRepository` with no `implements`, and its method set (`createSteps`, `startStep`, `acceptStep`, `failStep`, `skipStep`, `stepsOf`) is **disjoint** from the port's (`openRun`, `createPlan`, `updateStepStatus`, `closeRun`, `loadRun`) |
| `AttemptRepository` | `src/execution/persistence/attempt-repository.port.types.ts:6` | 1 — `InMemoryAttemptRepository` (`src/execution/persistence/in-memory-attempt.repository.ts:7`), imported by nothing | same: `src/db/repositories/attempt.repository.ts` has `append` / `attemptsOf(stepId)`, the port has `appendAttempt` / `appendAgentCall` / `attemptsOf(runId, stepIndex)` |
| `UserPrompter` | `src/execution/interaction/user-prompter.port.types.ts:3` | 1 — `ConsoleUserPrompter` (`src/execution/interaction/console-user-prompter.ts:9`) | no. The only live caller, `src/cli/runs-prune.command.ts:93`, calls `ConsoleUserPrompter.forTty()` concretely and never types against the interface. The interface exists for `PlanExecutor` (`src/execution/plan-executor.ts:78`), which is dead |
| `ApprovalGate` | `src/workspace/approval/approval-gate.types.ts:6` | 1 — `LoggingApprovalGate` (`src/workspace/approval/logging-approval-gate.ts:8`), whose body is one `logger.warn` and `return true` | the file says `// TEMPORARY: replace with the interactive gate` (`:6`). One consumer: `src/workspace/tools/run-command/run-command.service.ts:32`. The token + types + impl = 3 files for a call that always returns `true` |
| `AgentEventListener` | `src/events/agent-event.types.ts:142` | 1 — `EventPrinter` (`src/cli/event-printer.ts:17`) | plausible — `EventBus` is a `Set<AgentEventListener>` and the comments at `src/events/event-bus.ts:4-6` and `src/events/events.module.ts:5-6` promise a database logger as a second subscriber. **That second subscriber does not exist**; `grep -rn "EventBus" src/` shows `subscribe` called in exactly one place, `src/cli/agent.command.ts:71` |

So: **6 of 7 interfaces have exactly one implementation, and 4 of those 6 have an implementation
that no code constructs.**

### C.2 Classes and methods that only delegate

Methods whose whole body is a single forwarding `return`, found mechanically:

| method | at | delegates to |
|---|---|---|
| `AgentDefinitionRenderer.toolDescription` | `src/agents/agent-definition.renderer.ts:33` | `definition.toolDescription` — **and nothing calls it** |
| `AgentFactory.orchestratorRole` | `src/sdk/agent.factory.ts:79` | `return AgentRole.Orchestrator;` — an 3-line method that returns a constant |
| `SdkAgentInvoker.orchestratorRole` | `src/sdk/sdk-agent-invoker.ts:235` | `this.factory.orchestratorRole()` — so reading one enum member costs two method hops |
| `SdkAgentInvoker.build` | `src/sdk/sdk-agent-invoker.ts:128-145` | picks `factory.buildAgent` / `factory.buildOrchestrator`; adds only the `target.task === null` test |
| `AgentCallStore.run` | `src/workspace/activity/agent-call.store.ts:13` | `this.storage.run(recorders, operation)` |
| `AgentCallStore.current` | `src/workspace/activity/agent-call.store.ts:17` | `this.storage.getStore()` |
| `AgentCallContext.changes` | `src/sdk/agent-call.context.ts:40` | `this.recorders.changes.snapshot()` |
| `AgentCallContext.commandRuns` | `src/sdk/agent-call.context.ts:44` | `this.recorders.commands.snapshot()` |
| `AgentCallContext.readPaths` | `src/sdk/agent-call.context.ts:48` | `this.recorders.files.paths()` |
| `FileToolRegistry.definitions` | `src/workspace/tools/file-tool.registry.ts:56` | `Object.values(FILE_TOOL_DEFINITIONS)` — a static import dressed as an injected method |
| `CommitMessageBuilder.initial` | `src/execution/checkpoint/commit-message.builder.ts:18` | `CommitMessageBuilder.compose([INITIAL_COMMIT_SUBJECT], runId)` |
| `RunBudget.remaining` | `src/execution/budget/run-budget.ts:40` | `Math.max(NO_TOKENS, this.limit - this.spentTokens)` |
| `ReviewReportFormatter.rankOf` | `src/agents/reviewer/review-report.formatter.ts:128` | `SEVERITY_ORDER.indexOf(severity)` |

Classes that are one delegation step:

- **All 10 `*.tool.ts` files.** Each is 30–40 lines of which the only behaviour is
  `return await this.service.X(await this.validator.validate(input))` inside a try/catch:
  `write-file.tool.ts:29`, `read-file.tool.ts`, `edit-file.tool.ts`, `delete-file.tool.ts`,
  `list-files.tool.ts`, `git-diff.tool.ts`, `search-code.tool.ts`, `run-command.tool.ts`. One of
  them has no validator at all — `src/workspace/tools/git-status/` holds 4 files
  (`schema`, `service`, `tool`, `types`) — so the mandated three-layer shape is not even uniform
  across the nine tools.
- `SdkInvokerFactory` (`src/sdk/sdk-invoker.factory.ts`, 33 lines): 5 injected dependencies
  forwarded verbatim into `new SdkAgentInvoker(...)` at `:23-31`. It adds nothing but the
  `scope`/`options` arguments.
- `DatabaseCommand` (`src/cli/database.command.ts`, 14 lines): an abstract base whose only member
  is `ensureDatabase()` → `this.bootstrap.ensureReady()`. Five commands extend it.
- `AgentTargetParser` (`src/cli/agent-target.parser.ts`, 8 lines): one static method whose body is
  `AGENT_TARGETS[value.trim().toLowerCase()] ?? null`.
- `EnvironmentFile` (`src/config/environment-file.ts`, 13 lines): wraps `process.loadEnvFile` in a
  try/catch.
- `JsonValue.object` (`src/db/json.value.ts:25-27`): `return value === null ? null : value;` — an
  identity function.

### C.3 Types, enums and constants used in exactly one place

Measured across all 821 exported symbols in `src/`:

| bucket | count | share |
|---|---|---|
| exported symbols total | 821 | — |
| used by **0** other file | 35 | 4.3% |
| used by **exactly 1** other file | **457** | **55.7%** |
| — of those, constants in `*.constants.ts` | **332** | 40.4% of all exports |
| — of those, declarations in `*.types.ts` / `*.enum.ts` | 61 | 7.4% |
| — of those, classes / renderers / mappers | 64 | 7.8% |

So **40% of every exported symbol in this codebase is a constant that exactly one other file
reads.** Representative examples:

- `src/sdk/sdk.messages.ts` is a **one-line file**: `export const MODELS_LABEL = 'models:';`, read
  only by `src/sdk/sdk.bootstrap.ts:26`.
- `src/cli/cli.constants.ts:21-24` — `AGENTS_TABLE_NAME_HEADER`, `AGENTS_TABLE_ROLE_HEADER`,
  `AGENTS_TABLE_COLUMN_GAP`, `AGENTS_TABLE_RULE_CHARACTER` — all four read only by
  `src/cli/agents.command.ts`; two of them are aliases of other constants in the same file.
- `src/workspace/approval/approval.constants.ts` is a one-line file holding the DI token string
  `'APPROVAL_GATE'`.
- `src/agents/orchestrator/decide/rework-brief.constants.ts` (4 lines),
  `src/agents/orchestrator/brief/brief-input.constants.ts` (12),
  `src/agents/orchestrator/summarize/summary-input.constants.ts` (7),
  `src/agents/orchestrator/decide/decision-input.constants.ts` (6) — each read by exactly one
  renderer, and all four renderers are unreachable.

Single-use type declarations whose entire file exists to satisfy the "types live in `*.types.ts`"
rule:

- `src/config/env.types.ts` — **4 lines**, body is
  `export type ModelEnvironment = z.infer<typeof modelEnvironmentSchema>;`
- `src/agents/qa/qa-brief.types.ts` (4 lines), `src/agents/developer/developer-result.types.ts`
  (6), `src/agents/orchestrator/plan/run-plan.types.ts` (6),
  `src/agents/orchestrator/decide/step-decision.types.ts` (6),
  `src/agents/reviewer/review-result.types.ts` (12), `src/agents/qa/qa-result.types.ts` (14) — all
  the same shape: a file per `z.infer`.
- `src/cli/table.types.ts` (5 lines), `src/agents/context/input-section.types.ts` (6),
  `src/workspace/security/write-target.types.ts` (5),
  `src/workspace/commands/command-policy.types.ts` (6),
  `src/workspace/commands/test-summary.types.ts` (6),
  `src/db/repositories/project.repository.types.ts` (5),
  `src/agents/orchestrator/summarize/run-summary.types.ts` (7).

**97 of the 325 files (29.8%), totalling 1,635 lines, contain nothing but type or enum
declarations** (67 `*.types.ts` = 1,444 lines, 30 `*.enum.ts` = 191 lines). A further 40
`*.constants.ts` files hold 1,782 lines.

### C.4 Enums with one or two members

There are 30 `*.enum.ts` files. None has one member; four have two:

| enum | at | members | assessment |
|---|---|---|---|
| `WriteOutcome` | `src/workspace/tools/write-file/write-outcome.enum.ts` | `Created`, `Overwritten` | the clearest waste in the repo. `src/workspace/tools/write-file/write-file.service.ts:20` computes it from a boolean, then `:25` immediately converts it back to a boolean choice: `outcome === WriteOutcome.Created ? ChangeAction.Created : ChangeAction.Modified`. A whole file and enum to round-trip `existingTarget === null` |
| `FileSystemErrorCode` | `src/workspace/enums/file-system-error-code.enum.ts` | `ENOENT`, `ENOTDIR` | read only by `src/workspace/utils/error.inspector.ts` |
| `ReviewVerdict` | `src/agents/reviewer/review-verdict.enum.ts` | 2 | load-bearing: the verdict is computed by code, see F |
| `GitDiffMode` | `src/workspace/tools/git-diff/git-diff-mode.enum.ts` | 2 | part of a tool's public parameter surface; fine |

### C.5 Wrapper classes around a single standard-library or third-party call

| class | file | lines | what it wraps |
|---|---|---|---|
| `EnvironmentFile` | `src/config/environment-file.ts` | 13 | `process.loadEnvFile` + try/catch |
| `AgentCallStore` | `src/workspace/activity/agent-call.store.ts` | 19 | `AsyncLocalStorage.run` / `.getStore()` |
| `DateFormatter` | `src/cli/date.formatter.ts` | 10 | `date.toISOString().slice(0,16).replace('T',' ')` |
| `MoneyFormatter` | `src/cli/money.formatter.ts` | 16 | `value.toFixed(n)` with a `$` |
| `JsonValue` | `src/db/json.value.ts` | 28 | `as Prisma.InputJsonValue` casts; `.object()` is the identity function |
| `WorkspacePathResolver` | `src/cli/workspace-path.resolver.ts` | 9 | `isAbsolute` + `resolve`; **its only caller is the `run` stub** (`src/cli/run.command.ts:28`) |
| `AgentTargetParser` | `src/cli/agent-target.parser.ts` | 8 | one record lookup |
| `ActivityClock` | `src/workspace/activity/activity-clock.ts` | 12 | an incrementing integer |
| `UsageTally` | `src/sdk/usage.tally.ts` | 28 | four `+=` and a snapshot. It exists to sum *retry* attempts (`:5-6`), and `SDK_RETRY_ATTEMPTS = 0` (`src/sdk/sdk.constants.ts:8`), so it is always called exactly once per call |
| `ByteSizeFormatter` | `src/workspace/utils/byte-size.formatter.ts` | 15 | `toFixed` + a unit suffix; read only by `workspace.messages.ts` |
| `CompactNumberFormatter` | `src/agents/utils/compact-number.formatter.ts` | 19 | `toFixed` + `k`/`M` |
| `DurationFormatter` | `src/agents/utils/duration.formatter.ts` | 19 | division + `toFixed` |

The three formatter classes in C.5's last rows are each used in several places and are fine as
helpers; the issue is that CLAUDE.md's "logic lives in classes" rule turns every two-line helper
into a class in its own file (see section G).

### C.6 Abstractions built for a future need not in the current task files

Each of these is referenced only from code that cannot run:

| abstraction | files / lines | future caller |
|---|---|---|
| `PlanRepository` + `AttemptRepository` ports, `persistence.types.ts`, the two in-memory impls | 5 files, 236 lines | `PlanExecutor`, dead |
| `src/execution/report/*` (`RunReportBuilder`, `RunReportFormatter`, types, constants) | 4 files, 443 lines | `PlanExecutor`, dead |
| `src/execution/checkpoint/*` (`StepCheckpoint`, `CommitMessageBuilder`, constants) | 3 files, 192 lines | `PlanExecutor`, dead |
| `DecisionGuard` + `decision.messages.ts` + `decision-input.*` | 5 files, 198 lines | `StepRunner`, dead |
| `src/agents/orchestrator/brief/*` and `src/agents/orchestrator/summarize/*` | 7 files, 164 lines | `StepRunner` / `PlanExecutor`, dead |
| `UserPrompter` port | 1 file, 5 lines | `PlanExecutor`, dead |
| `AttemptCarry`, `AttemptState`, `RunState`, `RunSignalListener`, `RunRefusedError`, `AgentFailurePolicy` | 6 files, 235 lines | `PlanExecutor`/`StepRunner`, dead |
| the write half of `GitService` — `init`, `createBranch`, `stageAll`, `stagePath`, `hasStagedChanges`, `commit`, `headCommit`, `identity` (8 of its 20 methods) | within `git.service.ts` | **called only from `src/execution/checkpoint/step-checkpoint.ts`**, which is dead |
| `WorkspaceService.setRunBaseRef` / `runBaseRef` (`src/workspace/workspace.service.ts:35-41`) | — | written only by `step-checkpoint.ts:58,63` (dead), so `runBaseRef` is permanently `null` and `src/workspace/tools/git-diff/git-diff.validator.ts:49` always takes its `?? GIT_DEFAULT_BASE_REF` branch |
| 11 of the 15 `AgentEventKind` members | `src/events/agent-event-kind.enum.ts` | emitted only from `plan-executor.ts`, `step-runner.ts` and `agent-call.runner.ts`; `src/cli/event-printer.ts:25-48` handles only `AgentStarted`, `ToolCalled`, `TokensUsed`, `AgentFinished` and returns `null` for everything else |
| `AgentCallOrigin.stepIndex` / `.attempt` | `src/events/agent-event.types.ts:12-13` | `src/sdk/call-event.emitter.ts:23-24` hardcodes both to `null` on every live event |
| `CallScope.attemptId` | `src/sdk/call-scope.types.ts:8` | `src/cli/agent.command.ts:113` passes `{ runId: run.id }` only, so `src/sdk/sdk-agent-invoker.ts:215` always records `null` |
| `SDK_RETRY_ATTEMPTS = 0` and the whole retry loop | `src/sdk/sdk-agent-invoker.ts:151-168`, constants at `src/sdk/sdk.constants.ts:8-11` | the loop's `await SdkAgentInvoker.wait(attempt)` (`:166`) is unreachable: `attempt` starts at 1 and `attempt > 0` is true on the first failure, so it always rethrows. `RETRY_BACKOFF_FACTOR`, `SDK_RETRY_BASE_DELAY_MS`, `SDK_RETRY_MAX_DELAY_MS` and `SdkAgentInvoker.wait` are all dead as configured |

---
## D. Dead and unreachable code

### D.1 Whole files unreachable from `src/main.ts`

30 files, 2,376 lines. Neither `npm run lint` nor `npm run build` flags any of them
(`@typescript-eslint/no-unused-vars` at `eslint.config.mjs:46-49` only looks inside a file).

| file | lines |
|---|---|
| `src/execution/plan-executor.ts` | 554 |
| `src/execution/step-runner.ts` | 453 |
| `src/execution/report/run-report.formatter.ts` | 217 |
| `src/execution/report/run-report.builder.ts` | 131 |
| `src/execution/checkpoint/step-checkpoint.ts` | 131 |
| `src/execution/persistence/in-memory-plan.repository.ts` | 101 |
| `src/execution/run-state.ts` | 75 |
| `src/agents/orchestrator/decide/decision.guard.ts` | 78 |
| `src/execution/report/run-report.types.ts` | 66 |
| `src/agents/orchestrator/summarize/summary-input.renderer.ts` | 61 |
| `src/agents/orchestrator/decide/decision-input.renderer.ts` | 57 |
| `src/execution/checkpoint/commit-message.builder.ts` | 56 |
| `src/execution/attempt-state.ts` | 50 |
| `src/execution/attempt-carry.ts` | 36 |
| `src/agents/orchestrator/decide/decision.messages.ts` | 34 |
| `src/execution/report/run-report.constants.ts` | 33 |
| `src/execution/agents/agent-failure.policy.ts` | 33 |
| `src/execution/run-signal.listener.ts` | 33 |
| `src/agents/orchestrator/brief/brief-input.renderer.ts` | 30 |
| `src/execution/persistence/in-memory-attempt.repository.ts` | 29 |
| `src/agents/orchestrator/decide/decision-input.types.ts` | 23 |
| `src/agents/orchestrator/summarize/summary-input.types.ts` | 18 |
| `src/execution/persistence/plan-repository.port.types.ts` | 18 |
| `src/agents/orchestrator/brief/brief-input.constants.ts` | 12 |
| `src/agents/orchestrator/brief/brief-input.types.ts` | 10 |
| `src/execution/run-refused.error.ts` | 9 |
| `src/execution/checkpoint/commit-message.constants.ts` | 8 |
| `src/agents/orchestrator/summarize/run-summary.types.ts` | 7 |
| `src/agents/orchestrator/summarize/summary-input.constants.ts` | 7 |
| `src/agents/orchestrator/decide/decision-input.constants.ts` | 6 |

### D.2 Classes registered in a module but never called

These *are* constructed at boot (they sit in `providers`) but no code calls a method on them:

- `PlanRepository` (`src/db/db.module.ts:22`, class at `src/db/repositories/plan.repository.ts`,
  87 lines). `grep -rln "repositories/plan.repository'" src/` → only `src/db/db.module.ts`.
  Its companions `plan.repository.types.ts` (29) and `plan-step.mapper.ts` (24) are reachable only
  through it. **140 lines.**
- `AttemptRepository` (`src/db/db.module.ts:23`, `attempt.repository.ts` 78 lines, plus
  `attempt.repository.types.ts` 37 and `attempt.mapper.ts` 29). Same: imported only by
  `db.module.ts`. **144 lines.**

### D.3 Exports nobody imports

35 exported symbols are referenced by no other file:

| symbol | file |
|---|---|
| `WriteFileInput` | `src/workspace/tools/write-file/write-file.types.ts:5` |
| `ReadFileInput` | `src/workspace/tools/read-file/read-file.types.ts` |
| `EditFileInput` | `src/workspace/tools/edit-file/edit-file.types.ts` |
| `DeleteFileInput` | `src/workspace/tools/delete-file/delete-file.types.ts` |
| `ListFilesInput` | `src/workspace/tools/list-files/list-files.types.ts` |
| `GitDiffInput` | `src/workspace/tools/git-diff/git-diff.types.ts` |
| `GitStatusInput` | `src/workspace/tools/git-status/git-status.types.ts` |
| `SearchCodeInput` | `src/workspace/tools/search-code/search-code.types.ts` |
| `RunCommandInput` | `src/workspace/tools/run-command/run-command.types.ts` |
| `RunEventBase`, `PlanRequestedEvent`, `PlanCreatedEvent`, `PlanQuestionsEvent`, `StepStartedEvent`, `AttemptStartedEvent`, `DecisionMadeEvent`, `DecisionOverriddenEvent`, `StepAcceptedEvent`, `StepFailedEvent`, `BudgetUpdatedEvent`, `RunFinishedEvent`, `AgentStartedEvent`, `ToolCalledEvent`, `TokensUsedEvent`, `AgentFinishedEvent` (16 interfaces) | `src/events/agent-event.types.ts:16-123` — each is reachable only as a member of the `AgentEvent` union at `:125-140`, so the names themselves are never imported |
| `InMemoryPlanRepository` | `src/execution/persistence/in-memory-plan.repository.ts:21` |
| `InMemoryAttemptRepository` | `src/execution/persistence/in-memory-attempt.repository.ts:7` |
| `ReviewScores` | `src/agents/reviewer/review-result.types.ts` |
| `ENV_EXAMPLE_NAME`, `INVALID_API_KEY_SHAPE_MESSAGE` | `src/config/env.constants.ts:5,19` — `INVALID_API_KEY_SHAPE_MESSAGE` is a complete 3-line message that nothing ever prints |
| `STEP_STATUS_TO_DB`, `DEFAULT_RECENT_RUNS` | `src/db/db.constants.ts` |
| `STOPPED_LABEL`, `NOT_RUN` | `src/execution/report/run-report.constants.ts` |
| `QA_WRITE_DENIED_MESSAGE` | `src/workspace/security/role-write-rules.constants.ts:16` — read in the same file at `:25`, so the export is pointless |

The nine `*Input` types are the cleanest case: every tool folder has a
`export type XInput = z.infer<typeof xSchema>;` line that no file anywhere imports. Nine
declarations whose only reason to exist is that the folder shape calls for a `*.types.ts`.

### D.4 Branches that cannot be reached

| branch | why it cannot be taken |
|---|---|
| `src/sdk/sdk-agent-invoker.ts:166` → `await SdkAgentInvoker.wait(attempt)` | the loop starts at `FIRST_ATTEMPT = 1` (`:34`) and the guard at `:163` is `attempt > SDK_RETRY_ATTEMPTS`, with `SDK_RETRY_ATTEMPTS = 0` (`src/sdk/sdk.constants.ts:8`). `1 > 0` is true on the first failure, so it always rethrows. `wait()`, `RETRY_BACKOFF_FACTOR`, `SDK_RETRY_BASE_DELAY_MS`, `SDK_RETRY_MAX_DELAY_MS` and `isTransient` are all unreachable as configured |
| `src/sdk/sdk-agent-invoker.ts:179-183` (the non-streaming path) | only taken when `options.streaming === false`. The one live caller passes `options.stream` from the `--no-stream` flag (`src/cli/agent.command.ts:114`), so it *is* reachable — **not dead**, listed here only to note that `UsageReader.read(result)` at `:181` and `UsageReader.read(stream)` at `:197` are two different shapes going through one function |
| `src/sdk/agent-tool.adapter.ts:29` → `emitter?.toolCalled(...)` | `emitter` is `null` whenever streaming is on, which is the default (`src/sdk/sdk-agent-invoker.ts:86`, `src/sdk/sdk.constants.ts:4`) |
| `src/workspace/tools/git-diff/git-diff.validator.ts:49` → the left side of `this.workspace.runBaseRef ?? GIT_DEFAULT_BASE_REF` | `setRunBaseRef` is called only from `src/execution/checkpoint/step-checkpoint.ts:58,63`, which is unreachable, so `runBaseRef` is always `null` |
| `src/workspace/tools/file-tool.registry.ts:76` → the `RoleScopedWriteTool` wrapping | taken only for QA, the single role in `ROLE_WRITE_RULES` (`src/workspace/security/role-write-rules.constants.ts:21-27`). Reachable via `team agent qa …`; the `ROLE_WRITE_RULES` indirection buys nothing while there is one entry |
| `src/cli/event-printer.ts:48` → `return null` | reached for 11 of the 15 `AgentEventKind` members, all of which are emitted only by dead code, so in practice this line is only hit if a new event kind is added |

### D.5 Methods never called

- `AgentDefinitionRenderer.toolDescription` (`src/agents/agent-definition.renderer.ts:33-35`).
- `FileToolRegistry.all()` (`src/workspace/tools/file-tool.registry.ts:52-54`) — the only
  `.all()` calls in the repo are `this.prices.all()` (`src/cli/prices.command.ts:38`) and
  `ledger.all()` (`src/execution/report/run-report.builder.ts:82`, dead).
- `ErrorInspector.isErrnoException` and `ErrorInspector.hasCode`
  (`src/workspace/utils/error.inspector.ts:4,8`) — exported, but called only from inside
  `ErrorInspector` itself.
- `InMemoryAttemptRepository.agentCallsOf` (`src/execution/persistence/in-memory-attempt.repository.ts:25`)
  — a method on a dead class, and not even part of the port it implements.
- `GitService.init`, `createBranch`, `stageAll`, `stagePath`, `hasStagedChanges`, `commit`,
  `headCommit`, `identity` — 8 of 20 methods, called only from the dead
  `src/execution/checkpoint/step-checkpoint.ts`.

### D.6 Constants never read and parameters never used

- Constants never read, in full: `ENV_EXAMPLE_NAME` and `INVALID_API_KEY_SHAPE_MESSAGE`
  (`src/config/env.constants.ts:5,19`), `STEP_STATUS_TO_DB` and `DEFAULT_RECENT_RUNS`
  (`src/db/db.constants.ts`), `STOPPED_LABEL` and `NOT_RUN`
  (`src/execution/report/run-report.constants.ts`). Six constants.
- Parameters never used: `@typescript-eslint/no-unused-vars` is `error`
  (`eslint.config.mjs:46-49`) and lint passes, so there are **no** syntactically unused
  parameters. There are, however, parameters that are always passed the same value:
  - `RoleWritePolicy.check(role, …)` (`src/workspace/security/role-write.policy.ts:10`) — `role`
    only ever matters for `AgentRole.Qa`.
  - `AgentInputBuilder.renderFor` (`src/cli/agent-input.builder.ts:56-93`) fills **13 packet
    fields with empty values**: `completedSteps: []`, `reworkBrief: null`, `systemNote: null`,
    `changedCode: []`, `developerNotes: null`, `brief: null`, `previousDefects: []`,
    `qaFacts: null`, `previousIssues: []`, and `attempt`/`maxAttempts` both `SINGLE_ATTEMPT`.
    On the only reachable path, the three large input packets render as step + criteria and
    nothing else.
  - `CallEventEmitter` hardcodes `stepIndex: null, attempt: null`
    (`src/sdk/call-event.emitter.ts:23-24`).
  - `UsageTally` sums across retries that cannot happen (C.5).

---
## E. What each abstraction buys

One paragraph per directory under `src/`. Counts are files/lines in that directory only, not its
subdirectories.

**`src/` (2 files, 19 lines)** — `main.ts` and `app.module.ts`. `main.ts` is 10 lines:
load `.env`, `CommandFactory.run`. `app.module.ts` is a 10-line module that imports four others.
Merging `app.module.ts` into `main.ts` would break nothing functionally, but Nest needs a root
module class, so this is the minimum ceremony the framework demands. **Keep.**

**`src/agents` (9 files, 360 lines)** — the role enum, the `AgentDefinition` shape, the 229-line
`AGENT_DEFINITIONS` data, the 47-line renderer, per-role model config, and the duplicate
`TEAM_AGENTS` list. Merging the renderer into `agent.factory.ts` would break nothing: it has one
caller (`src/sdk/agent.factory.ts:31`) and one of its two public methods is never called.
Merging `agents.constants.ts` (`TEAM_AGENTS`) into `agents.command.ts` would also break nothing
and would remove a second source of truth about who the agents are. The 229-line definitions
constant is genuinely useful as a single place to read and diff all three prompts. **Merge the
renderer; keep the definitions.**

**`src/agents/common` (2 files, 17 lines)** — `issue-category.enum.ts` (9 members) and
`issue-severity.enum.ts` (4). Both are shared by QA and the Reviewer and by `BLOCKING_SEVERITIES`.
Nothing would be gained by moving them. **Keep.**

**`src/agents/context` (14 files, 544 lines)** — the input packets and their renderers for
Developer/QA/Reviewer, plus `InputSectionRenderer` holding the shared sections. What it buys:
code, not the model, decides what each agent is told. What it costs: on the only reachable path
(`src/cli/agent-input.builder.ts:56-93`) 13 of the packet fields are filled with `[]` or `null`,
so the renderers currently emit step + criteria. The "shared" layer also leaks:
`input-section.renderer.ts:5-13` imports its constants from `qa-input.constants.ts`, i.e. the
generic renderer depends on one specific agent's constants file. Merging each `*-input.renderer.ts`
into its single caller would break nothing today, because each has exactly one caller. **Keep the
concept, collapse the file count** — this folder is sized for the pipeline, not for what runs.

**`src/agents/developer` (7 files, 239 lines)** — result schema, result types, report types, a
68-line builder and an 84-line formatter. The builder/formatter split is what lets
`src/cli/agent-report.printer.ts:39` print a report assembled from recorded facts rather than from
model prose, which is the stated design and is actually exercised. `developer.constants.ts` is
**4 lines** holding `DEVELOPER_MAX_TURNS` and should be a field in the definition it feeds
(`src/agents/agent-definitions.constants.ts:66`). **Keep, minus the 4-line constants file.**

**`src/agents/orchestrator` (5 files, 282 lines)** — `ORCHESTRATOR_TASKS` (182 lines of task
definitions) and `OrchestratorTaskRenderer` (57 lines). The renderer is a near-exact copy of
`src/agents/agent-definition.renderer.ts`: `diff` between the two shows the same `instructions`/
`bulleted`/`section` algorithm with `workflow`→`steps` renamed and the string headers moved into
constants. Only `Plan` is reachable today (`src/cli/agent-command.constants.ts` is the only live
target table). Merging the two renderers into one that takes a header set would remove a file and
~50 duplicated lines and break nothing. **Merge the two renderers.**

**`src/agents/orchestrator/brief` (3 files, 49 lines)** — input constants, types and renderer for
the Brief task. **All three are unreachable.** Nothing would break if the folder were deleted;
nothing breaks if it is merged either. Honest answer: **nothing would break.**

**`src/agents/orchestrator/decide` (12 files, 373 lines)** — the step-decision schema and enum
(reachable via `AgentOutputRegistry.forTask`), `ReworkBriefBuilder` (reachable, used by
`developer-input.renderer.ts:48`), and `DecisionGuard` + `decision.messages.ts` +
`decision-input.*` (5 files, 198 lines, **unreachable**). `DecisionGuard` is the class CLAUDE.md
describes as the thing that overrides model decisions on recorded facts; it has one importer,
`step-runner.ts`, which is dead. **Keep the schema and the brief builder; the guard is currently
unreachable.**

**`src/agents/orchestrator/plan` (6 files, 211 lines)** — plan schema, types, input renderer and a
78-line terminal formatter. Fully reachable: `team agent orchestrator:plan <task>` runs through
`agent-input.builder.ts:30` and prints via `plan.formatter.ts`. **Keep.**

**`src/agents/orchestrator/summarize` (5 files, 115 lines)** — `run-summary.schema.ts` is
referenced by `AgentOutputRegistry` (`src/sdk/agent-output.registry.ts:9`) and so is reachable;
the other four files (`summary-input.renderer.ts` 61, `summary-input.types.ts` 18,
`summary-input.constants.ts` 7, `run-summary.types.ts` 7) are unreachable. **Nothing would break**
if those four were removed.

**`src/agents/qa` (15 files, 950 lines)** — the largest agent folder. It contains real logic that
nothing else does: `TestScopeChecker` (99 lines) decides whether the tests the model wrote
actually import the changed code, `SuspiciousTestChangeDetector` flags weakened assertions,
`AddedLinesReader` parses the diff, `ChangedFileClassifier` separates test from source files, and
the 253-line `QaReportBuilder` combines those with `CommandRunRecorder` facts to compute pass/fail
independently of what the model claimed. This is the part of the codebase where the "facts are
computed by code, never reported by the model" rule has real teeth. Merging it into its caller
would mean inlining 950 lines into `agent-report.printer.ts`. **Keep.**

**`src/agents/reviewer` (12 files, 682 lines)** — the checklist constants, the result schema, and
`ReviewReportBuilder` (217 lines) which computes the verdict from reported severities and unmet
acceptance criteria (`BLOCKING_SEVERITIES`) and detects changed files the reviewer never read
(`review-report.builder.ts:36`). Same verdict as QA: this is load-bearing logic, not plumbing.
`checklist-status.enum.ts` (3 members) and `review-dimension.enum.ts` (4) are only read by the
builder and formatter, so three of the twelve files could fold inward, but nothing breaks either
way. **Keep.**

**`src/agents/utils` (2 files, 38 lines)** — `DurationFormatter` and `CompactNumberFormatter`, each
one class wrapping `toFixed`. Both have several callers across `agents/` and `cli/`, so they do
deduplicate. Merging them into a single `formatters.ts` would remove one file and break nothing.
**Keep (or merge the two files into one).**

**`src/cli` (32 files, 1,605 lines)** — nine commands, six formatters, a table renderer, and 11
constants/types files. This is where the product actually lives. Concrete problems rather than
layering: `run.command.ts` is a stub (49 lines, prints "not implemented"); `agents.command.ts`
re-implements table rendering that `table.renderer.ts` already does; `workspace-path.resolver.ts`
exists only for the stub. The command/formatter split is justified — `usage.command.ts` (168) is
query logic and `usage.formatter.ts` (101) is layout, and the formatters are what make `usage`,
`history` and `prices` print consistently. **Keep, minus `run.command.ts` + `workspace-path.resolver.ts`
until `run` is implemented; fix `agents.command.ts` to use `TableRenderer`.**

**`src/config` (6 files, 94 lines)** — six files to read one env var and four optional model
overrides. `env.types.ts` is 4 lines (one `z.infer`), `configuration.error.ts` is 8 (an `Error`
subclass), `environment-file.ts` is 13 (one try/catch), `env.schema.ts` is 10. The one real piece
of behaviour is `EnvironmentReader.present()` (`:21-29`), which treats an empty variable as
absent so `OPENAI_API_KEY=` gives the same message as a missing key. Collapsing the folder to two
files (`environment.reader.ts` + `configuration.error.ts`) would break nothing. The split into six
exists because of the `*.types.ts`/`*.enum.ts`/`*.constants.ts`/`*.schema.ts` rule.
**Merge four of the six.**

**`src/db` (8 files, 320 lines)** — `PrismaService`, `MigrationRunner`, `DatabaseBootstrap`,
`JsonValue`, the module and three data files. `DatabaseBootstrap` + `MigrationRunner` buy something
real: every DB-touching command applies migrations and proves the connection before doing anything
(`src/cli/database.command.ts:11-13`). `json.value.ts` is 28 lines of casts of which `.object()`
is the identity function. **Keep the bootstrap; fold `json.value.ts` into the repositories.**

**`src/db/prices` (4 files, 97 lines)** — `CostCalculator` (26 lines), the seeder, the price types
and default constants. The money-as-`Decimal` discipline is real and is the rule CLAUDE.md
singles out; `CostCalculator` is applied at `src/db/repositories/agent-call.repository.ts:45`.
**Keep.**

**`src/db/repositories` (14 files, 944 lines)** — six repositories, their types files, two mappers
and `GuardedRepository`. `GuardedRepository` (30 lines) buys the stated guarantee that a failed
write becomes a logged warning instead of losing agent work, and it is used by four repositories.
`agent-call.repository.ts` (241 lines) is the accounting core and is live. But `PlanRepository` +
`AttemptRepository` + their 2 types files + 2 mappers (**6 files, 284 lines**) are never called by
anything (D.2). **Keep four repositories; two are currently dead weight.**

**`src/events` (4 files, 200 lines)** — `EventBus` (28 lines), 15 event kinds, 16 event interfaces,
and the module. What it buys *today*: `src/cli/agent.command.ts:70-77` subscribes an `EventPrinter`
for the duration of one agent call, and `src/sdk/call-event.emitter.ts` emits 4 kinds into it.
That is one producer and one consumer — a direct call would do. The other 11 kinds and their 11
interfaces exist for the dead executor. The `@Global()` module (`events.module.ts:7`) promises
"the terminal and the database logger subscribe"; there is no database logger. If `events/` were
merged into `sdk/call-event.emitter.ts` + `cli/event-printer.ts`, **nothing would break** at
present — the bus would stop being decoupled, which matters only once the executor exists.

**`src/execution` (14 files, 1,573 lines)** — the run orchestration. 7 of 14 files (1,135 of 1,573
lines, including the two largest files in the repo) are unreachable. The reachable remainder is
`workspace.surveyor.ts` (27), `run-id.formatter.ts` (27), `run-status.enum.ts`,
`step-status.enum.ts`, `execution.constants.ts`, `execution.messages.ts`, `execution.types.ts` —
mostly feeding `cli/`. This folder is the single biggest concentration of code written for a
caller that does not exist.

**`src/execution/agents` (7 files, 362 lines)** — the `AgentInvoker` port, `AgentInvocationError`,
`AgentFailureKind`, `AgentCallLedger`, `AgentCallRunner` (189) and `AgentFailurePolicy` (33,
unreachable). The error type and failure enum are live and good: `src/cli/agent.command.ts:160-164`
turns a provider failure into one readable line instead of a stack trace. The port is a
one-implementation interface whose only typed consumer is dead (C.1). `AgentCallRunner` and
`AgentCallLedger` are reachable only from `plan-executor.ts`. **Keep the error + enum; the port
buys nothing until a second invoker or a test exists.**

**`src/execution/budget` (2 files, 62 lines)** — `RunBudget` + `BudgetExhaustedError`, used only by
`plan-executor.ts` and `agent-call.runner.ts`. Unreachable in practice. **Nothing would break.**

**`src/execution/checkpoint` (3 files, 192 lines)** — `StepCheckpoint` (131) is the only caller of
8 `GitService` write methods, and it is unreachable. **Nothing would break**, and removing it would
make 8 `GitService` methods dead too.

**`src/execution/interaction` (2 files, 36 lines)** — `UserPrompter` port (5 lines) +
`ConsoleUserPrompter` (31). The port has one implementation and its only typed consumer is dead;
the live caller uses the class directly (`src/cli/runs-prune.command.ts:93`). Deleting the port
and moving the class to `cli/` would break nothing.

**`src/execution/persistence` (5 files, 236 lines)** — two ports and two in-memory implementations
nothing constructs, plus `persistence.types.ts`. The ports' comment claims a PostgreSQL
implementation that does not implement them (C.1). **Nothing would break.**

**`src/execution/report` (4 files, 443 lines)** — builder + formatter + types + constants for the
final run report. All four unreachable. **Nothing would break.**

**`src/sdk` (18 files, 995 lines)** — the only place that imports `@openai/agents`, verified:
`grep -rln "@openai/agents" src/` returns 9 files — `agent-tool.adapter.ts`, `agent.factory.ts`,
`sdk-agent-invoker.ts`, `sdk-error.mapper.ts`, `sdk.bootstrap.ts`, `sdk.constants.ts`,
`sdk.module.ts`, `stream-event.mapper.ts`, `built-agent.types.ts` — all inside `src/sdk`. This
boundary is real and worth having: `AgentToolAdapter` is the only thing that knows the SDK's tool
shape, `SdkErrorMapper` (102 lines) is the only thing that knows its error shapes, and
`UsageReader` (83) the only thing that knows its usage shapes. If `sdk/` were merged into its
caller, every change to the vendor's API would touch `cli/` and `agents/`. The waste inside it is
small and specific: `sdk.messages.ts` (1 line), the dead retry machinery, and the two
`orchestratorRole()` hops. **Keep — this is the one boundary that pays for itself.**

**`src/workspace` (5 files, 724 lines)** — `WorkspaceService` (90) is the containment root for
every path the model touches; `workspace.messages.ts` (401) holds every string a tool can return
to the model. The messages file is large but it is the thing that makes the "`Error: ` + what to
do next" contract auditable in one place; splitting it per tool would make that contract
unreviewable. `workspace-root.resolver.ts` (43) parses `-w/--workspace` out of `process.argv`
before Nest builds providers — ugly, but necessary given the provider is a `useFactory`
(`workspace.module.ts:40`) and commands have not run yet. **Keep.**

**`src/workspace/activity` (7 files, 119 lines)** — `AgentCallStore` (AsyncLocalStorage),
`ActivityClock`, `ChangeTracker`, `FileAccessRecorder` and three declaration files. The store is
the mechanism that lets singleton tool services record into per-call state; without it, every
tool service would need the call's recorders threaded through its method signatures. `ChangeTracker`
has real logic (create-then-delete cancels out, `change-tracker.ts:33-39`). `ActivityClock` is 12
lines for an incrementing integer, shared so that command runs and file changes sort on one
timeline — used by `test-scope.checker.ts` freshness checks. **Keep.**

**`src/workspace/approval` (3 files, 24 lines)** — token, interface, and an implementation that
logs and returns `true`. Marked `// TEMPORARY` in the source. Three files for one `return true`.
**Nothing would break** if it were a single file, or a single line in `run-command.service.ts`,
until the interactive gate is written.

**`src/workspace/commands` (16 files, 747 lines)** — `CommandPolicy` (273 lines) is an allowlist
over argv tokens, `CommandTokenizer` (90) is a shell-free tokenizer, `ChildEnvironmentBuilder`
strips secrets from the child env, `OutputCollector`/`OutputTruncator` cap output, `CommandLock`
serialises runs, and `TestRunClassifier`/`TestSummaryParser` turn a command run into facts QA can
be judged against. This is the security surface for `run_command` and it is all live. **Keep.**

**`src/workspace/enums` (3 files, 22 lines)** — `FileToolName` (9 members, the key of
`FILE_TOOL_DEFINITIONS`, widely used), `FileSystemErrorCode` (2 members, read by one file),
`GitErrorReason` (5 members, read by `git.error.ts`). A folder holding three enums exists only
because enums must live in `*.enum.ts`; two of the three would be better placed next to their
single reader. **Merge two.**

**`src/workspace/errors` (2 files, 79 lines)** — `GitError` (with static factories per reason) and
`ToolValidationError`. Both are the mechanism by which validators signal "return this text to the
model" rather than crashing. **Keep.**

**`src/workspace/git` (6 files, 657 lines)** — `GitService` (517) is the only place that spawns
git, with an argument array, no shell, user paths after `--`, and refs validated first. Verified:
`grep -rln "child_process" src/` returns exactly three files — `git.service.ts`,
`run-command/run-command.service.ts` (the agent's own commands, gated by `CommandPolicy`) and
`db/migration.runner.ts` (prisma) — and no other file spawns git. That
containment is the point of the folder and is load-bearing. 8 of its 20 methods are dead (D.5).
**Keep.**

**`src/workspace/io` (1 file, 30 lines)** — `AtomicFileWriter`. One file, one folder. It is used by
`write-file.service.ts` and `edit-file.service.ts`, and the temp-file-plus-rename is the thing that
stops a crashed write from truncating the user's source file. The *folder* buys nothing; the class
does. **Keep the class, drop the folder.**

**`src/workspace/security` (7 files, 228 lines)** — `PathPolicy` (105) and `RoleWritePolicy` (47)
plus 5 declaration/data files. `PathPolicy` is the deny list for `.git`/`.env`/directories/symlinks
and is called from six validators. `RoleWritePolicy` enforces QA-writes-tests-only in code rather
than in a prompt — the rule CLAUDE.md names explicitly — and is also reused by
`src/agents/qa/changed-file.classifier.ts:11` to classify files, which is a genuine second use.
`ROLE_WRITE_RULES` holding exactly one role is the only excess, together with
`RoleWriteRules.role` (`src/workspace/security/role-write-rules.constants.ts:23`), which
duplicates its own map key and is read nowhere — `grep -rn "\.role" src/workspace/security/`
returns no hits. **Keep.**

**`src/workspace/tools` (6 files, 569 lines)** — `FILE_TOOL_DEFINITIONS` (346 lines: every tool's
description, parameter hints, limits and refusals in one place), `ToolDefinitionRenderer`,
`FileToolRegistry`, `RoleScopedWriteTool`. The single definitions table is what makes
`team tools` possible without a model and keeps prompt text out of the `.tool.ts` files. **Keep.**

**`src/workspace/tools/<tool>` (9 folders, 49 files, 2,139 lines)** — the three-layer
tool/validator/service shape. What it buys: the validator does read-only filesystem checks and the
service trusts its input, so `write-file.service.ts` is 34 lines of actual work. What it costs: the
`*.tool.ts` file in each folder is pure delegation (C.2) and the `*.types.ts` file in each folder
contains a dead `XInput` type (D.3). Merging the `.tool.ts` into the `.service.ts` — i.e. letting
the service hold the `name`/`description`/`schema` fields and the try/catch — would remove 9 files
and 302 lines and break nothing, at the cost of mixing the never-throw boundary into the worker
class. **Merge the tool layer into the service layer; keep validator/service apart.**

**`src/workspace/utils` (3 files, 72 lines)** — `ErrorInspector` (referenced in 27 files),
`ByteSizeFormatter` (one caller), `TextContent` (three callers). `ErrorInspector` earns its place.
**Keep.**

---
## F. Verdict

Ranked by (files removed) / (risk of removal). Risk is a 1–5 judgement: 1 = the code cannot run
today, 5 = removing it loses a guarantee that is actually enforced.

### 1. The dead execution pipeline — 30 files, 2,376 lines, risk 1

**What it is:** `src/execution/plan-executor.ts` (554), `src/execution/step-runner.ts` (453),
`src/execution/report/*` (443), `src/execution/checkpoint/*` (192),
`src/execution/persistence/*` (236), `src/agents/orchestrator/{brief,summarize}/*` (164),
`src/agents/orchestrator/decide/{decision.guard,decision.messages,decision-input.*}` (198), plus
`attempt-carry.ts`, `attempt-state.ts`, `run-state.ts`, `run-signal.listener.ts`,
`run-refused.error.ts`, `agent-failure.policy.ts`.

**Evidence:** no import chain from `src/main.ts` reaches any of them (§D.1). `PlanExecutor` has
zero importers and appears in no `providers` array. Its four injected tokens
(`src/execution/plan-executor.ts:75-78`) are provided by no module, so Nest could not construct it
even if it were registered.

**Lines that would disappear:** 2,376 directly, plus cascade: 2 unused repositories and their
types/mappers (284 lines, §D.2), 8 `GitService` methods, `WorkspaceService.setRunBaseRef`/
`runBaseRef`, `src/execution/budget/*` (62), 11 of 15 `AgentEventKind` members and their 11
interfaces, `AgentCallRunner` + `AgentCallLedger` (227). Call it **~3,000 lines across ~40 files**.

**Cost of removal:** this is the design CLAUDE.md describes and it is clearly the intended next
feature. Deleting it throws away a substantial, coherent draft. Its real cost right now is that it
makes the codebase look twice as finished as it is and keeps `PlanRepository`/`AttemptRepository`
etc. from being noticed as dead.

**Recommendation: keep, but mark it.** Not "remove" — the honest problem is not that this code
exists, it is that nothing says it is not wired. One of: finish the `run` command, or move the
tree to a clearly-labelled branch/directory, or add a single comment at the top of
`plan-executor.ts` stating it has no caller and which four tokens are unprovided. Of the three,
providing the four tokens and registering `PlanExecutor` is the smallest change that turns 3,000
dead lines into live ones.

### 2. The nine `*.tool.ts` adapter files — 9 files, 302 lines, risk 2

**What it is:** one file per tool whose only behaviour is a try/catch around
`service.X(await validator.validate(input))`.

**Evidence:** `src/workspace/tools/write-file/write-file.tool.ts:27-33` is the whole class body;
the other eight are the same shape. CLAUDE.md mandates it: *"`*.tool.ts` — thin adapter: calls the
validator, then the service, and never throws."*

**Files/lines removed:** 9 files, 302 lines, if the `name`/`description`/`schema`/flags fields and
the try/catch move into the matching `*.service.ts`.

**Cost:** the never-throw boundary would sit in the same class as the work, so a future edit to a
service could leak an exception past it. That is a real cost but a small one — the catch is three
lines and `AgentToolAdapter` (`src/sdk/agent-tool.adapter.ts:32-34`) already catches anything that
escapes, so a leak degrades to `"Error: internal tool failure: …"` rather than to a lost run.

**Recommendation: merge** into the services. If the separation is kept, the nine files should at
least lose their dead `XInput` types.

### 3. 97 declaration-only files — 97 files, 1,635 lines, risk 2

**What it is:** 67 `*.types.ts` (1,444 lines) and 30 `*.enum.ts` (191 lines) that contain nothing
but `interface`/`type`/`enum` declarations. 102 of the 325 files in `src/` are ≤15 lines.

**Evidence:** `src/config/env.types.ts` is four lines holding one `z.infer`. Nine `*.types.ts`
files hold an `XInput` type nobody imports (§D.3). 61 of the symbols in these files are read by
exactly one other file (§C.3). The cause is `eslint.config.mjs:18-31`, which makes
`TSInterfaceDeclaration`, `TSTypeAliasDeclaration` and `TSEnumDeclaration` a lint **error**
anywhere outside `*.types.ts`/`*.enum.ts`/`*.constants.ts`.

**Files/lines removed:** moving each single-use declaration next to its single reader would remove
on the order of **60–70 files** and ~700 lines of import boilerplate, with no behaviour change.

**Cost:** the uniform rule means you always know where a type lives. That is worth something on a
large team. It costs a median file size of 30 lines and a 325-file tree for a 16,773-line program.

**Recommendation: relax the rule** to "a type that more than one file imports lives in
`*.types.ts`; a type with one reader lives next to it." Keep the rule for `*.enum.ts` if desired —
enums are only 191 lines.

### 4. 332 single-use constants — ~15 files fully removable, risk 1

**What it is:** 332 of the 821 exported symbols in `src/` (40.4%) are constants in a
`*.constants.ts` file that exactly one other file reads.

**Evidence:** `src/sdk/sdk.messages.ts` is one line (`MODELS_LABEL`);
`src/workspace/approval/approval.constants.ts` is one line (a DI token string);
`src/agents/developer/developer.constants.ts` is four lines; `src/cli/cli.constants.ts:23-24`
defines two constants as aliases of two other constants in the same file. 73 files declare a
numeric alias such as `const EMPTY = 0`, `const START = 0`, `const FIRST_ITEM = 1` — **and
`eslint.config.mjs` contains no `no-magic-numbers` rule** (`grep -c "no-magic-numbers"
eslint.config.mjs` → 0), so these were a self-imposed convention, not an enforced one.

**Files/lines removed:** ~15 one-to-four-line constants files, plus the 73 numeric aliases.

**Cost:** essentially none for the one-line files. For the named numeric constants, the cost of
removal is that `slice(0, n)` loses a word of documentation — which `slice` already documents.

**Recommendation: remove** the one-line constants files and the `EMPTY = 0` / `START = 0` aliases.
Keep the genuinely explanatory ones (`MAX_WRITE_CONTENT_BYTES`, `SDK_RETRY_ATTEMPTS`,
`FILE_MODE_MASK`).

### 5. Six single-implementation ports — 6 files, ~90 lines, risk 2

**What it is:** `AgentInvoker`, `PlanRepository`, `AttemptRepository`, `UserPrompter`,
`ApprovalGate`, `AgentEventListener`.

**Evidence:** §C.1. Four of the six have an implementation that no code constructs. The two
persistence ports' own comment claims a PostgreSQL implementation that does not implement them.
There are no tests, so there are no test doubles either.

**Files/lines removed:** 6 interface files plus 2 dead in-memory implementations ≈ 8 files,
220 lines.

**Cost:** `AgentInvoker` is the port CLAUDE.md names as what keeps the SDK out of core code. That
boundary is real and `src/sdk` does respect it (§E) — but the boundary is enforced today by
*nothing importing* `@openai/agents` outside `src/sdk`, not by the interface. Removing the
interface would not weaken it; adding a lint rule banning `@openai/agents` outside `src/sdk` would
strengthen it more than the interface does.

**Recommendation: remove `PlanRepository`, `AttemptRepository`, `UserPrompter` and the two
in-memory classes; merge `ApprovalGate` to one file; keep `AgentEventListener` (the `Set` in
`EventBus` needs a type); keep `AgentInvoker`** only if a second invoker or tests are actually
coming, and replace it with a lint rule otherwise.

### 6. `src/events` as a bus — 4 files, 200 lines, risk 2

**What it is:** an `@Global()` event bus with 15 event kinds and 16 event interfaces.

**Evidence:** one producer (`src/sdk/call-event.emitter.ts`, 4 kinds) and one consumer
(`src/cli/event-printer.ts`, the same 4 kinds) on the live path. `subscribe` is called exactly
once, at `src/cli/agent.command.ts:71`. The comments at `src/events/event-bus.ts:4-6` and
`src/events/events.module.ts:5-6` both describe a database logger that does not exist.

**Files/lines removed:** 4 files, 200 lines, if `EventPrinter` were passed to the emitter directly.

**Cost:** the decoupling is genuinely needed once the executor emits from a dozen places and a TUI
and a DB logger both listen. Today it is a `Set` with one member.

**Recommendation: keep the bus, delete the 11 unused event interfaces.** The bus is 28 lines; the
waste is the 11 interfaces and 11 enum members for events nothing emits or handles.

### 7. The duplicated prompt renderer — 1 file, ~50 lines, risk 1

**What it is:** `src/agents/orchestrator/orchestrator-task.renderer.ts` (57 lines) is
`src/agents/agent-definition.renderer.ts` (47 lines) with `workflow` renamed to `steps` and the
header strings hoisted into constants. `diff` of the two files shows identical `instructions` /
`bulleted` / `section` structure.

**Recommendation: merge** into one renderer taking a header set. Removes 1 file and ~50 duplicated
lines; risk is confined to prompt text, which `SdkAgentInvoker.hashOf` makes visible if it drifts.

### 8. `WriteOutcome`, `src/workspace/io/`, and other one-item folders — ~4 files, risk 1

`src/workspace/tools/write-file/write-outcome.enum.ts` exists so that
`write-file.service.ts:20` can convert a boolean to an enum and `:25` can convert it back.
`src/workspace/io/` is a directory holding one 30-line file.
`src/workspace/enums/` is a directory holding three enums, two of which have one reader each.
`src/cli/table.types.ts` is a 5-line file for one interface used by one class in the same folder.
**Recommendation: remove the enum, flatten the folders.**

### 9. `run.command.ts` + `workspace-path.resolver.ts` — 2 files, 58 lines, risk 1

A command that prints "not implemented" and a path resolver whose only caller is that command
(`src/cli/run.command.ts:28`). `WorkspaceRootResolver` (`src/workspace/workspace-root.resolver.ts`)
already does the same job for every other command. **Recommendation: merge
`WorkspacePathResolver` into `WorkspaceRootResolver` and keep the stub command only if `run` is
imminent.**

---

### Genuinely load-bearing — do NOT simplify

**`src/workspace/git/git.service.ts` (517 lines).** Every git invocation in the program goes
through it with an argument array and no shell; `grep -rln "child_process" src/` confirms only
three files spawn anything and only this one spawns git. Flattening it into the tools would put
`spawn` next to model-supplied strings in four different files. Its ref validation and the `--`
separator are the difference between `git_diff` being a diff tool and being an arbitrary-argument
injection point.

**`src/workspace/security/path.policy.ts` + `role-write.policy.ts` + `src/workspace/workspace.service.ts:48-88`.**
`resolveSafe` is the containment root: it rejects NUL bytes and empty paths, resolves, checks
containment, then re-checks the realpath of the nearest existing ancestor so a symlink cannot
escape. Six validators depend on it. `RoleWritePolicy` enforces "QA writes tests only" in code
rather than in a prompt — that is the whole point of the rule and a prompt cannot be trusted with
it.

**`src/workspace/commands/command.policy.ts` (273 lines) + `command.tokenizer.ts` (90) +
`child-environment.builder.ts`.** The allowlist, the shell-free tokenizer and the secret-stripped
child environment are what make `run_command` safe to hand to a model. This is the highest-risk
tool in the repo and the one place where 400 lines of policy is proportionate.

**`src/workspace/io/atomic-file.writer.ts` (30 lines).** Temp file + `rename` is why a crashed or
denied write cannot truncate the user's source file. Thirty lines protecting every `write_file`
and `edit_file` call.

**`src/agents/qa/*` (950 lines) and `src/agents/reviewer/*` (682 lines).** These compute
pass/fail, coverage, freshness and the verdict from recorded facts instead of taking the model's
word: `TestScopeChecker` checks that the tests actually import the changed code,
`SuspiciousTestChangeDetector` flags weakened assertions, `ReviewReportBuilder` derives the verdict
from severities and lists changed files the reviewer never read. Simplifying these would mean
trusting the model's self-report, which is exactly what the architecture is built to avoid.

**`src/sdk` as a boundary (18 files, 995 lines).** All nine `@openai/agents` imports are inside it.
`SdkErrorMapper` (102 lines) and `UsageReader` (83) localise the vendor's error and usage shapes;
`AgentToolAdapter` localises its tool shape. This is the one layer where "merge it into the caller"
would make a vendor upgrade touch `cli/` and `agents/`.

**`src/db/repositories/agent-call.repository.ts` (241 lines) + `src/db/prices/cost.calculator.ts`
+ `GuardedRepository`.** Every model call is written to `agent_calls` whether it succeeded or
failed, prices come from the `model_prices` table, money stays `Decimal` until display, and a
failed write becomes a warning rather than lost work. The accounting commands (`usage`, `history`,
`prices`) are built on it and are the most finished part of the product.

**The nine `*.validator.ts` / `*.service.ts` pairs (17 files, 1,493 lines).** The
validator/service split is doing work: because validation is read-only and complete,
`write-file.service.ts` is 34 lines with no defensive code. Keep this split even if the `.tool.ts`
layer goes.

**`src/workspace/tools/file-tool.constants.ts` (346 lines).** One table for every tool's
description, parameter hints, limits and refusals. It is what makes `team tools` work without an
API key and keeps prompt text out of the code. Splitting it per tool would make the tool surface
impossible to review in one pass.

---
## G. Root cause

There are **no task files in this repository.** The only prescriptive documents are `CLAUDE.md`
(checked in) and `eslint.config.mjs`, which mechanically enforces part of it. `README.md` is
descriptive, not prescriptive. So every pattern below traces to either CLAUDE.md/ESLint
("the spec demanded this") or to a choice made while writing the code ("I chose this").

### The spec demanded this

| pattern | the rule, quoted |
|---|---|
| 97 declaration-only files, median file size 30 lines | CLAUDE.md: *"`*.types.ts` holds interfaces and type aliases, `*.enum.ts` holds enums, `*.constants.ts` holds constants, `*.schema.ts` holds zod schemas. **These declarations appear nowhere else.**"* — enforced as a lint **error** by `eslint.config.mjs:18-31` (`TSInterfaceDeclaration` → *"Declare interfaces in a dedicated \*.types.ts file."*). This rule alone is why `src/config/env.types.ts` is a four-line file and why nine `XInput` types that nobody imports exist. |
| every two-line helper is a class (`DateFormatter`, `AgentTargetParser`, `EnvironmentFile`, `ActivityClock`, …) | CLAUDE.md: *"Logic lives in classes. No exported functions and no exported arrow functions."* — enforced by `eslint.config.mjs:3-16`, message *"Logic must live in a class. Export a class with static methods instead."* |
| the nine `*.tool.ts` pure-delegation files (§F.2) | CLAUDE.md: *"Each file tool is a folder with three layers: `*.tool.ts` — thin adapter: calls the validator, then the service, and never throws. `*.validator.ts` — all input and policy validation… `*.service.ts` — does the work and trusts the validated input."* |
| tool descriptions in a 346-line constants table plus a renderer, instead of inline | CLAUDE.md: *"Tool descriptions, parameter hints and tool flags come only from `FILE_TOOL_DEFINITIONS` in `src/workspace/tools/file-tool.constants.ts`, rendered by `ToolDefinitionRenderer`. No description text inline in `.tool.ts` or `.schema.ts`."* — this one earns its keep (§F, load-bearing). |
| `AGENT_DEFINITIONS` + `AgentDefinitionRenderer`, and the duplicated `OrchestratorTaskRenderer` | CLAUDE.md: *"Each agent is described by an `AgentDefinition` object in `src/agents/agent-definitions.constants.ts`. Instruction text is produced only by `AgentDefinitionRenderer`; no prompt text inline in services."* and *"The Orchestrator is defined as one task definition per output (`ORCHESTRATOR_TASKS`)"*. Two definition shapes were specified, so two renderers were written. The spec did not demand that they be copies of each other — **that part I chose.** |
| `AgentInvoker` port and the `src/sdk` boundary | CLAUDE.md: *"Agents are reached only through the `AgentInvoker` port, so core code never imports the SDK"* and *"Only `src/sdk` imports `@openai/agents`."* The boundary is respected; the interface is a one-implementation port (§C.1). |
| `PlanExecutor` / `StepRunner` / `DecisionGuard` / `ReworkBriefBuilder` and the whole dead tree | CLAUDE.md: *"`PlanExecutor` owns the run: planning, the ordered steps, attempts, budget and the final report. `StepRunner` owns one step."* and *"Every decision passes through `DecisionGuard`, which may override it on recorded facts."* The spec described the pipeline in detail; the code implements the description. **What the spec did not say is that the pipeline would have no caller** — see below. |
| `RoleWritePolicy` instead of a prompt rule | CLAUDE.md: *"Write access can be restricted per agent role in code (`RoleWritePolicy`), not by prompts. QA may write test files only."* Load-bearing. |
| facts computed by code, not by the model (QA/Reviewer builders, 1,632 lines) | CLAUDE.md: *"Pass/fail results, counts, freshness, the list of changed files and token usage are computed by code from recorded facts (`CommandRunRecorder`, `ChangeTracker`, git), never reported by the model."* Load-bearing. |
| `GuardedRepository` | CLAUDE.md: *"A database write must never lose agent work: everything except the run row is guarded, logged and reported as a warning instead of throwing."* Load-bearing. |
| `GitService` as the only git spawner | CLAUDE.md: *"Only `GitService` spawns git: with an argument array, never a shell, user paths after `--`, refs validated first."* Load-bearing. |
| `CostCalculator` + `Decimal` money | CLAUDE.md: *"Model prices live in the `model_prices` table and are applied by `CostCalculator`, never hardcoded in logic. Money is `Decimal`, never float."* Load-bearing. |
| `*InputRenderer` packet classes | CLAUDE.md: *"Agents receive their input from code-built, typed packets rendered by `*InputRenderer` classes."* |

### I chose this — the spec did not ask for it

| pattern | note |
|---|---|
| **The dead pipeline having no caller.** CLAUDE.md describes what `PlanExecutor` does; it never says `run.command.ts` should be a stub, and it never says the four DI tokens should go unprovided. Building 3,000 lines of executor and then not wiring it to the only command that would use it was a choice. | §0, §F.1 |
| **73 numeric alias constants** (`const EMPTY = 0`, `const START = 0`, `const FIRST_ITEM = 1`, `const NO_TOKENS = 0`, …). There is **no `no-magic-numbers` rule** in `eslint.config.mjs` — `grep -c "no-magic-numbers" eslint.config.mjs` returns 0. Entirely self-imposed. | §F.4 |
| **One-line and four-line constants files** — `src/sdk/sdk.messages.ts` (1 line), `src/workspace/approval/approval.constants.ts` (1), `src/agents/developer/developer.constants.ts` (4). CLAUDE.md says constants live in `*.constants.ts`; it does not say every constant needs its own file. `src/workspace/workspace.constants.ts` holds 115 lines of them, which is the same rule applied sanely. | §F.4 |
| **`WriteOutcome`** — a two-member enum computed from a boolean and immediately converted back (`write-file.service.ts:20,25`). No rule asked for it. | §C.4 |
| **`OrchestratorTaskRenderer` being a copy of `AgentDefinitionRenderer`** rather than one renderer over two header sets. | §F.7 |
| **`TEAM_AGENTS` as a second agent list** next to `AGENT_DEFINITIONS` and `ORCHESTRATOR_TASKS`, with nothing keeping them in sync. | §B.2 |
| **`AgentsCommand` hand-rolling table layout** while `TableRenderer` exists and four other formatters use it, and `cli.constants.ts:23-24` aliases the very constants `TableRenderer` reads. | §B.2 |
| **Ports whose comments describe implementations that do not exist** — `plan-repository.port.types.ts:9-10` claims *"The PostgreSQL implementation lives in src/db"*; the class of that name in `src/db` has a disjoint method set and no `implements` clause. Likewise `event-bus.ts:4-6` and `events.module.ts:5-6` promise a database logger subscriber that was never written. These comments make dead code read as live. | §C.1, §F.6 |
| **The retry machinery with `SDK_RETRY_ATTEMPTS = 0`** — four constants, a loop, a backoff calculator and an `isTransient` classifier, none of which can execute. The comment at `src/sdk/sdk.constants.ts:6-8` explains the reasoning; writing the unreachable code anyway was a choice. | §D.4 |
| **`src/workspace/io/` and `src/workspace/enums/` as directories** holding one and three small files. | §F.8 |
| **`README.md` documenting `run` as *"Runs a prompt against the agent team"*** (README:35) without saying it is a stub, while the `@Command` description in the code does say `(stub)`. Also `README:163` advertises *"`npm test` # jest unit tests"* while `package.json` runs `jest --passWithNoTests` and there are zero test files. | §0 |
| **Zero tests**, in a codebase whose main justification for six single-implementation ports would be testability. CLAUDE.md requires only that *"`npm run lint` and `npm run build` must pass"*; it does not forbid tests. | §C.1 |

### The honest summary of cause

Two thirds of the file count comes from one ESLint rule — `no-restricted-syntax` banning type,
interface and enum declarations outside dedicated files (`eslint.config.mjs:18-31`) — combined
with "logic lives in classes" (`:3-16`). Those two rules turn a 16,773-line program into 325
files with a median size of 30 lines. That is the spec's doing, and it is reversible by editing
one config file and moving declarations.

The 2,376 unreachable lines are not the spec's doing. CLAUDE.md describes the pipeline as if it
runs; nothing in the repository says it does not. That gap — not the file count — is the real
problem a reviewer should be told about first.

---

## Final numbers

| | files |
|---|---|
| **total files under `src/` today** | **325** |
| **files I would keep as-is** | **~190** |
| **estimated file count after the recommended changes** | **~215** |

Derivation of the ~215:

| change | files removed | files remaining |
|---|---|---|
| start | — | 325 |
| merge single-use `*.types.ts` / `*.enum.ts` into their single reader (§F.3) | −62 | 263 |
| merge the nine `*.tool.ts` into their services (§F.2) | −9 | 254 |
| remove the nine dead `XInput` type declarations (already counted above) | 0 | 254 |
| delete one-to-four-line constants files (§F.4) | −15 | 239 |
| delete the 2 dead in-memory repositories + 3 port interface files (§F.5) | −5 | 234 |
| delete the 11 unused event interfaces (same file, no file removed) | 0 | 234 |
| delete the 4 unreachable `summarize/` input files and 3 `brief/` files (§E) | −7 | 227 |
| merge the duplicated `OrchestratorTaskRenderer` (§F.7) | −1 | 226 |
| delete `write-outcome.enum.ts`, flatten `io/` and `enums/`, delete `table.types.ts` (§F.8) | −4 | 222 |
| delete `run.command.ts` + `workspace-path.resolver.ts`, or wire `run` (§F.9) | −2 | 220 |
| delete the 2 never-called repositories + their 2 types files + 2 mappers (§D.2) — only if the executor is abandoned | −6 | 214 |

The ~190 "keep as-is" figure counts files I would not touch at all: `src/sdk` (18),
`src/workspace/{git,commands,security,tools,activity,errors}` (45), the nine validator/service
pairs (17), `src/agents/{qa,reviewer,developer,common}` (36), `src/db` + `src/db/{prices,repositories}`
minus the six dead ones (20), `src/cli` minus the stub and the constants files (~22), and the
module/entry files. The difference between 190 and 215 is files that survive a merge in modified
form.

**One caveat on all three numbers:** they assume the executor tree is kept. If the `run` command is
implemented — which is the recommendation in §F.1 — then 30 files move from dead to live, 6
repository files become used, and nothing in that tree should be deleted. The file count would
then land near **245** rather than 215, and the over-engineering findings in §F.2–§F.8 would still
all apply.

---

## Appendix A1 — full file inventory

All 325 `.ts` files under `src/`. `lines` is the raw line count, `exports` the number of top-level
`export` declarations, `importers` the number of distinct files with a relative import resolving
to this file. Rows marked `‡` are unreachable from `src/main.ts`.

| # | path | lines | exports | importers |
|---|---|---|---|---|
| 1 | `src/agents/agent-definition.renderer.ts` | 48 | 1 | 1 |
| 2 | `src/agents/agent-definitions.constants.ts` | 229 | 1 | 3 |
| 3 | `src/agents/agent-definition.types.ts` | 16 | 2 | 9 |
| 4 | `src/agents/agent-role.enum.ts` | 7 | 1 | 32 |
| 5 | `src/agents/agents.config.ts` | 26 | 1 | 1 |
| 6 | `src/agents/agents.constants.ts` | 13 | 1 | 1 |
| 7 | `src/agents/agent-tool.types.ts` | 11 | 1 | 13 |
| 8 | `src/agents/common/issue-category.enum.ts` | 12 | 1 | 5 |
| 9 | `src/agents/common/issue-severity.enum.ts` | 7 | 1 | 7 |
| 10 | `src/agents/context/developer-input.constants.ts` | 15 | 4 | 1 |
| 11 | `src/agents/context/developer-input.renderer.ts` | 53 | 1 | 2 |
| 12 | `src/agents/context/developer-input.types.ts` | 16 | 1 | 1 |
| 13 | `src/agents/context/input-section.renderer.ts` | 134 | 1 | 6 |
| 14 | `src/agents/context/input-section.types.ts` | 7 | 1 | 5 |
| 15 | `src/agents/context/qa-brief.schema.ts` | 32 | 1 | 2 |
| 16 | `src/agents/context/qa-brief.types.ts` | 5 | 1 | 4 |
| 17 | `src/agents/context/qa-input.constants.ts` | 28 | 16 | 4 |
| 18 | `src/agents/context/qa-input.renderer.ts` | 82 | 1 | 2 |
| 19 | `src/agents/context/qa-input.types.ts` | 17 | 1 | 1 |
| 20 | `src/agents/context/review-input.constants.ts` | 16 | 5 | 1 |
| 21 | `src/agents/context/review-input.renderer.ts` | 111 | 1 | 2 |
| 22 | `src/agents/context/review-input.types.ts` | 28 | 2 | 2 |
| 23 | `src/agents/context/step-context.types.ts` | 14 | 2 | 11 |
| 24 | `src/agents/developer/developer.constants.ts` | 5 | 3 | 2 |
| 25 | `src/agents/developer/developer-report.builder.ts` | 69 | 1 | 2 |
| 26 | `src/agents/developer/developer-report.formatter.ts` | 85 | 1 | 2 |
| 27 | `src/agents/developer/developer-report.types.ts` | 36 | 5 | 12 |
| 28 | `src/agents/developer/developer-result.schema.ts` | 38 | 1 | 2 |
| 29 | `src/agents/developer/developer-result.types.ts` | 7 | 2 | 8 |
| 30 | `src/agents/developer/developer-status.enum.ts` | 6 | 1 | 2 |
| 31 | `src/agents/model.constants.ts` | 12 | 1 | 1 |
| 32 | `src/agents/orchestrator/brief/brief-input.constants.ts` ‡ | 12 | 3 | 1 |
| 33 | `src/agents/orchestrator/brief/brief-input.renderer.ts` ‡ | 30 | 1 | 1 |
| 34 | `src/agents/orchestrator/brief/brief-input.types.ts` ‡ | 10 | 1 | 1 |
| 35 | `src/agents/orchestrator/decide/decision.guard.ts` ‡ | 78 | 1 | 1 |
| 36 | `src/agents/orchestrator/decide/decision-input.constants.ts` ‡ | 6 | 5 | 1 |
| 37 | `src/agents/orchestrator/decide/decision-input.renderer.ts` ‡ | 57 | 1 | 1 |
| 38 | `src/agents/orchestrator/decide/decision-input.types.ts` ‡ | 23 | 2 | 2 |
| 39 | `src/agents/orchestrator/decide/decision.messages.ts` ‡ | 34 | 1 | 1 |
| 40 | `src/agents/orchestrator/decide/decision-outcome.types.ts` | 11 | 1 | 4 |
| 41 | `src/agents/orchestrator/decide/rework-brief.builder.ts` | 105 | 1 | 2 |
| 42 | `src/agents/orchestrator/decide/rework-brief.constants.ts` | 5 | 4 | 1 |
| 43 | `src/agents/orchestrator/decide/rework-brief.types.ts` | 11 | 1 | 3 |
| 44 | `src/agents/orchestrator/decide/step-decision.enum.ts` | 6 | 1 | 10 |
| 45 | `src/agents/orchestrator/decide/step-decision.schema.ts` | 42 | 1 | 2 |
| 46 | `src/agents/orchestrator/decide/step-decision.types.ts` | 7 | 2 | 12 |
| 47 | `src/agents/orchestrator/orchestrator.constants.ts` | 25 | 14 | 5 |
| 48 | `src/agents/orchestrator/orchestrator-task-definition.types.ts` | 14 | 1 | 2 |
| 49 | `src/agents/orchestrator/orchestrator-task.enum.ts` | 7 | 1 | 18 |
| 50 | `src/agents/orchestrator/orchestrator-task.renderer.ts` | 58 | 1 | 1 |
| 51 | `src/agents/orchestrator/orchestrator-tasks.constants.ts` | 183 | 1 | 1 |
| 52 | `src/agents/orchestrator/plan/plan.formatter.ts` | 79 | 1 | 2 |
| 53 | `src/agents/orchestrator/plan/plan-input.constants.ts` | 18 | 13 | 3 |
| 54 | `src/agents/orchestrator/plan/plan-input.renderer.ts` | 55 | 1 | 2 |
| 55 | `src/agents/orchestrator/plan/plan-input.types.ts` | 12 | 2 | 2 |
| 56 | `src/agents/orchestrator/plan/run-plan.schema.ts` | 46 | 1 | 2 |
| 57 | `src/agents/orchestrator/plan/run-plan.types.ts` | 7 | 2 | 8 |
| 58 | `src/agents/orchestrator/summarize/run-summary.schema.ts` | 27 | 1 | 2 |
| 59 | `src/agents/orchestrator/summarize/run-summary.types.ts` ‡ | 7 | 2 | 4 |
| 60 | `src/agents/orchestrator/summarize/summary-input.constants.ts` ‡ | 7 | 6 | 1 |
| 61 | `src/agents/orchestrator/summarize/summary-input.renderer.ts` ‡ | 61 | 1 | 1 |
| 62 | `src/agents/orchestrator/summarize/summary-input.types.ts` ‡ | 18 | 2 | 2 |
| 63 | `src/agents/qa/added-lines.reader.ts` | 36 | 1 | 2 |
| 64 | `src/agents/qa/changed-file.classifier.ts` | 32 | 1 | 4 |
| 65 | `src/agents/qa/changed-file-kind.enum.ts` | 6 | 1 | 5 |
| 66 | `src/agents/qa/coverage-level.enum.ts` | 6 | 1 | 4 |
| 67 | `src/agents/qa/qa.constants.ts` | 49 | 17 | 10 |
| 68 | `src/agents/qa/qa-report.builder.ts` | 254 | 1 | 2 |
| 69 | `src/agents/qa/qa-report.formatter.ts` | 175 | 1 | 3 |
| 70 | `src/agents/qa/qa-report.messages.ts` | 81 | 1 | 3 |
| 71 | `src/agents/qa/qa-report.types.ts` | 38 | 4 | 11 |
| 72 | `src/agents/qa/qa-result.schema.ts` | 108 | 1 | 2 |
| 73 | `src/agents/qa/qa-result.types.ts` | 15 | 6 | 11 |
| 74 | `src/agents/qa/qa-status.enum.ts` | 6 | 1 | 7 |
| 75 | `src/agents/qa/suspicious-test-change.detector.ts` | 21 | 1 | 1 |
| 76 | `src/agents/qa/test-file-diff.collector.ts` | 38 | 1 | 3 |
| 77 | `src/agents/qa/test-scope.checker.ts` | 100 | 1 | 1 |
| 78 | `src/agents/reviewer/checklist-item.enum.ts` | 13 | 1 | 4 |
| 79 | `src/agents/reviewer/checklist-status.enum.ts` | 6 | 1 | 3 |
| 80 | `src/agents/reviewer/review-checklist.constants.ts` | 51 | 2 | 2 |
| 81 | `src/agents/reviewer/review-dimension.enum.ts` | 7 | 1 | 5 |
| 82 | `src/agents/reviewer/reviewer.constants.ts` | 49 | 11 | 7 |
| 83 | `src/agents/reviewer/review-report.builder.ts` | 218 | 1 | 2 |
| 84 | `src/agents/reviewer/review-report.formatter.ts` | 139 | 1 | 2 |
| 85 | `src/agents/reviewer/review-report.messages.ts` | 60 | 1 | 1 |
| 86 | `src/agents/reviewer/review-report.types.ts` | 23 | 2 | 8 |
| 87 | `src/agents/reviewer/review-result.schema.ts` | 110 | 1 | 2 |
| 88 | `src/agents/reviewer/review-result.types.ts` | 13 | 5 | 10 |
| 89 | `src/agents/reviewer/review-verdict.enum.ts` | 5 | 1 | 5 |
| 90 | `src/agents/team-agent.types.ts` | 7 | 1 | 1 |
| 91 | `src/agents/utils/compact-number.formatter.ts` | 20 | 1 | 6 |
| 92 | `src/agents/utils/duration.formatter.ts` | 20 | 1 | 9 |
| 93 | `src/app.module.ts` | 11 | 1 | 1 |
| 94 | `src/cli/agent-command.constants.ts` | 24 | 9 | 3 |
| 95 | `src/cli/agent.command.ts` | 178 | 1 | 1 |
| 96 | `src/cli/agent-input.builder.ts` | 106 | 1 | 2 |
| 97 | `src/cli/agent-report.printer.ts` | 96 | 1 | 2 |
| 98 | `src/cli/agent-run.types.ts` | 10 | 1 | 2 |
| 99 | `src/cli/agents.command.ts` | 36 | 1 | 1 |
| 100 | `src/cli/agent-target.parser.ts` | 9 | 1 | 1 |
| 101 | `src/cli/cli.constants.ts` | 25 | 18 | 8 |
| 102 | `src/cli/cli.module.ts` | 35 | 1 | 1 |
| 103 | `src/cli/command-options.types.ts` | 37 | 6 | 6 |
| 104 | `src/cli/database.command.ts` | 15 | 1 | 5 |
| 105 | `src/cli/date.formatter.ts` | 11 | 1 | 3 |
| 106 | `src/cli/event-printer.constants.ts` | 7 | 6 | 1 |
| 107 | `src/cli/event-printer.ts` | 55 | 1 | 1 |
| 108 | `src/cli/history.command.ts` | 84 | 1 | 1 |
| 109 | `src/cli/history.constants.ts` | 27 | 14 | 1 |
| 110 | `src/cli/history.formatter.ts` | 120 | 1 | 1 |
| 111 | `src/cli/money.formatter.ts` | 17 | 1 | 2 |
| 112 | `src/cli/prices.command.ts` | 95 | 1 | 1 |
| 113 | `src/cli/prices.constants.ts` | 13 | 3 | 1 |
| 114 | `src/cli/prices.formatter.ts` | 28 | 1 | 1 |
| 115 | `src/cli/run.command.ts` | 50 | 1 | 1 |
| 116 | `src/cli/runs-prune.command.ts` | 114 | 1 | 1 |
| 117 | `src/cli/table.renderer.ts` | 43 | 1 | 4 |
| 118 | `src/cli/table.types.ts` | 6 | 1 | 5 |
| 119 | `src/cli/tools.command.ts` | 51 | 1 | 1 |
| 120 | `src/cli/tools.constants.ts` | 15 | 6 | 1 |
| 121 | `src/cli/usage.command.ts` | 169 | 1 | 1 |
| 122 | `src/cli/usage.constants.ts` | 43 | 9 | 1 |
| 123 | `src/cli/usage-dimension.enum.ts` | 6 | 1 | 1 |
| 124 | `src/cli/usage.formatter.ts` | 102 | 1 | 1 |
| 125 | `src/cli/workspace-path.resolver.ts` | 10 | 1 | 1 |
| 126 | `src/config/configuration.error.ts` | 9 | 1 | 2 |
| 127 | `src/config/env.constants.ts` | 22 | 6 | 4 |
| 128 | `src/config/environment-file.ts` | 14 | 1 | 1 |
| 129 | `src/config/environment.reader.ts` | 39 | 1 | 1 |
| 130 | `src/config/env.schema.ts` | 11 | 1 | 2 |
| 131 | `src/config/env.types.ts` | 5 | 1 | 2 |
| 132 | `src/db/database.bootstrap.ts` | 42 | 1 | 7 |
| 133 | `src/db/db.constants.ts` | 86 | 20 | 8 |
| 134 | `src/db/db.messages.ts` | 42 | 1 | 7 |
| 135 | `src/db/db.module.ts` | 40 | 1 | 1 |
| 136 | `src/db/db.types.ts` | 14 | 2 | 2 |
| 137 | `src/db/json.value.ts` | 29 | 1 | 5 |
| 138 | `src/db/migration.runner.ts` | 53 | 1 | 2 |
| 139 | `src/db/prices/cost.calculator.ts` | 27 | 1 | 1 |
| 140 | `src/db/prices/model-price.constants.ts` | 14 | 3 | 5 |
| 141 | `src/db/prices/model-price.seeder.ts` | 23 | 1 | 2 |
| 142 | `src/db/prices/model-price.types.ts` | 37 | 5 | 5 |
| 143 | `src/db/prisma.service.ts` | 22 | 1 | 7 |
| 144 | `src/db/repositories/agent-call.repository.ts` | 241 | 1 | 4 |
| 145 | `src/db/repositories/agent-call.repository.types.ts` | 60 | 6 | 3 |
| 146 | `src/db/repositories/attempt.mapper.ts` | 30 | 1 | 2 |
| 147 | `src/db/repositories/attempt.repository.ts` | 79 | 1 | 1 |
| 148 | `src/db/repositories/attempt.repository.types.ts` | 38 | 2 | 4 |
| 149 | `src/db/repositories/guarded.repository.ts` | 31 | 1 | 4 |
| 150 | `src/db/repositories/model-price.repository.ts` | 64 | 1 | 6 |
| 151 | `src/db/repositories/plan.repository.ts` | 88 | 1 | 1 |
| 152 | `src/db/repositories/plan.repository.types.ts` | 30 | 3 | 4 |
| 153 | `src/db/repositories/plan-step.mapper.ts` | 25 | 1 | 2 |
| 154 | `src/db/repositories/project.repository.ts` | 21 | 1 | 2 |
| 155 | `src/db/repositories/project.repository.types.ts` | 6 | 1 | 1 |
| 156 | `src/db/repositories/run.repository.ts` | 200 | 1 | 5 |
| 157 | `src/db/repositories/run.repository.types.ts` | 45 | 5 | 4 |
| 158 | `src/events/agent-event-kind.enum.ts` | 18 | 1 | 6 |
| 159 | `src/events/agent-event.types.ts` | 145 | 19 | 4 |
| 160 | `src/events/event-bus.ts` | 29 | 1 | 8 |
| 161 | `src/events/events.module.ts` | 12 | 1 | 1 |
| 162 | `src/execution/agents/agent-call.ledger.ts` | 39 | 1 | 3 |
| 163 | `src/execution/agents/agent-call.runner.ts` | 190 | 1 | 2 |
| 164 | `src/execution/agents/agent-failure.enum.ts` | 8 | 1 | 9 |
| 165 | `src/execution/agents/agent-failure.policy.ts` ‡ | 33 | 1 | 2 |
| 166 | `src/execution/agents/agent-invocation.error.ts` | 46 | 1 | 6 |
| 167 | `src/execution/agents/agent-invocation.types.ts` | 32 | 4 | 9 |
| 168 | `src/execution/agents/agent-invoker.port.types.ts` | 21 | 1 | 3 |
| 169 | `src/execution/attempt-carry.ts` ‡ | 36 | 1 | 1 |
| 170 | `src/execution/attempt-state.ts` ‡ | 50 | 1 | 1 |
| 171 | `src/execution/budget/budget-exhausted.error.ts` | 12 | 1 | 2 |
| 172 | `src/execution/budget/run-budget.ts` | 52 | 1 | 4 |
| 173 | `src/execution/checkpoint/commit-message.builder.ts` ‡ | 56 | 1 | 1 |
| 174 | `src/execution/checkpoint/commit-message.constants.ts` ‡ | 8 | 7 | 1 |
| 175 | `src/execution/checkpoint/step-checkpoint.ts` ‡ | 131 | 1 | 1 |
| 176 | `src/execution/execution.constants.ts` | 78 | 27 | 8 |
| 177 | `src/execution/execution.messages.ts` | 119 | 1 | 4 |
| 178 | `src/execution/execution.types.ts` | 109 | 9 | 12 |
| 179 | `src/execution/interaction/console-user-prompter.ts` | 32 | 1 | 1 |
| 180 | `src/execution/interaction/user-prompter.port.types.ts` | 6 | 1 | 2 |
| 181 | `src/execution/persistence/attempt-repository.port.types.ts` | 11 | 1 | 4 |
| 182 | `src/execution/persistence/in-memory-attempt.repository.ts` ‡ | 29 | 1 | 0 |
| 183 | `src/execution/persistence/in-memory-plan.repository.ts` ‡ | 101 | 1 | 0 |
| 184 | `src/execution/persistence/persistence.types.ts` | 82 | 7 | 4 |
| 185 | `src/execution/persistence/plan-repository.port.types.ts` ‡ | 18 | 1 | 2 |
| 186 | `src/execution/plan-executor.ts` ‡ | 554 | 1 | 0 |
| 187 | `src/execution/report/run-report.builder.ts` ‡ | 131 | 1 | 1 |
| 188 | `src/execution/report/run-report.constants.ts` ‡ | 33 | 31 | 1 |
| 189 | `src/execution/report/run-report.formatter.ts` ‡ | 217 | 1 | 1 |
| 190 | `src/execution/report/run-report.types.ts` ‡ | 66 | 5 | 2 |
| 191 | `src/execution/run-id.formatter.ts` | 28 | 1 | 7 |
| 192 | `src/execution/run-refused.error.ts` ‡ | 9 | 1 | 1 |
| 193 | `src/execution/run-signal.listener.ts` ‡ | 33 | 1 | 1 |
| 194 | `src/execution/run-state.ts` ‡ | 75 | 1 | 2 |
| 195 | `src/execution/run-status.enum.ts` | 7 | 1 | 11 |
| 196 | `src/execution/step-runner.ts` ‡ | 453 | 1 | 1 |
| 197 | `src/execution/step-status.enum.ts` | 8 | 1 | 9 |
| 198 | `src/execution/workspace.surveyor.ts` | 28 | 1 | 3 |
| 199 | `src/main.ts` | 10 | 0 | 0 |
| 200 | `src/sdk/agent-call.context.ts` | 52 | 1 | 4 |
| 201 | `src/sdk/agent.factory.ts` | 91 | 1 | 3 |
| 202 | `src/sdk/agent-output.registry.ts` | 37 | 1 | 1 |
| 203 | `src/sdk/agent-tool.adapter.ts` | 50 | 1 | 1 |
| 204 | `src/sdk/built-agent.types.ts` | 34 | 4 | 2 |
| 205 | `src/sdk/call-event.emitter.ts` | 73 | 1 | 5 |
| 206 | `src/sdk/call-scope.types.ts` | 21 | 3 | 8 |
| 207 | `src/sdk/sdk-agent-invoker.ts` | 265 | 1 | 1 |
| 208 | `src/sdk/sdk.bootstrap.ts` | 32 | 1 | 3 |
| 209 | `src/sdk/sdk.constants.ts` | 21 | 11 | 5 |
| 210 | `src/sdk/sdk-error.mapper.ts` | 103 | 1 | 1 |
| 211 | `src/sdk/sdk-error.messages.ts` | 35 | 1 | 1 |
| 212 | `src/sdk/sdk-invoker.factory.ts` | 34 | 1 | 2 |
| 213 | `src/sdk/sdk.messages.ts` | 2 | 1 | 1 |
| 214 | `src/sdk/sdk.module.ts` | 15 | 1 | 1 |
| 215 | `src/sdk/stream-event.mapper.ts` | 35 | 1 | 1 |
| 216 | `src/sdk/usage.reader.ts` | 84 | 1 | 1 |
| 217 | `src/sdk/usage.tally.ts` | 29 | 1 | 1 |
| 218 | `src/workspace/activity/activity-clock.ts` | 14 | 1 | 5 |
| 219 | `src/workspace/activity/agent-call.store.ts` | 21 | 1 | 9 |
| 220 | `src/workspace/activity/call-recorders.types.ts` | 14 | 1 | 2 |
| 221 | `src/workspace/activity/change-action.enum.ts` | 6 | 1 | 7 |
| 222 | `src/workspace/activity/change-tracker.ts` | 42 | 1 | 2 |
| 223 | `src/workspace/activity/file-access.recorder.ts` | 20 | 1 | 2 |
| 224 | `src/workspace/activity/tracked-change.types.ts` | 9 | 1 | 5 |
| 225 | `src/workspace/approval/approval.constants.ts` | 2 | 1 | 2 |
| 226 | `src/workspace/approval/approval-gate.types.ts` | 9 | 2 | 2 |
| 227 | `src/workspace/approval/logging-approval-gate.ts` | 16 | 1 | 1 |
| 228 | `src/workspace/commands/child-environment.builder.ts` | 37 | 1 | 1 |
| 229 | `src/workspace/commands/command.lock.ts` | 13 | 1 | 2 |
| 230 | `src/workspace/commands/command-policy.constants.ts` | 61 | 23 | 4 |
| 231 | `src/workspace/commands/command.policy.ts` | 273 | 1 | 1 |
| 232 | `src/workspace/commands/command-policy.types.ts` | 7 | 1 | 1 |
| 233 | `src/workspace/commands/command-risk.enum.ts` | 6 | 1 | 5 |
| 234 | `src/workspace/commands/command-run.recorder.ts` | 30 | 1 | 2 |
| 235 | `src/workspace/commands/command-run.types.ts` | 13 | 2 | 4 |
| 236 | `src/workspace/commands/command.tokenizer.ts` | 91 | 1 | 1 |
| 237 | `src/workspace/commands/output.collector.ts` | 35 | 1 | 1 |
| 238 | `src/workspace/commands/output.truncator.ts` | 25 | 1 | 1 |
| 239 | `src/workspace/commands/test-command.constants.ts` | 27 | 15 | 3 |
| 240 | `src/workspace/commands/test-run.classifier.ts` | 83 | 1 | 1 |
| 241 | `src/workspace/commands/test-run-kind.enum.ts` | 6 | 1 | 2 |
| 242 | `src/workspace/commands/test-summary.parser.ts` | 49 | 1 | 1 |
| 243 | `src/workspace/commands/test-summary.types.ts` | 7 | 1 | 3 |
| 244 | `src/workspace/enums/file-system-error-code.enum.ts` | 5 | 1 | 1 |
| 245 | `src/workspace/enums/file-tool-name.enum.ts` | 12 | 1 | 25 |
| 246 | `src/workspace/enums/git-error-reason.enum.ts` | 8 | 1 | 1 |
| 247 | `src/workspace/errors/git.error.ts` | 68 | 1 | 1 |
| 248 | `src/workspace/errors/tool-validation.error.ts` | 13 | 1 | 9 |
| 249 | `src/workspace/git/changed-file-status.enum.ts` | 7 | 1 | 6 |
| 250 | `src/workspace/git/changed-file.types.ts` | 14 | 2 | 14 |
| 251 | `src/workspace/git/git-change-kind.enum.ts` | 8 | 1 | 4 |
| 252 | `src/workspace/git/git.constants.ts` | 89 | 38 | 7 |
| 253 | `src/workspace/git/git.service.ts` | 517 | 1 | 10 |
| 254 | `src/workspace/git/git.types.ts` | 28 | 4 | 4 |
| 255 | `src/workspace/io/atomic-file.writer.ts` | 31 | 1 | 4 |
| 256 | `src/workspace/security/binary.detector.ts` | 27 | 1 | 4 |
| 257 | `src/workspace/security/path.policy.ts` | 106 | 1 | 15 |
| 258 | `src/workspace/security/role-write.policy.ts` | 48 | 1 | 3 |
| 259 | `src/workspace/security/role-write-rules.constants.ts` | 28 | 3 | 2 |
| 260 | `src/workspace/security/write-path-rule-kind.enum.ts` | 6 | 1 | 3 |
| 261 | `src/workspace/security/write-path-rule.types.ts` | 14 | 2 | 2 |
| 262 | `src/workspace/security/write-target.types.ts` | 6 | 1 | 3 |
| 263 | `src/workspace/tools/delete-file/delete-file.constants.ts` | 9 | 1 | 1 |
| 264 | `src/workspace/tools/delete-file/delete-file.schema.ts` | 11 | 1 | 3 |
| 265 | `src/workspace/tools/delete-file/delete-file.service.ts` | 21 | 1 | 2 |
| 266 | `src/workspace/tools/delete-file/delete-file.tool.ts` | 35 | 1 | 2 |
| 267 | `src/workspace/tools/delete-file/delete-file.types.ts` | 11 | 2 | 2 |
| 268 | `src/workspace/tools/delete-file/delete-file.validator.ts` | 83 | 1 | 2 |
| 269 | `src/workspace/tools/edit-file/edit-file.constants.ts` | 5 | 3 | 1 |
| 270 | `src/workspace/tools/edit-file/edit-file.schema.ts` | 20 | 1 | 3 |
| 271 | `src/workspace/tools/edit-file/edit-file.service.ts` | 40 | 1 | 2 |
| 272 | `src/workspace/tools/edit-file/edit-file.tool.ts` | 35 | 1 | 2 |
| 273 | `src/workspace/tools/edit-file/edit-file.types.ts` | 21 | 3 | 2 |
| 274 | `src/workspace/tools/edit-file/edit-file.validator.ts` | 150 | 1 | 2 |
| 275 | `src/workspace/tools/file-tool.constants.ts` | 346 | 36 | 32 |
| 276 | `src/workspace/tools/file-tool.registry.ts` | 85 | 1 | 3 |
| 277 | `src/workspace/tools/file-tool.types.ts` | 27 | 3 | 3 |
| 278 | `src/workspace/tools/git-diff/git-diff-mode.enum.ts` | 5 | 1 | 4 |
| 279 | `src/workspace/tools/git-diff/git-diff.schema.ts` | 17 | 1 | 3 |
| 280 | `src/workspace/tools/git-diff/git-diff.service.ts` | 185 | 1 | 2 |
| 281 | `src/workspace/tools/git-diff/git-diff.tool.ts` | 35 | 1 | 2 |
| 282 | `src/workspace/tools/git-diff/git-diff.types.ts` | 22 | 4 | 2 |
| 283 | `src/workspace/tools/git-diff/git-diff.validator.ts` | 62 | 1 | 2 |
| 284 | `src/workspace/tools/git-status/git-status.schema.ts` | 4 | 1 | 2 |
| 285 | `src/workspace/tools/git-status/git-status.service.ts` | 101 | 1 | 2 |
| 286 | `src/workspace/tools/git-status/git-status.tool.ts` | 31 | 1 | 2 |
| 287 | `src/workspace/tools/git-status/git-status.types.ts` | 8 | 2 | 1 |
| 288 | `src/workspace/tools/list-files/list-files.schema.ts` | 18 | 1 | 3 |
| 289 | `src/workspace/tools/list-files/list-files.service.ts` | 89 | 1 | 2 |
| 290 | `src/workspace/tools/list-files/list-files.tool.ts` | 35 | 1 | 2 |
| 291 | `src/workspace/tools/list-files/list-files.types.ts` | 23 | 4 | 2 |
| 292 | `src/workspace/tools/list-files/list-files.validator.ts` | 51 | 1 | 2 |
| 293 | `src/workspace/tools/read-file/read-file.schema.ts` | 31 | 1 | 3 |
| 294 | `src/workspace/tools/read-file/read-file.service.ts` | 84 | 1 | 2 |
| 295 | `src/workspace/tools/read-file/read-file.tool.ts` | 35 | 1 | 2 |
| 296 | `src/workspace/tools/read-file/read-file.types.ts` | 13 | 2 | 2 |
| 297 | `src/workspace/tools/read-file/read-file.validator.ts` | 64 | 1 | 2 |
| 298 | `src/workspace/tools/read-file/read-truncation.enum.ts` | 6 | 1 | 2 |
| 299 | `src/workspace/tools/role-scoped-write.schema.ts` | 4 | 1 | 1 |
| 300 | `src/workspace/tools/role-scoped-write.tool.ts` | 53 | 1 | 1 |
| 301 | `src/workspace/tools/run-command/run-command.schema.ts` | 29 | 1 | 3 |
| 302 | `src/workspace/tools/run-command/run-command.service.ts` | 150 | 1 | 2 |
| 303 | `src/workspace/tools/run-command/run-command.tool.ts` | 35 | 1 | 2 |
| 304 | `src/workspace/tools/run-command/run-command.types.ts` | 24 | 3 | 2 |
| 305 | `src/workspace/tools/run-command/run-command.validator.ts` | 89 | 1 | 2 |
| 306 | `src/workspace/tools/search-code/search-code.schema.ts` | 38 | 1 | 3 |
| 307 | `src/workspace/tools/search-code/search-code.service.ts` | 153 | 1 | 2 |
| 308 | `src/workspace/tools/search-code/search-code.tool.ts` | 35 | 1 | 2 |
| 309 | `src/workspace/tools/search-code/search-code.types.ts` | 20 | 3 | 2 |
| 310 | `src/workspace/tools/search-code/search-code.validator.ts` | 79 | 1 | 2 |
| 311 | `src/workspace/tools/tool-definition.renderer.ts` | 60 | 1 | 17 |
| 312 | `src/workspace/tools/write-file/write-file.schema.ts` | 12 | 1 | 3 |
| 313 | `src/workspace/tools/write-file/write-file.service.ts` | 36 | 1 | 2 |
| 314 | `src/workspace/tools/write-file/write-file.tool.ts` | 35 | 1 | 2 |
| 315 | `src/workspace/tools/write-file/write-file.types.ts` | 15 | 2 | 2 |
| 316 | `src/workspace/tools/write-file/write-file.validator.ts` | 73 | 1 | 2 |
| 317 | `src/workspace/tools/write-file/write-outcome.enum.ts` | 5 | 1 | 2 |
| 318 | `src/workspace/utils/byte-size.formatter.ts` | 16 | 1 | 1 |
| 319 | `src/workspace/utils/error.inspector.ts` | 33 | 1 | 26 |
| 320 | `src/workspace/utils/text-content.ts` | 26 | 1 | 5 |
| 321 | `src/workspace/workspace.constants.ts` | 116 | 22 | 15 |
| 322 | `src/workspace/workspace.messages.ts` | 401 | 1 | 32 |
| 323 | `src/workspace/workspace.module.ts` | 77 | 1 | 3 |
| 324 | `src/workspace/workspace-root.resolver.ts` | 44 | 1 | 1 |
| 325 | `src/workspace/workspace.service.ts` | 91 | 1 | 19 |