# Layers report

Written 2026-11-03 against `main` at `543cdef` (working tree clean apart from `REFACTOR-PLAN.md`).
Analysis only: no code was changed to produce it.

## Method and what was traced

A **hop** here is one crossing of a function boundary in this repository's own code, plus one hop
for the vendor SDK and one for Prisma where control actually leaves our code. A hop is not a file:
two files can be one hop (a class and the types file beside it), and one file can be six hops
(`AtomicFileWriter.replace` → `mkdir` → `temporaryPath` → `writeFile` → `chmod` → `rename`).

Four paths were followed end to end in the code as it stands, not in the architecture:

1. a model's `write_file` call, from the SDK dispatch to the bytes on disk;
2. one accepted plan step, from `PlanExecutor` entering the step to the git commit;
3. one agent call, from `StepRunner` asking for an agent to the parsed structured output;
4. one recorded model call, from `usage` on the SDK result to the number printed by
   `team usage --by step`.

Every hop carries exactly one label: **Transforms**, **Enforces**, **Isolates**, **Enables**,
**Forwards**. Only Forwards hops are candidates for removal.

Trace 4 was checked against the real database rather than read only. `npx tsx src/main.ts usage
--by step` on run `b5ad9cb3` prints, today:

```
STEP                                               STATUS    ATTEMPTS  MODEL        INPUT (CACHED)  OUTPUT   TOTAL     COST  CALLS       TIME
1. Set up the project and arithmetic module        accepted         3  gpt-6-luna  618.0k (546.6k)   27.9k  645.9k  $0.0266     15   6 m 51 s
2. Add degree and radian trigonometry              accepted         1  gpt-6-luna  171.0k (145.7k)   11.4k  182.3k  $0.0097      5    2 m 8 s
3. Implement the interactive command-line session  accepted         1  gpt-6-luna  265.6k (235.3k)   12.2k  277.8k  $0.0115      5   2 m 35 s
4. Document usage and verify end-to-end behavior   accepted         1  gpt-6-luna  352.6k (314.4k)   11.0k  363.6k  $0.0125      5   2 m 23 s
outside the plan                                   -                -  gpt-6-luna         3.6k (0)    2.1k    5.7k  $0.0014      2       26 s
TOTAL                                                                                  1.4M (1.2M)   64.6k    1.5M  $0.0616     32  14 m 22 s
```

So the whole of trace 2 and trace 4 has actually run: four steps, six attempts, 32 recorded model
calls, and two Orchestrator calls that belong to no step. That is the evidence base for the verdicts
below, and it is also why `CODE-REPORT.md`'s "the pipeline is dead" framing no longer applies.

## Traces

### Trace 1 — a model's `write_file` call

Entered from `SdkAgentInvoker.runOnce`, streaming on (the default, `sdk.constants.ts:4`). The
Developer path is shown; hop 7 happens only for QA.

| # | `file:line → function` | what the hop adds | label |
|---|---|---|---|
| 1 | `sdk/sdk-agent-invoker.ts:183` → `run(built.agent, inputText, {stream:true})` | hands the built agent to the vendor loop; the only place that happens | Isolates |
| 2 | *inside `@openai/agents`* | parses the model's tool call and dispatches it to the registered `execute` | Isolates |
| 3 | `sdk/agent-tool.adapter.ts:27` → the `execute` closure | catches anything that escapes and returns `Error: internal tool failure: …` (`:33`), so one bad tool call cannot kill a run | Enforces |
| 4 | `sdk/agent-tool.adapter.ts:28` → `AgentCallContext.countToolCall` (`sdk/agent-call.context.ts:31`) | the per-call tool counter that the reports and `agent_calls.toolCalls` are built from | Transforms |
| 5 | `sdk/agent-tool.adapter.ts:29` → `emitter?.toolCalled(…)` | **nothing on this path**: `sdk-agent-invoker.ts:83` passes `streaming ? null : emitter`, so `emitter` is `null` whenever streaming is on. Reachable only with `--no-stream` | Forwards |
| 6 | `sdk/agent-tool.adapter.ts:31` → `agentTool.execute(input)` | the `AgentTool` dispatch — ten implementations, so this is the polymorphic seam, but the hop itself adds nothing | Forwards |
| 7 | *(QA only)* `workspace/tools/role-scoped-write.tool.ts:32` → `RoleScopedWriteTool.execute` | re-resolves the path and applies `RoleWritePolicy` before the real tool runs | Enforces |
| 8 | `workspace/tools/write-file/write-file.tool.ts:29` → `WriteFileTool.execute` | the never-throw boundary: any throw from the validator **or the service** becomes `Error: <hint>` (`:31`), which is different text from hop 3 | Enforces |
| 9 | `workspace/tools/write-file/write-file.validator.ts:17-23` → `validate` → `writeFileSchema.safeParse` | rejects malformed arguments with the per-issue messages | Enforces |
| 10 | `write-file.validator.ts:26` → `WorkspaceService.resolveSafe` | — | *(call)* |
| 11 | `workspace/workspace.service.ts:48-54` | rejects empty paths and NUL bytes | Enforces |
| 12 | `workspace/workspace.service.ts:57` → `assertInside` (`:63`) | rejects anything resolving outside the root | Enforces |
| 13 | `workspace/workspace.service.ts:58` → `assertInside(await realpathOfNearestExisting(…))` (`:73`) | re-checks the realpath of the nearest existing ancestor, so a symlink cannot escape | Enforces |
| 14 | `workspace/workspace.service.ts:43` → `toRelative` | normalises to a POSIX workspace-relative path | Transforms |
| 15 | `workspace/security/path.policy.ts:64` → `denyWriteReason` | denies `.git`, `.env`, `node_modules` | Enforces |
| 16 | `write-file.validator.ts:36-41` | enforces `MAX_WRITE_CONTENT_BYTES` | Enforces |
| 17 | `write-file.validator.ts:43-56` → `lstat` → `WriteTarget` | reads the target's kind and mode without following the link | Transforms |
| 18 | `workspace/security/path.policy.ts:77` → `denyWriteTargetReason` | denies writing over a directory, a symlink or a non-regular file | Enforces |
| 19 | `write-file.validator.ts:63-70` | assembles `ValidatedWriteFileRequest`, masking the mode with `FILE_MODE_MASK` | Transforms |
| 20 | `workspace/tools/write-file/write-file.service.ts:14` → `WriteFileService.write` | destructures the validated request and does the work; it trusts its input because hops 9-19 are complete | Transforms |
| 21 | `write-file.service.ts:18` → `AtomicFileWriter.replace` (`workspace/io/atomic-file.writer.ts:9`) | temp-file-plus-rename, so a crashed or denied write cannot truncate the user's file | Enforces |
| 22 | `atomic-file.writer.ts:11` → `mkdir(dir, {recursive:true})` | creates missing parents | Transforms |
| 23 | `atomic-file.writer.ts:13` → `temporaryPath` (`:26`) | random hex suffix, so two concurrent writes cannot collide | Transforms |
| 24 | `atomic-file.writer.ts:15` → `writeFile(temporary, …)` | **the bytes reach the disk here**, in the temp file, mode `WRITE_FILE_MODE` | Transforms |
| 25 | `atomic-file.writer.ts:17` → `chmod` | restores the previous file's mode | Enforces |
| 26 | `atomic-file.writer.ts:19` → `rename` | **the bytes become the target file here**, atomically; `:21` unlinks the temp file on failure | Enforces |
| 27 | `write-file.service.ts:20` | derives `WriteOutcome` from `existingTarget === null` | Transforms |
| 28 | `write-file.service.ts:21-22` → `AgentCallStore.current()` (`workspace/activity/agent-call.store.ts:17`) | reads this call's `AsyncLocalStorage` frame; `undefined` outside a call, and then nothing is recorded | Enables |
| 29 | `workspace/activity/change-tracker.ts:10` → `ChangeTracker.record` | merges with an earlier change to the same path (create-then-delete cancels) and stamps a sequence from the shared clock | Transforms |
| 30 | `write-file.service.ts:28` → `WorkspaceMessages.writeResult` (`workspace/workspace.messages.ts:134`) | the one place the string the model sees is formatted | Transforms |
| — | returns up 8 → 6 → 3 → SDK | pure returns, no logic | — |

- **Hops: 30** on the QA path, **29** on the Developer path (which skips hop 7). One of them is
  inside the vendor SDK.
- **Files touched: 12** — `sdk-agent-invoker.ts`, `agent-tool.adapter.ts`, `agent-call.context.ts`,
  `write-file.tool.ts`, `write-file.validator.ts`, `workspace.service.ts`, `path.policy.ts`,
  `write-file.service.ts`, `atomic-file.writer.ts`, `agent-call.store.ts`, `change-tracker.ts`,
  `workspace.messages.ts`. Thirteen with `role-scoped-write.tool.ts` on the QA path.
- **Forwards hops: 2** — hop 5 and hop 6, both in `agent-tool.adapter.ts`.

**Has this changed since `CODE-REPORT.md` §B.1 measured 30 hops and 11 files?** No. The tool path is
hop-for-hop the same; wiring the pipeline changed nothing below the invoker. The only numbers that
move are the Forwards count and the file count, and both move because of how they are counted, not
because the code changed:

- §B.1 counted **4** Forwards; this report counts **2**. The two it dropped are hop 8
  (`WriteFileTool.execute`) and hop 20 (`WriteFileService.write`). Hop 8 is not a forward: its
  `catch` produces `Error: <hint>` while the only catch above it produces
  `Error: internal tool failure: <hint>` (`sdk/sdk.constants.ts:13`), and that applies to throws
  from the *service* as well as the validator — an `EACCES` out of `AtomicFileWriter` reaches the
  model as `Error: EACCES …` today, and would reach it as an internal failure without this hop.
  Hop 20's body destructures six fields and performs the write; it forwards nothing.
- §B.1 counted 11 files (13 with two more); this report counts 12 (13 with one more). The difference
  is that `workspace.messages.ts` is counted in the main list here, since hop 30 is a real call into
  it.

### Trace 2 — one plan step, entered to committed

One step, accepted on its first attempt, all four agents called. Hops that descend into one agent
call are marked `→ trace 3` and counted there, not here.

| # | `file:line → function` | what the hop adds | label |
|---|---|---|---|
| 1 | `execution/plan-executor.ts:259` → `PlanExecutor.stepContext` (`:590`) | `RunPlanStep` + position → `PlanStepContext` with `index`/`total` | Transforms |
| 2 | `plan-executor.ts:265-272` → `events.emit(StepStarted)` → `events/event-bus.ts:19` → `cli/event-printer.ts` | the terminal learns the step started without the executor knowing a terminal exists | Isolates |
| 3 | `plan-executor.ts:273-278` → `plans.updateStepStatus(InProgress)` | — | *(call)* |
| 4 | `db/repositories/plan.repository.ts:50` → `updateStepStatus` | resolves a plan position to its row (`runId_index`), maps `StepStatus` → the DB enum, and spreads only the fields that were passed | Transforms |
| 5 | `db/repositories/guarded.repository.ts:24` → `guardWrite` → `:11 guard` | a failed write becomes a logged warning, never a lost step | Enforces |
| 6 | `prisma.planStep.update` | — | Isolates |
| 7 | `plan-executor.ts:280` → `checkpoint.beginStep` (`execution/checkpoint/step-checkpoint.ts:56`) | reads `HEAD` as the commit this step is measured against | Transforms |
| 8 | `step-checkpoint.ts:57` → `git.headCommit()` | — | Isolates |
| 9 | `step-checkpoint.ts:58` → `workspace.setRunBaseRef(commit)` | makes that commit the default base of every `git_diff` and `changedFiles` call inside the step (`workspace/tools/git-diff/git-diff.validator.ts:49`) | Enables |
| 10 | `plan-executor.ts:284-292` → `stepRunner.run({runId, step, completedSteps, baseRef, signal, budget, caller})` | assembles the step's whole context in one object | Transforms |
| 11 | `execution/step-runner.ts:65-71` → `StepRunner.run` | owns the attempt loop and `MAX_STEP_ATTEMPTS` | Enforces |
| 12 | `step-runner.ts:72-79` → `emit(AttemptStarted)` | — | Isolates |
| 13 | `step-runner.ts:81` → `new AttemptState(attempt, now, budget.spent())` | per-attempt state, with the token mark it will subtract from later | Enables |
| 14 | `step-runner.ts:82` → `attempts.openAttempt` → `db/repositories/attempt.repository.ts:25` | one transaction: bumps `attemptsUsed` on the step and creates the `step_attempts` row, so every model call made next carries this attempt's id | Transforms |
| 15 | `step-runner.ts:87` → `runAttempt` (`:136`) | walks `STEP_AGENT_SEQUENCE` and stops the moment verification is skipped | Enforces |
| 16 | `step-runner.ts:146` → `runRole(role, …)` (`:153`) | a three-way `if` on the role; adds nothing else | **Forwards** |
| 17 | `step-runner.ts:173` → `DeveloperInputRenderer.render({…7 fields})` | — | *(call)* |
| 18 | `agents/context/developer-input.renderer.ts:16` → `render` → `InputSectionRenderer.step` / `criteria` / `completedSteps` / `changedCode` | code, not the model, decides what the Developer is told; the attempt number and the rework brief are code-built | Transforms |
| 19 | `step-runner.ts:182` → `this.invoke<DeveloperResult>` (`:352`) | turns a recoverable call failure (out of turns, token cap, invalid output) into a rework note instead of a dead run, via `AgentFailurePolicy.reworkNote` | Enforces |
| 20 | `step-runner.ts:359` → `context.caller.agent(role, input, StepRunner.scopeOf(…))` | → trace 3 | *(call)* |
| 21 | `step-runner.ts:191` → `DeveloperReportBuilder.build(output, changes, usage, toolCalls, durationMs)` | computes `filesChanged`/`filesCreated`/… from the recorded changes and, at `developer-report.builder.ts:48`, the discrepancies between what the Developer claimed and what it actually touched | Transforms |
| 22 | `step-runner.ts:199` → `git.changedFiles(context.baseRef)` | git, not the Developer, says what changed | Enforces |
| 23 | `step-runner.ts:202-208` → `state.skipVerification(…)` | an attempt that changed no file never reaches QA, the Reviewer or a decision | Enforces |
| 24 | `step-runner.ts:216` → `brief(context, state)` (`:276-279`) | skips the optional Brief call when the budget cannot spare `OPTIONAL_CALL_TOKEN_RESERVE` | Enforces |
| 25 | `step-runner.ts:280` → `BriefInputRenderer.render` | — | Transforms |
| 26 | `step-runner.ts:285` → `caller.orchestrator(Brief, …)` | → trace 3 | *(call)* |
| 27 | `step-runner.ts:218` → `QaInputRenderer.render({…8 fields})` | includes the Developer notes **as claims** and the git-derived changed code as the authority | Transforms |
| 28 | `step-runner.ts:228` → `invoke<QaResult>(Qa, …)` | → trace 3 | *(call)* |
| 29 | `step-runner.ts:233` → `git.changedFiles(context.baseRef)` again | the review scope now includes the tests QA wrote | Transforms |
| 30 | `step-runner.ts:242` → `testDiffs.collect(baseRef, reviewScope)` | the added lines of the test files, for the scope and freshness checks | Transforms |
| 31 | `step-runner.ts:234` → `QaReportBuilder.build(…8 args)` | pass/fail, coverage, freshness and scope computed from `CommandRunRecorder` facts and the diff, never from what QA claimed | Enforces |
| 32 | `step-runner.ts:251` → `ReviewInputRenderer.render` (which calls `QaReportFormatter.format`) | the Reviewer is shown the **computed** QA facts, not QA's prose | Transforms |
| 33 | `step-runner.ts:261` → `invoke<ReviewResult>(Reviewer, …)` | → trace 3 | *(call)* |
| 34 | `step-runner.ts:265` → `ReviewReportBuilder.build(…)` | the verdict from `BLOCKING_SEVERITIES` and the list of changed source files the Reviewer never read (`review-report.builder.ts:36`) | Enforces |
| 35 | `step-runner.ts:149` → `decide(…)` → `:304` `DecisionInputRenderer.render` | the Orchestrator sees the three formatted reports and the previous attempts' decisions | Transforms |
| 36 | `step-runner.ts:313` → `caller.orchestrator(Decide, …)` | → trace 3 | *(call)* |
| 37 | `step-runner.ts:318` → `DecisionGuard.apply(output, qaReport, reviewReport, attempt, max)` | overrides the model: accept with blocking facts becomes rework, rework with nothing to rework becomes abort, and the last attempt cannot rework (`decision.guard.ts:27-42`) | Enforces |
| 38 | `step-runner.ts:327-347` → `emit(DecisionMade)` and, when overridden, `emit(DecisionOverridden)` | the override is reported, never silent | Isolates |
| 39 | `step-runner.ts:89` → `state.outcome(budget.spent())` (`attempt-state.ts:40`) | the attempt's tokens as `now − before`, and its duration | Transforms |
| 40 | `step-runner.ts:91` → `persist(state, outcome)` (`:373`) | an attempt whose row could not be opened still runs and still reports; only its stored copy is missing | Enforces |
| 41 | `attempt.repository.ts:46` → `completeAttempt` | one transaction: sums the tokens and cost **from the `agent_calls` rows carrying this attempt's id** and writes them with the three reports and the guard outcome | Transforms |
| 42 | `step-runner.ts:100-101` → `guarded.effective === Accept` → `StepRunner.accepted(…)` | the step result is derived from the guarded decision, not the model's | Transforms |
| 43 | `plan-executor.ts:294-303` → `result.accepted` → `acceptStep(…)` | a step that is not accepted fails the run and skips the rest; later steps build on it | Enforces |
| 44 | `plan-executor.ts:315` → `checkpoint.commitStep({runId, index, total, title}, result.summary)` | — | Transforms |
| 45 | `step-checkpoint.ts:66` → `commitStep` → `CommitMessageBuilder.step` (`commit-message.builder.ts:30`) | subject, body and the `plan step n of m` / run footer | Transforms |
| 46 | `step-checkpoint.ts:67` → `this.commit(message)` (`:82`) → `stage()` (`:99`) | — | Transforms |
| 47 | `step-checkpoint.ts:100` → `git.stageAll(ENV_STAGE_EXCLUDES)` | `.env` is never staged, whatever the agents wrote | Enforces |
| 48 | `step-checkpoint.ts:101-103` → `exists('.env.example')` → `git.stagePath` | the example file is staged back explicitly | Enforces |
| 49 | `step-checkpoint.ts:84` → `commitStaged` (`:92`) → `git.hasStagedChanges()` | returns `null` instead of making an empty commit, so "nothing to commit" is recorded as such | Enforces |
| 50 | `step-checkpoint.ts:128` → `identity()` → `git.identity() ?? AGENT_GIT_IDENTITY` | the user's identity when the workspace has one, the agent identity only for this commit otherwise | Enforces |
| 51 | `step-checkpoint.ts:96` → `git.commit(message, identity)` (`workspace/git/git.service.ts:231`) | — | *(call)* |
| 52 | `git.service.ts:271` → `run([...])` → `:289 execute` → `execFile(GIT_BINARY, [...GIT_BASE_ARGS, ...args])` | the only process in the program that spawns git, with an argument array and no shell | Isolates |
| 53 | `git.service.ts:439` → `childEnvironment()` | the child gets no secrets from this process's env | Enforces |
| 54 | `git.service.ts:277-284` | exit-code check → `GitError.timedOut` / `unavailable` / `fromStderr`, so a git failure is a typed error, not a string | Enforces |
| 55 | `plan-executor.ts:319-327` → `plans.updateStepStatus(Accepted, attempts, summary, commitSha)` | — | Transforms |
| 56 | `plan-executor.ts:328-338` → `state.addStep({…})` (`run-state.ts:28`) | derives `completedSteps` (what later steps are told) and collects the deferred issues | Transforms |
| 57 | `plan-executor.ts:339-346` → `emit(StepAccepted)` | — | Isolates |

- **Hops: 57** for one accepted single-attempt step, excluding everything inside the four agent
  calls.
- **Files touched: 29** — `plan-executor.ts`, `step-runner.ts`, `attempt-state.ts`,
  `attempt-carry.ts`, `run-state.ts`, `run-budget.ts`, `step-checkpoint.ts`,
  `commit-message.builder.ts`, `git.service.ts`, `git.error.ts`, `workspace.service.ts`,
  `event-bus.ts`, `event-printer.ts`, `plan.repository.ts`, `attempt.repository.ts`,
  `guarded.repository.ts`, `prisma.service.ts`, `developer-input.renderer.ts`,
  `qa-input.renderer.ts`, `review-input.renderer.ts`, `brief-input.renderer.ts`,
  `decision-input.renderer.ts`, `input-section.renderer.ts`, `developer-report.builder.ts`,
  `qa-report.builder.ts`, `qa-report.formatter.ts`, `review-report.builder.ts`,
  `decision.guard.ts`, `test-file-diff.collector.ts`.
- **Forwards hops: 1** — hop 16, `StepRunner.runRole`.

This is the densest trace in the codebase and the one with the fewest pass-throughs: 56 of 57 hops
either compute a fact, deny something, or cross a boundary.

### Trace 3 — one agent call, asked to parsed output

| # | `file:line → function` | what the hop adds | label |
|---|---|---|---|
| 1 | `execution/step-runner.ts:409` → `StepRunner.scopeOf` | `{stepIndex, attempt, attemptId}` — where this call belongs | Transforms |
| 2 | `step-runner.ts:359` → `context.caller.agent(role, input, scope)` | — | *(call)* |
| 3 | `execution/agents/agent-call.runner.ts:32` → `AgentCallRunner.agent` | `return this.call(role, null, inputText, scope)` — adds the `null` task | **Forwards** |
| 4 | `agent-call.runner.ts:48-62` → `call` | retries exactly once, and only on `InvalidOutput`: a schema failure is retried, a transport failure is not | Enforces |
| 5 | `agent-call.runner.ts:65-76` → `invokeOnce` → `origin` | `{role, task, stepIndex, attempt}` for every event this call emits | Transforms |
| 6 | `agent-call.runner.ts:77` → `assertRunnable` (`:200`) | refuses a call on an aborted run and when the budget has no `REQUIRED_CALL_TOKEN_RESERVE` left | Enforces |
| 7 | `agent-call.runner.ts:80` → `budget.callCap()` (`budget/run-budget.ts:30`) | `min(MAX_TOKENS_PER_AGENT_CALL, remaining)` — what this one call may spend | Enforces |
| 8 | `agent-call.runner.ts:81-86` → `emit(AgentStarted)` | — | Isolates |
| 9 | `agent-call.runner.ts:88-93` → `invokers.forScope({runId, attemptId, stepIndex, attempt})` | re-assembles the scope as the port's `InvokerScope`, which is declared in `execution/` so the core keeps no dependency on `src/sdk` | Transforms |
| 10 | `sdk/sdk-invoker.factory.ts:28-30` → `SdkInvokerFactory.forScope` | `return this.create(scope, { lifecycleEvents: false })` | **Forwards** |
| 11 | `sdk/sdk-invoker.factory.ts:32-42` → `create` | turns five injected singletons plus a per-unit scope into a fresh invoker; a singleton invoker could not carry the scope | Enables |
| 12 | `agent-call.runner.ts:98` → `invoker.invokeAgent(role, inputText, this.signal, tokenCap)` | the `AgentInvoker` port: two implementations today, SDK and canned | Isolates |
| 13 | `sdk/sdk-agent-invoker.ts:50-57` → `invokeAgent` | `return this.invoke({ role, task: null }, …)` | **Forwards** |
| 14 | `sdk/sdk-agent-invoker.ts:79` → `bootstrap.ensureReady()` (`sdk/sdk.bootstrap.ts:16`) | validates the environment on first use, hands the key to the SDK, turns provider-side tracing **off**, and reports the models once | Enforces |
| 15 | `sdk/sdk-agent-invoker.ts:80` → `new AgentCallContext(role, task)` (`sdk/agent-call.context.ts:19-29`) | this call's four recorders over one shared `ActivityClock`, so command runs and file changes sort on one timeline | Enables |
| 16 | `sdk/sdk-agent-invoker.ts:81` → `new CallEventEmitter(events, scope, target)` | — | Transforms |
| 17 | `sdk/sdk-agent-invoker.ts:83` → `this.build(target, context, model, streaming ? null : emitter)` (`:140-157`) | picks `buildAgent` vs `buildOrchestrator` on `target.task === null` and passes `this.options.maxTurns` through | **Forwards** |
| 18 | `sdk/agent.factory.ts:29-30` → `AgentFactory.buildAgent` → `AGENT_DEFINITIONS[role]` | — | Transforms |
| 19 | `sdk/agent.factory.ts:31` → `AgentDefinitionRenderer.instructions(definition)` | data → one deterministic instruction string, which is what hop 39 can hash | Transforms |
| 20 | `sdk/agent.factory.ts:37-41` → `adapt(registry.forRole(role), context, emitter)` (`:83`) | — | Transforms |
| 21 | `workspace/tools/file-tool.registry.ts:71-77` → `forRole` | resolves the role's named tools and wraps the write tools in `RoleScopedWriteTool` when the role has write rules | Enforces |
| 22 | `sdk/agent.factory.ts:88` → `AgentToolAdapter.toSdkTool(tool, context, emitter)` | the only place that knows the vendor's tool shape | Isolates |
| 23 | `sdk/agent.factory.ts:42` → `AgentOutputRegistry.forRole(role)` (`sdk/agent-output.registry.ts:29`) | the zod schema the SDK validates the answer against, so a broken answer never reaches a report builder | Transforms |
| 24 | `sdk/agent.factory.ts:32-43` → `new Agent({name, instructions, model, modelSettings, tools, outputType})` | `modelSettings` is `{store:false}` — private source code is never stored on the provider | Isolates |
| 25 | `sdk/agent.factory.ts:45-50` → returns `BuiltAgent` | keeps `instructions`, `model` and the resolved `maxTurns` beside the agent | Transforms |
| 26 | `sdk/sdk-agent-invoker.ts:84` → `new CallTokenCap(tokenCap, signal)` (`sdk/call-token.cap.ts:21-26`) | combines the run signal with a cap-owned controller, so an overspending call aborts itself without cancelling the run | Enforces |
| 27 | `sdk/sdk-agent-invoker.ts:85` → `new UsageTally()` | the mutable cell both the success path (`:96`) and the `catch` (`:122`) read, so a stream that failed halfway still reports what it spent | Enables |
| 28 | `sdk/sdk-agent-invoker.ts:88-90` → `if (lifecycle) emitter.agentStarted()` | **skipped on this path**: the factory passes `lifecycleEvents: false` because `AgentCallRunner` already emits these. Taken on the `team agent` path | Forwards |
| 29 | `sdk/sdk-agent-invoker.ts:93-95` → `store.run(context.recorders, () => runOnce(…))` | opens the frame the singleton tool services read in trace 1 hop 28 | Enables |
| 30 | `workspace/activity/agent-call.store.ts:13-15` → `AgentCallStore.run` | `return this.storage.run(recorders, operation)` | **Forwards** |
| 31 | `sdk/sdk-agent-invoker.ts:183-187` → `run(built.agent, inputText, {maxTurns, signal, stream:true})` | — | Isolates |
| 32 | `sdk/sdk-agent-invoker.ts:190` → `StreamEventMapper.forward(event, emitter)` | vendor stream events → our four event kinds; this is where `tool_called` really comes from | Transforms |
| 33 | `sdk/sdk-agent-invoker.ts:191` → `cap.check(stream)` (`call-token.cap.ts:30-37`) | aborts mid-stream the first time the call passes its cap, instead of paying for the whole call | Enforces |
| 34 | `sdk/sdk-agent-invoker.ts:193-194` → `await stream.completed` → `cap.throwIfAborted()` | a call that went over its cap never passes as a completed answer | Enforces |
| 35 | `sdk/sdk-agent-invoker.ts:197` → `tally.add(UsageReader.read(stream))` in a `finally` | counted even when the stream failed halfway | Transforms |
| 36 | `sdk/usage.reader.ts:14-30` → `UsageReader.read` | the only thing that knows the vendor's usage shape; a missing field counts as 0 and warns once instead of crashing a run | Isolates |
| 37 | `sdk/sdk-agent-invoker.ts:200` → `stream.finalOutput` | the structured output, already validated against hop 23's schema | Isolates |
| 38 | `sdk/sdk-agent-invoker.ts:96` → `tally.snapshot()` | — | Transforms |
| 39 | `sdk/sdk-agent-invoker.ts:101` → `this.record(…)` (`:204`) | → trace 4 | *(call)* |
| 40 | `sdk/sdk-agent-invoker.ts:106-114` → returns `AgentInvocation` | output plus every fact the recorders collected — the only numbers the executor will ever report | Transforms |
| 41 | `sdk/agent-call.context.ts:40`, `:44`, `:48` → `changes()` / `commandRuns()` / `readPaths()` | each is one line: `this.recorders.X.snapshot()` | **Forwards ×3** |
| 42 | `agent-call.runner.ts:100-107` → `this.account(…)` (`:134-158`) | builds the `AgentCallRecord` the in-memory ledger and the report are made of | Transforms |
| 43 | `execution/agents/agent-call.ledger.ts:11-13` → `ledger.record` | — | Transforms |
| 44 | `agent-call.runner.ts:166-184` → `emit(TokensUsed)` and `emit(AgentFinished)` | emitted here, not in the invoker, so they read the same whichever invoker ran the call | Isolates |
| 45 | `agent-call.runner.ts:186-188` → `budget.charge(usage)` (`run-budget.ts:16-25`) | charges first and refuses second, so the call that exhausts the budget is still counted | Enforces |
| 46 | `agent-call.runner.ts:189-196` → `emit(BudgetUpdated)` in a `finally` | the budget line is printed even when the charge threw | Isolates |
| — | returns to `step-runner.ts:359` | — | — |

- **Hops: 48** (46 rows, with hop 41 counting as three).
- **Files touched: 23** — `step-runner.ts`, `agent-call.runner.ts`, `agent-call.ledger.ts`,
  `run-budget.ts`, `event-bus.ts`, `sdk-invoker.factory.ts`, `sdk-agent-invoker.ts`,
  `sdk.bootstrap.ts`, `agent-call.context.ts`, `call-event.emitter.ts`, `call-token.cap.ts`,
  `agent.factory.ts`, `agent-definition.renderer.ts`, `agent-definitions.constants.ts`,
  `agent-output.registry.ts`, `agent-tool.adapter.ts`, `file-tool.registry.ts`,
  `role-scoped-write.tool.ts`, `stream-event.mapper.ts`, `usage.tally.ts`, `usage.reader.ts`,
  `agent-call.store.ts`, `agent-call.repository.ts`.
- **Forwards hops: 9** — hops 3, 10, 13, 17, 28, 30 and the three of hop 41. This is where every
  pass-through in the codebase is concentrated: **9 of the 15 Forwards hops in all four traces are
  in this one trace**, and six of them are in the four files between `StepRunner` and the vendor
  `run()` call.

### Trace 4 — one recorded model call, from SDK usage to the printed number

| # | `file:line → function` | what the hop adds | label |
|---|---|---|---|
| 1 | `sdk/sdk-agent-invoker.ts:197` → `UsageReader.read(stream)` | — | Isolates |
| 2 | `sdk/usage.reader.ts:32-40` → `usageOf` | `runContext.usage` for a finished run, `usage` for one that failed before its first request — two vendor shapes, one result | Transforms |
| 3 | `sdk/usage.reader.ts:67-74` → `numberAt` ×3 | a non-number counts as 0 and warns once: accounting degrades, it never crashes a run | Enforces |
| 4 | `sdk/usage.reader.ts:42-55` → `cachedOf` | reads `cached_tokens` or `cachedTokens`, from an object or an array | Transforms |
| 5 | `sdk/usage.reader.ts:28` | `total` falls back to `input + output` when the vendor omits it | Transforms |
| 6 | `sdk/usage.tally.ts:13-18` → `add` | — | Transforms |
| 7 | `sdk/sdk-agent-invoker.ts:96` → `tally.snapshot()` | — | Transforms |
| 8 | `sdk/sdk-agent-invoker.ts:101` → `this.record(…)` (`:204-233`) | the whole write is inside a `try`/`catch` that only logs: the work is already done when this runs, so a broken database never fails a paid call | Enforces |
| 9 | `sdk/sdk-agent-invoker.ts:225` → `hashOf(built.instructions)` (`:239`) | sha256 of the exact prompt, stored on the row, so prompt drift between runs is visible afterwards | Transforms |
| 10 | `sdk/sdk-agent-invoker.ts:213-226` → `calls.record(NewAgentCall)` | — | *(call)* |
| 11 | `db/repositories/agent-call.repository.ts:45` → `prices.byModels([model])` → `model-price.repository.ts:30-39` | the price comes from the `model_prices` table, never from code | Isolates |
| 12 | `db/repositories/agent-call.repository.ts:46` → `CostCalculator.calculate(call, price)` (`db/prices/cost.calculator.ts:12-25`) | the one place a cost is computed: cached tokens are a subset of input and are subtracted from the uncached ones; everything stays `Prisma.Decimal` | Transforms |
| 13 | `agent-call.repository.ts:47` → `warnOnce(runId, model)` (`:207`) | an unpriced model is reported once per run, not once per call | Enforces |
| 14 | `agent-call.repository.ts:48` | `totalTokens = input + output` — cached input is not double-counted | Transforms |
| 15 | `agent-call.repository.ts:50` → `this.guard('record the agent call', …)` → `guarded.repository.ts:11-22` | a failed insert becomes a warning the caller surfaces; the call's work is not lost | Enforces |
| 16 | `agent-call.repository.ts:51-76` → `prisma.agentCall.create({data, select:{id}})` | the only writer of this table | Isolates |
| 17 | `agent-call.repository.ts:55` → `AGENT_ROLE_TO_DB[call.role]` | code enum → DB enum, mapped explicitly so renaming one cannot silently change the other | Transforms |
| 18 | `agent-call.repository.ts:62` → `costUsd.toDecimalPlaces(COST_SCALE)` | money is written as `Decimal` at a fixed scale, never as a float | Enforces |
| 19 | `agent-call.repository.ts:65-69` | a failed call is still written, with `status = error` and its `failureKind` | Transforms |
| 20 | `agent-call.repository.ts:78-82` → returns `{id, costUsd: toNumber(), warning}` | the only place the money becomes a number, at the edge | Transforms |
| 21 | `sdk/sdk-agent-invoker.ts:227-229` → `logger.warn(recorded.warning)` | — | Isolates |
| 22 | `main.ts:7` → `CommandFactory.run(AppModule, …)` → *nest-commander* → `cli/usage.command.ts:37` | the framework builds the container and dispatches `usage` on the `@Command` decorator | Enables |
| 23 | `cli/usage.command.ts:38` → `dimensionOf(options.by)` (`:161`) | an unknown `--by` prints one line and exits 1 instead of querying | Enforces |
| 24 | `cli/usage.command.ts:43` → `this.ensureDatabase()` → `cli/database.command.ts:11-13` | `await this.bootstrap.ensureReady()` | **Forwards** |
| 25 | `db/database.bootstrap.ts:21-32` → `ensureReady` | applies pending migrations, proves the connection, seeds the prices when the table is empty, and exits with "Run: npm run db:up" when it cannot | Enforces |
| 26 | `cli/usage.command.ts:45-48` → `runs.latest()` / `runs.byIdOrPrefix(options.run)` | a short run id resolves to the full row | Transforms |
| 27 | `cli/usage.command.ts:58` → `calls.usageTotals({runId})` → `agent-call.repository.ts:175-205` | `aggregate` plus a `distinct` model list — the totals row is one query, not a sum of the printed rows | Transforms |
| 28 | `cli/usage.command.ts:59` → `prices.missing(totals.models)` (`model-price.repository.ts:41-45`) | which models in this run have no price, for the footer | Transforms |
| 29 | `cli/usage.command.ts:60` → `rowsOf(runId, dimension)` (`:108-119`) | a three-way `if` to `usageByStep` / `usageByModel` / `usageByRun` | **Forwards** |
| 30 | `agent-call.repository.ts:147-152` → `usageByStep` → `prisma.planStep.findMany({include:{attempts:{include:{agentCalls:true}}}})` | — | Isolates |
| 31 | `agent-call.repository.ts:158` → `totalsOf(step.attempts.flatMap(a => a.agentCalls))` (`:220-235`) | per-step sums, with the cost summed as `Decimal` and only then `toNumber()` | Transforms |
| 32 | `agent-call.repository.ts:161-170` | the extra `attemptId: null` row, labelled "outside the plan", so the rows always add up to the run total — visible in the real output above | Enforces |
| 33 | `cli/usage.command.ts:121-133` → `table(dimension, rows, totals)` | a three-way `if` to `UsageFormatter.byStep` / `byModel` / `byAgent` | **Forwards** |
| 34 | `cli/usage.formatter.ts:56-67` → `byStep` | rows → cells, plus the `TOTAL` row | Transforms |
| 35 | `cli/usage.formatter.ts` → `numbers(row)` → `CompactNumberFormatter.format`, `MoneyFormatter.usd`, `DurationFormatter.format` | `618.0k (546.6k)`, `$0.0266`, `6 m 51 s` | Transforms |
| 36 | `cli/table.renderer.ts:10-27` → `TableRenderer.render(STEP_USAGE_COLUMNS, body)` | one plain-text table shape for every command; numeric columns right-aligned | Transforms |
| 37 | `cli/usage.command.ts:66-72` → `console.log` | — | Isolates |

- **Hops: 37** — 21 on the write side, 16 on the read side.
- **Files touched: 23** — `usage.reader.ts`, `usage.tally.ts`, `sdk-agent-invoker.ts`,
  `agent-call.repository.ts`, `model-price.repository.ts`, `cost.calculator.ts`,
  `guarded.repository.ts`, `prisma.service.ts`, `db.constants.ts`, `db.messages.ts`, `main.ts`,
  `usage.command.ts`, `database.command.ts`, `database.bootstrap.ts`, `migration.runner.ts`,
  `model-price.seeder.ts`, `run.repository.ts`, `usage.formatter.ts`,
  `compact-number.formatter.ts`, `money.formatter.ts`, `duration.formatter.ts`,
  `table.renderer.ts`, `run-id.formatter.ts`.
- **Forwards hops: 3** — hops 24, 29, 33. All three are one-line dispatches inside a class, not
  layers between classes.

## Hop census

Counted label by label from the four tables above.

| label | trace 1 | trace 2 | trace 3 | trace 4 | total | share |
|---|---|---|---|---|---|---|
| **Transforms** | 11 | 21 | 15 | 18 | **65** | 38% |
| **Enforces** | 13 | 18 | 9 | 8 | **48** | 28% |
| **Isolates** | 2 | 7 | 9 | 6 | **24** | 14% |
| **Enables** | 1 | 2 | 4 | 1 | **8** | 5% |
| **Forwards** | 2 | 1 | 9 | 3 | **15** | 9% |
| *(call rows — the hop is labelled at its destination)* | 1 | 8 | 2 | 1 | **12** | 7% |
| **total hops** | **30** | **57** | **48** | **37** | **172** | |

The `call` rows are the hops where one function hands off to the next and the work happens on the
other side: they are listed so the traces read continuously, and labelled where they land. Trace 2
has eight of them because four of its hops descend into a whole agent call, counted in trace 3.

Two things stand out.

**Forwards hops are 9% of the total and two thirds of them sit in one place.** Nine of the fifteen
are in trace 3, between `StepRunner` asking for an agent and the vendor `run()` call — six of those
nine in four files (`agent-call.runner.ts`, `sdk-invoker.factory.ts`, `sdk-agent-invoker.ts`,
`agent-call.store.ts`) and three in `agent-call.context.ts`. Nowhere else in the codebase has more
than three.

**No layer is made entirely of Forwards hops.** Every class on these four paths has at least one hop
that transforms, enforces, isolates or enables. That is the central finding of this audit: there is
no suspect *layer* here, only a handful of suspect *hops* inside layers that otherwise earn
themselves. The closest thing to a pass-through layer is the pair `AgentCallRunner.agent` /
`SdkAgentInvoker.invokeAgent` — two one-line methods that both exist to turn one public shape into
one private one — and each of those classes does real work in the method they forward to.

## Suspect layers

Each layer whose hops are Forwards, or where the task asked for a verdict.

### 1. `AgentCallContext.changes()` / `commandRuns()` / `readPaths()` — trace 3 hop 41

1. **Implementations:** one; no second is conceivable — it is three one-line reads of
   `this.recorders`.
2. **Consumers:** one file. All five call sites are in `sdk-agent-invoker.ts` (`:111`, `:112`,
   `:113`, and `changes`/`commandRuns` again at `:133`).
3. **What breaks if callers go through directly?** Nothing. `AgentCallContext.recorders` is already
   `readonly` **public** (`agent-call.context.ts:16`), and
   `sdk-agent-invoker.ts:93` already reads it directly (`this.store.run(context.recorders, …)`).
   `context.changes()` becomes `context.recorders.changes.snapshot()`.
4. **Cost of removal:** 0 files, 9 lines, 5 call sites in 1 file. **3 hops.**

**Verdict: Remove.** Replaced by the public `recorders` field the same class already exposes and the
same file already uses.

### 2. `SdkAgentInvoker.build` — trace 3 hop 17

1. **Implementations:** one. A second is not plausible: picking between two factory methods on
   `target.task === null` is the only thing it does.
2. **Consumers:** one call site, `sdk-agent-invoker.ts:83`.
3. **What breaks if the caller goes through directly?** Nothing, provided the branch moves into
   `AgentFactory`. Today `AgentFactory` has `buildAgent` (`agent.factory.ts:29`) and
   `buildOrchestrator` (`:53`); a single `AgentFactory.build(target, context, model, maxTurns,
   emitter)` holding the `task === null` branch would absorb it. The one datum `build` adds is
   `this.options.maxTurns`, which the caller already has in scope. The `role as DefinedAgentRole`
   cast at `:149` moves with the branch.
4. **Cost of removal:** 0 files (both classes stay), ~18 lines moved, 1 call site changed plus one
   new method on `AgentFactory`. **1 hop.**

**Verdict: Remove.** Replaced by one `AgentFactory.build`. Note this is a *merge of a branch*, not a
removal of the factory: `AgentFactory` itself earns its place (see below).

### 3. `StepRunner.runRole` — trace 2 hop 16

1. **Implementations:** one; a second is not plausible.
2. **Consumers:** one call site, `step-runner.ts:146`.
3. **What breaks if the caller goes through directly?** Nothing. `runAttempt` (`:136-151`) already
   owns the `STEP_AGENT_SEQUENCE` loop and the `verificationSkipped` check; moving the three-way
   `if` into that loop removes the hop. `STEP_AGENT_SEQUENCE` stays as the single statement of the
   order.
4. **Cost of removal:** 0 files, 13 lines, 1 call site. **1 hop.**

**Verdict: Remove.** Replaced by the three-way `if` inlined into `runAttempt`'s loop.

### 4. `AgentCallStore.run` / `.current()` over `AsyncLocalStorage` — trace 1 hop 28, trace 3 hop 30

1. **Implementations:** one. A second is plausible in principle (a test double that returns a fixed
   recorder set) but there are no tests.
2. **Consumers:** **seven** — six tool services read `current()`
   (`write-file.service.ts:22`, `edit-file.service.ts:25`, `delete-file.service.ts:16`,
   `read-file.service.ts:21,43`, `search-code.service.ts:37`, `run-command.service.ts:55`) and
   `sdk-agent-invoker.ts:93` calls `run()`. It is also a DI token in `workspace.module.ts:43`.
3. **What breaks if callers go through directly?** The tool services are **singletons**; they have
   no other way to see the recorders of the call that is running. Removing the class and importing a
   module-level `AsyncLocalStorage` would work but would make a singleton's per-call state a module
   global rather than an injected dependency, and would remove the `@Injectable` seam that lets
   `workspace.module.ts` provide it. The alternative — threading `CallRecorders` through every tool
   method signature — changes nine `execute`/`validate`/service signatures and the `AgentTool`
   interface (`agents/agent-tool.types.ts:9`).
4. **Cost of removal:** 1 file, 20 lines, 7 call sites — but it buys nothing and costs the DI seam.

**Verdict: Thin but keep.** Both of its methods are one-line delegations, so it is exactly two
Forwards hops — and those two hops are the mechanism that lets a singleton see per-call state. The
hop is the point.

### 5. `SdkInvokerFactory` and the `AgentInvokerFactory` port — trace 3 hops 9-12

1. **Implementations:** `AgentInvokerFactory` has **two** — `SdkInvokerFactory`
   (`sdk-invoker.factory.ts:17`) and `CannedAgentInvoker`
   (`execution/agents/canned-agent-invoker.ts:61`, which implements both the factory and the
   invoker). `AgentInvoker` has two: `SdkAgentInvoker` and `CannedAgentInvoker`. A third is
   plausible: a replay or record invoker.
2. **Consumers:** two, using two different methods — `AgentCallRunner.invokeOnce:88` calls
   `forScope` (the port), and `AgentCommand.runAgent:113` calls `create` directly with
   `{streaming, maxTurns}` from the CLI flags.
3. **What breaks if callers construct `SdkAgentInvoker` themselves?** `team run --dry-run` breaks:
   `run.command.ts:164-166` passes `this.canned` into `PlanExecutor.execute`, and the executor can
   only accept it because its dependency is the port (`plan-executor.ts:74,83`). Name and symbol:
   `PlanExecutor.execute`'s second parameter, typed `AgentInvokerFactory`. The whole no-cost dry-run
   path exists because of this port. Separately, `AgentCallRunner` would have to construct an
   invoker from five singletons it does not hold.
4. **Cost of removal:** 2 files, ~60 lines, 2 call sites — and the dry run.

**Verdict: Earns it.** `forScope` (hop 10) is one Forwards hop, and it is the port method itself:
the one line is where the default `lifecycleEvents: false` is applied so the executor's own events
are not emitted twice. `create` (hop 11) is a construction seam, not a forward.

### 6. The overlap between `CallScope`, `InvokerScope` and `AgentCallScope`

1. **Implementations:** three structurally near-identical types. `CallScope`
   (`sdk/call-scope.types.ts:6`) and `InvokerScope`
   (`execution/agents/agent-invoker-factory.port.types.ts:5`) are *identical*: `runId` plus three
   optional nullable fields. `AgentCallScope` (`execution/agents/agent-invocation.types.ts:31`) is
   the same three fields without `runId` and with all three required. `AgentCallRecord.stepIndex` /
   `.attempt` (`execution/execution.types.ts:39-40`) repeat two of them again.
2. **Consumers:** `AgentCallScope` is built in `StepRunner.scopeOf:409` and consumed by
   `AgentCallRunner`; `InvokerScope` is the port's parameter; `CallScope` is the invoker's
   constructor field.
3. **What breaks if they become one type?** The `src/sdk` boundary. `InvokerScope`'s own comment
   says why it exists: *"Declared here, not imported from src/sdk, so the execution core keeps no
   dependency on the SDK layer."* Unifying `CallScope` and `InvokerScope` means one of the two
   folders importing a type from the other. `AgentCallScope` and `InvokerScope`, though, are **both
   in `src/execution/agents/`** and could be one type with `runId` optional — nothing would break.
4. **Cost of removal:** 0 hops. Hop 9 (`invokers.forScope({runId, attemptId, stepIndex, attempt})`)
   re-assembles the object field by field, and it would still have to add `runId`, which
   `AgentCallScope` deliberately does not carry.

**Verdict: Thin but keep**, and this is **not a layer problem** — unifying the types removes zero
hops. Listed again under *Not a layer problem*.

### 7. `AgentCallRunner`

1. **Implementations:** one; it is a concrete per-run collaborator, not a port.
2. **Consumers:** two — `PlanExecutor` constructs it (`plan-executor.ts:95`) and both
   `PlanExecutor` and `StepRunner` call it through `StepRunContext.caller`.
3. **What breaks if callers call the invoker directly?** Five guarantees, each nameable: the abort
   and budget check before a call (`assertRunnable:200`), the per-call cap (`budget.callCap:80`),
   the single retry on `InvalidOutput` only (`isRetryable:207`), the charge-then-refuse accounting
   (`budget.charge:187` inside a `try`/`finally` that still emits `BudgetUpdated`), and the fact
   that `AgentStarted` / `TokensUsed` / `AgentFinished` are emitted in exactly one place so they
   read the same for the SDK and the canned invoker. `PlanExecutor` and `StepRunner` would each
   have to repeat all five.
4. **Cost of removal:** 1 file, 210 lines, and the five guarantees.

**Verdict: Earns it.** Of its 8 hops in trace 3, one is Forwards (`agent`, hop 3) and that one is
its public two-entry-point API.

### 8. `AgentCallLedger`

1. **Implementations:** one.
2. **Consumers:** two — `AgentCallRunner.account:163` writes it, `RunReportBuilder` reads it
   (`run-report.builder.ts:82,111`), and `PlanExecutor.finish:462,492` passes and reads it.
3. **What breaks if it goes?** The final report would have to be built from the database instead of
   from memory, which means the report of a run that could not write its rows (every write below the
   run row is guarded, by design) would silently lose calls. Name and symbol:
   `RunReportBuilder.build(request, state, ledger, budget)` and `AgentCallLedger.tokensTotal()`,
   which is what `RunOutcome.tokensTotal` is (`plan-executor.ts:492`).
4. **Cost of removal:** 1 file, 38 lines, 4 call sites — and the in-memory/stored split that makes
   the report independent of the database.

**Verdict: Earns it.** It is a typed collection with five aggregations (`ofRole`, `ofStep`,
`tokensTotal`, `toolCalls`, `commandRuns`), not a hop.

### 9. `AttemptCarry`, `AttemptState`, `RunState`

These are **not layers**: no call passes through them to anything else. They are data with three
different lifetimes and three different writers.

1. **Implementations:** one each.
2. **Consumers:** `RunState` — written only by `PlanExecutor`, read by `RunReportBuilder`.
   `AttemptState` — written by `StepRunner` during one attempt, read by the report builders and
   `persist`. `AttemptCarry` — written at the end of one attempt, read at the start of the next.
3. **What breaks if they are merged into one object?** Correctness, not compilation. `AttemptCarry`
   exists because exactly one of `reworkBrief` and `systemNote` may be set, and its two methods
   (`fromDecision:15`, `fromNote:28`) are what make that mutually exclusive — merging it into
   `AttemptState` would let an attempt carry both. `AttemptState` is created fresh per attempt
   (`step-runner.ts:81`) and `AttemptCarry` once per step (`:69`): merging them would carry one
   attempt's reports into the next. `RunState` outlives both.
4. **Cost of removal:** 3 files, 161 lines — and the three lifetimes.

**Verdict: Earns it** (all three). Their hops are `Transforms`: `AttemptState.outcome:40` computes
the attempt's token delta, `RunState.addStep:28` derives `completedSteps` and the deferred issues.

### 10. `AgentFactory` versus `SdkAgentInvoker.build`

1. **Implementations:** one `AgentFactory`; it is the only thing that constructs `Agent`.
2. **Consumers:** one — `SdkAgentInvoker` via `build`. (`orchestratorRole()` at
   `agent.factory.ts:79` is a third method that returns a constant; `REFACTOR-PLAN.md` Group 6
   deletes it.)
3. **What breaks if `SdkAgentInvoker` constructs the `Agent` itself?** `sdk-agent-invoker.ts` would
   grow the vendor `Agent` constructor, the tool adaptation loop and the output-schema lookup, and
   the "a fresh `Agent` per call, nothing cached" rule would have no single place to live. The
   factory is also where `modelSettings: {store: false}` is applied — one place, not two.
4. **Cost of removal:** 1 file, 90 lines, 1 call site — and that rule.

**Verdict: `AgentFactory` earns it; `SdkAgentInvoker.build` → Remove** (see suspect 2). The branch
belongs in the factory, which already has the two methods it chooses between.

### 11. The `*InputRenderer` classes versus their callers

1. **Implementations:** seven renderers, one per packet, plus the shared `InputSectionRenderer`.
2. **Consumers:** more than one each for the four that matter —
   `DeveloperInputRenderer`, `QaInputRenderer`, `ReviewInputRenderer` and `PlanInputRenderer` are
   each called by **two** modules (`execution/step-runner.ts` or `plan-executor.ts`, **and**
   `cli/agent-input.builder.ts`, which is the `team agent <role>` path).
   `BriefInputRenderer`, `DecisionInputRenderer` and `SummaryInputRenderer` have one caller each.
   `InputSectionRenderer` has **six** consumers.
3. **What breaks if `StepRunner` built the strings itself?** The `team agent` path, concretely:
   `AgentInputBuilder.renderFor:56-93` renders the same three packets for a single-agent call with
   the pipeline fields empty. Inlining the renderers into `StepRunner` means `AgentInputBuilder`
   either duplicates them or imports from `src/execution`. And the rule CLAUDE.md states — agents
   receive code-built typed packets — would lose its single place.
4. **Cost of removal:** 7 files, ~470 lines, and the second caller.

**Verdict: Earns it.** Every hop in these classes is `Transforms`; none forwards. The *file count*
around them (a constants file and a types file per renderer) is a separate question and is
`REFACTOR-PLAN.md` Group 3's.

### 12. The `*ReportBuilder` / `*ReportFormatter` split

This is the layer I expected to be thin and is not.

1. **Implementations:** three builders, three formatters.
2. **Consumers:** the builders have **three** each (`step-runner.ts`, `cli/agent-report.printer.ts`,
   and themselves). The formatters have **three** each, and this is the point:
   - `cli/agent-report.printer.ts` — the terminal;
   - `agents/orchestrator/decide/decision-input.renderer.ts` — **the Decide prompt**: all three
     formatted reports are what the Orchestrator reads before deciding;
   - `agents/context/review-input.renderer.ts` — **the Reviewer prompt**, via
     `QaReportFormatter.format`.
3. **What breaks if builder and formatter are one class?** Nothing compiles differently, but the
   split is carrying real weight: the **builder's** output is consumed as *data* by
   `DecisionGuard.apply` (`step-runner.ts:318`), by `AttemptRepository.completeAttempt`
   (jsonb columns), and by `RunReportBuilder`; the **formatter's** output is consumed as *text* by a
   terminal and by two different model prompts. One class returning a string would make the guard
   and the database parse prose; one class returning only data would push three different renderings
   into three callers.
4. **Cost of removal:** 3 files, ~400 lines, 9 call sites — and the data/text separation.

**Verdict: Earns it.** Two audiences, one computation.

### 13. `DatabaseCommand` — trace 4 hop 24

1. **Implementations:** one abstract base; a second is not plausible.
2. **Consumers:** **six** — `RunCommand`, `AgentCommand`, `UsageCommand`, `HistoryCommand`,
   `PricesCommand`, `RunsPruneCommand`, each calling `this.ensureDatabase()` exactly once at the
   top of `run`.
3. **What breaks if the six commands inject `DatabaseBootstrap` and call it directly?** Nothing
   mechanical — but "every command that touches the database applies migrations and proves the
   connection first" stops being structural and becomes a convention six files have to remember.
   The class is also what keeps `ensureDatabase` out of the two commands that must work without a
   database: `ToolsCommand` and `AgentsCommand` extend `CommandRunner`, not `DatabaseCommand`, and
   `PrismaService.onModuleInit` swallows a failed `$connect` on purpose
   (`db/prisma.service.ts:11-15`, *"A command that does not need the database must still start"*).
   So `npx tsx src/main.ts tools` and `agents` run with no Postgres at all — a property worth being
   able to see in the type of a command rather than in six bodies.
4. **Cost of removal:** 1 file, 15 lines, 6 call sites (each gaining a constructor parameter and a
   line).

**Verdict: Thin but keep.** `ensureDatabase` is one Forwards hop, and the hop is the guarantee: a
command that extends `DatabaseCommand` cannot be constructed without a `DatabaseBootstrap`.

### 14. `GuardedRepository` — trace 2 hop 5, trace 4 hop 15

1. **Implementations:** one abstract base.
2. **Consumers:** four repositories (`agent-call`, `attempt`, `plan`, `run`).
3. **What breaks if each repository try/catches its own writes?** The rule CLAUDE.md names — a
   database write must never lose agent work — becomes four copies of a try/catch, and the
   `GuardedWrite<T>` shape (`db/db.types.ts:3`) that makes the warning a return value rather than a
   log line disappears. `AgentCallRepository.record:81` returns that warning to
   `SdkAgentInvoker.record:227`, which logs it; `PlanRepository` and `AttemptRepository` use
   `guardWrite` to return just the warning.
4. **Cost of removal:** 1 file, 31 lines, ~14 call sites.

**Verdict: Earns it.** Its hop is `Enforces`: it is the difference between a failed insert and a
failed run.

### 15. `JsonValue`

1. **Implementations:** one.
2. **Consumers:** five, all in `db/repositories` (`plan.repository`, `attempt.repository`,
   `run.repository`, `plan-step.mapper`, `attempt.mapper`), at 16 call sites.
3. **What breaks if callers cast directly?** Nothing at runtime: `of`, `required` and `strings` are
   casts plus a `Prisma.DbNull` choice, and `object` (`json.value.ts:25`) is literally the identity.
   What is lost is the one place where "a report is stored exactly as the builder produced it" is
   stated, and the `null` → `Prisma.DbNull` decision, which is easy to get wrong in 16 places (a
   plain `null` on a jsonb column means a different thing to Prisma than `DbNull`).
4. **Cost of removal:** 1 file, 29 lines, 16 call sites.

**Verdict: Thin but keep.** Its hops are `Transforms`, barely; the `null`/`DbNull` decision is what
makes it worth the hop. `JsonValue.object` specifically is an identity function and is noted in
`REFACTOR-PLAN.md`'s *Not doing*.

### 16. The repositories over Prisma — do they transform or forward?

**They transform.** Measured across the four repositories on these traces, the only pure forward is
one method:

| method | what it does beyond calling Prisma |
|---|---|
| `AgentCallRepository.record:44` | prices the call, warns once per model, computes `totalTokens`, maps the role enum, fixes the Decimal scale, guards the write |
| `AgentCallRepository.usageByStep:147` | joins steps → attempts → calls, sums per step, and adds the `attemptId: null` row so the rows add up to the total |
| `AgentCallRepository.usageTotals:175` | one `aggregate` plus a `distinct` model list |
| `AttemptRepository.openAttempt:25` | one transaction: bumps the step's `attemptsUsed` **and** creates the attempt row |
| `AttemptRepository.completeAttempt:46` | one transaction: aggregates the attempt's tokens and cost **from its `agent_calls` rows** and writes them with the reports |
| `PlanRepository.createPlan:35` | computes each step's plan index, `JsonValue.required` for the criteria |
| `PlanRepository.updateStepStatus:50` | resolves a plan position to a row, maps the status enum, spreads only the passed fields |
| `PlanRepository.closeRun:69` | recomputes the run totals **then** closes the row — two calls, in that order |
| `PlanRepository.openRun:30` | `await this.runs.setBranch(run.runId, run.branch)` — **the one pure forward** |

`PlanRepository.openRun` is a Forwards hop, but it is a method of the executor's `PlanRepository`
port (`execution/persistence/plan-repository.port.types.ts:6`), and the forward exists because the
run row belongs to `RunRepository` — the comment at `plan.repository.ts:16-18` states the rule: one
row is never written by two repositories.

**Verdict: Earns it** for the repositories; **Thin but keep** for `PlanRepository.openRun`, because
the port defines it and the forward is what keeps the two repositories off each other's row.

### 17. The nine `*.tool.ts` adapters, and the `tool` / `validator` / `service` split

1. **Implementations:** `AgentTool` has **ten** — the nine `*.tool.ts` classes plus
   `RoleScopedWriteTool`. This is real polymorphism: `FileToolRegistry` holds them as a list
   (`file-tool.registry.ts:23`) and `AgentToolAdapter` consumes any of them.
2. **Consumers:** one each (`FileToolRegistry`), but the interface has two
   (`FileToolRegistry`, `AgentToolAdapter`).
3. **What breaks if the registry called the services directly?** The error text the model sees. This
   is the specific claim `REFACTOR-PLAN.md` makes, and it holds — with one correction worth stating
   plainly:

   **Could the text be preserved without the layer? Yes, but not by moving the catch upward.**
   - Today: any throw from the validator *or the service* is caught at
     `write-file.tool.ts:30-32` and returned as `WorkspaceMessages.error(message)` → `Error: <hint>`.
     A throw that escapes *that* is caught at `agent-tool.adapter.ts:32-34` and returned as
     `Error: internal tool failure: <hint>` (`sdk.constants.ts:13`).
   - Moving the catch into `AgentToolAdapter` with an `instanceof ToolValidationError` test **would
     not** preserve the text. Validator throws are `ToolValidationError`
     (`write-file.validator.ts:20,33,38,60`), but service throws are not: an `EACCES` out of
     `AtomicFileWriter.replace` reaches the model today as `Error: EACCES …` and would become
     `Error: internal tool failure: EACCES …`. Making the adapter treat *every* throw as a tool
     error would preserve the text but would delete the distinction between an expected tool refusal
     and a genuine bug — which is the only thing hop 3 of trace 1 adds.
   - Moving the try/catch into each `*.service.ts`, together with the `name` / `description` /
     `schema` / flag fields, **would** preserve the text exactly. That removes one hop and nine
     files, at the cost of putting the never-throw boundary in the same class as the work.
4. **Cost of removal:** 9 files, ~300 lines, 1 hop per tool call, and ~30 call sites
   (`workspace.module.ts` providers plus `file-tool.registry.ts`).

**Does the three-layer split earn itself once?** Yes — and the evidence is `write-file.service.ts`:
34 lines with no defensive code, because hops 9-19 of trace 1 are complete and it can trust its
input. The validator holds 12 hops of enforcement; the service holds the work. Those are two
different jobs with two different failure modes.

**Is `git-status/` having no validator a broken pattern?** No. `gitStatusSchema` is
`z.object({})` (`git-status.schema.ts:3`) — `git_status` takes no parameters, so there is nothing to
validate, and `GitStatusService` is 99 lines of real grouping and rendering logic. The pattern is
"validate what the model sent", and a tool that receives nothing correctly has no validator. The
same folder's `execute()` (`git-status.tool.ts:23`) takes no argument at all.

**Verdict: Thin but keep.** The `*.tool.ts` hop is `Enforces`, not `Forwards`, so by this audit's own
rule it is not a candidate. What makes it worth the hop: the never-throw boundary sits in a class
whose *only* job is that boundary, so a future edit to a service cannot leak past it. The nine-files
question is file count, not hops, and belongs to `REFACTOR-PLAN.md`.

### 18. `UsageCommand.rowsOf` and `UsageCommand.table` — trace 4 hops 29 and 33

Both are three-way `if`s inside one class, dispatching on `UsageDimension`. They are Forwards hops
by the letter of the definition, but they are not a layer: there is no class boundary between the
caller and the callee, and inlining them moves the same `if` to the one call site in the same file.
**Verdict: Thin but keep.** Zero hops are removed by any realistic change.

## Boundaries

Each of these gets a verdict too, but only **Earns it** or **Thin but keep** is available.

| boundary | what it isolates or enforces | verdict |
|---|---|---|
| **`src/sdk` as the only importer of `@openai/agents`** | All nine imports of the vendor are inside it. Three files localise three vendor shapes that change independently of each other: `AgentToolAdapter` the tool shape, `SdkErrorMapper` (103 lines) the error shapes, `UsageReader` (83) the usage shape — and the usage shape is read defensively because the vendor can change it (trace 4 hops 2-5). Without the boundary, a vendor upgrade reaches `cli/` and `agents/`. It also keeps `modelSettings: {store:false}` and `setTracingDisabled(true)` (`sdk.bootstrap.ts:23`) in one place each. | **Earns it** |
| **`GitService` as the only git spawner** | `grep -rln "child_process" src/` returns three files: this one, `run-command.service.ts` (the agent's own commands, gated by `CommandPolicy`) and `migration.runner.ts` (Prisma). Every git invocation goes through `execute:289` with an argument array, no shell, `GIT_BASE_ARGS`, a secret-stripped child env (`:439`), user paths after `--`, and refs validated by `assertRef:433` first. Trace 2 hops 52-54 are the whole git surface of a run. Flattening it would put `execFile` next to model-supplied strings in four files. | **Earns it** |
| **`WorkspaceService.resolveSafe`, `PathPolicy`, `RoleWritePolicy`** | Twelve of trace 1's 30 hops. `resolveSafe` is the containment root: NUL and empty rejection, resolve, `assertInside`, then `assertInside` again on the realpath of the nearest existing ancestor, so a symlink cannot escape. `PathPolicy` is the `.git` / `.env` / `node_modules` / directory / symlink deny list, called from six validators. `RoleWritePolicy` enforces QA-writes-tests-only in code rather than in a prompt, and is reused by `changed-file.classifier.ts:11` to classify files — a genuine second use. | **Earns it** |
| **`CommandPolicy`, `CommandTokenizer`, `ChildEnvironmentBuilder`** | The security surface of the one tool that runs arbitrary project commands: an allowlist over argv tokens (273 lines), a shell-free tokenizer (91), and a child environment with no secrets. This is the highest-risk tool in the repository and the one place where 400 lines of policy is proportionate. | **Earns it** |
| **`AtomicFileWriter`** | Trace 1 hops 21-26. Temp file plus `rename` is why a crashed, denied or over-size write cannot truncate the user's source file, and `:21` unlinks the temp file on failure. Thirty lines protecting every `write_file` and `edit_file` call, plus the plan and report writes (`plan-executor.ts:565`). | **Earns it** |
| **The QA, Reviewer and Developer report builders** | Trace 2 hops 21, 31, 34. They compute pass/fail, coverage, freshness, the verdict and the discrepancies between what an agent claimed and what the recorders saw — `ReviewReportBuilder:36` even lists changed source files the Reviewer never read. Remove them and the system takes the model's word for whether its own work passed. | **Earns it** |
| **`DecisionGuard`** | Trace 2 hop 37. Three rules (`decision.guard.ts:27-42`) that keep the model's decision from contradicting recorded facts, and every override is returned with its reasons and emitted as `DecisionOverridden`, never applied silently. `StepRunner` acts on `guarded.effective`, never on `decision.decision`. | **Earns it** |
| **`AgentCallRepository`, `CostCalculator`** | Trace 4 hops 11-20. Every model call is written whether it succeeded or failed, priced on write from the `model_prices` table, with money as `Decimal` until `toNumber()` at the display edge (`:80`). `CostCalculator` is the one place a cost is computed, and it treats cached input as a subset of input rather than an addition — a mistake that would silently overcharge every run. The `attemptId: null` row in `usageByStep` is why the real output above adds up. | **Earns it** |

## Verdicts at a glance

| layer | verdict | hops removed | files removed | call sites changed | risk |
|---|---|---|---|---|---|
| `AgentCallContext.changes/commandRuns/readPaths` | **Remove** | 3 | 0 | 5 (1 file) | 1 |
| `StepRunner.runRole` | **Remove** | 1 | 0 | 1 | 1 |
| `SdkAgentInvoker.build` | **Remove** | 1 | 0 | 1 (+1 new method on `AgentFactory`) | 2 |
| The nine `*.tool.ts` adapters | Thin but keep | 0 | 0 | 0 | — |
| `tool` / `validator` / `service` split | Earns it | 0 | 0 | 0 | — |
| `AgentCallRunner` | Earns it | 0 | 0 | 0 | — |
| `AgentCallLedger` | Earns it | 0 | 0 | 0 | — |
| `SdkInvokerFactory` + `AgentInvokerFactory` port | Earns it | 0 | 0 | 0 | — |
| `AgentInvoker` port | Earns it | 0 | 0 | 0 | — |
| `CallScope` / `InvokerScope` / `AgentCallScope` | Thin but keep | 0 | 0 | 0 | — |
| `AttemptCarry` / `AttemptState` / `RunState` | Earns it (×3) | 0 | 0 | 0 | — |
| `AgentCallContext` (the class) | Earns it | 0 | 0 | 0 | — |
| `AgentCallStore` over `AsyncLocalStorage` | Thin but keep | 0 | 0 | 0 | — |
| `AgentFactory` | Earns it | 0 | 0 | 0 | — |
| `*InputRenderer` classes | Earns it | 0 | 0 | 0 | — |
| `*ReportBuilder` / `*ReportFormatter` split | Earns it | 0 | 0 | 0 | — |
| `DatabaseCommand` | Thin but keep | 0 | 0 | 0 | — |
| `GuardedRepository` | Earns it | 0 | 0 | 0 | — |
| `JsonValue` | Thin but keep | 0 | 0 | 0 | — |
| The repositories over Prisma | Earns it | 0 | 0 | 0 | — |
| `PlanRepository.openRun` | Thin but keep | 0 | 0 | 0 | — |
| `UsageCommand.rowsOf` / `.table` | Thin but keep | 0 | 0 | 0 | — |
| `src/sdk` boundary | Earns it | — | — | — | — |
| `GitService` | Earns it | — | — | — | — |
| `resolveSafe` / `PathPolicy` / `RoleWritePolicy` | Earns it | — | — | — | — |
| `CommandPolicy` / `CommandTokenizer` / `ChildEnvironmentBuilder` | Earns it | — | — | — | — |
| `AtomicFileWriter` | Earns it | — | — | — | — |
| QA / Reviewer / Developer builders, `DecisionGuard` | Earns it | — | — | — | — |
| `AgentCallRepository`, `CostCalculator` | Earns it | — | — | — | — |

## Recommended

Ranked by (hops removed ÷ risk). All three are small, local, and independent of each other.

1. **`AgentCallContext`'s three snapshot accessors — 3 hops ÷ risk 1 = 3.0.** Replace
   `context.changes()` / `commandRuns()` / `readPaths()` with
   `context.recorders.changes.snapshot()` and friends at the five call sites in
   `sdk-agent-invoker.ts:111-113,133`. The field is already public and already used directly at
   `:93`. Verify with `npx tsx src/main.ts tools` and a `--dry-run` (the canned path builds the same
   `AgentInvocation`); the Developer report's `filesChanged` is the number that would break.
2. **`StepRunner.runRole` — 1 hop ÷ risk 1 = 1.0.** Inline the three-way `if` into `runAttempt`'s
   `STEP_AGENT_SEQUENCE` loop. Verify with a `--dry-run`: the step must still call Developer, QA and
   Reviewer in that order and still stop at `verificationSkipped`.
3. **`SdkAgentInvoker.build` — 1 hop ÷ risk 2 = 0.5.** Move the `target.task === null` branch into a
   new `AgentFactory.build(target, context, model, maxTurns, emitter)`. Risk 2 rather than 1 because
   it changes the shape of a method on an injected provider, so the dev script — not
   `npm run build` — is what proves the container still resolves (`npx tsx src/main.ts tools`), and
   because the instruction text must not move: hash it before and after with the prompt-identity
   check in `REFACTOR-PLAN.md`'s verification recipe.

**What to leave alone.** Everything else on the list above, and in particular the three places it is
tempting to cut:

- **The two port hops** (`SdkInvokerFactory.forScope`, `SdkAgentInvoker.invokeAgent`). They are
  one-line methods, and they are the boundary. `team run --dry-run` — a full run of the plan, the
  steps, the commits and the report at zero cost — exists only because `PlanExecutor.execute` takes
  an `AgentInvokerFactory` rather than an `SdkInvokerFactory`.
- **`AgentCallStore`'s two delegations.** Two Forwards hops that are the only way six singleton tool
  services can see the recorders of the call that is running.
- **The nine `*.tool.ts` adapters.** One hop each, and the hop is the only thing that makes the
  difference between `Error: EACCES …` and `Error: internal tool failure: EACCES …` in what the
  model reads. If they are merged anyway — as a *file-count* decision — the try/catch must move into
  each `*.service.ts`, not up into `AgentToolAdapter`.

## Not a layer problem

- **`CallScope` vs `InvokerScope` vs `AgentCallScope` vs `AgentCallRecord.stepIndex/.attempt`.** Four
  declarations of the same two or three fields. Unifying them removes **zero hops**: hop 9 of trace 3
  still has to add `runId`, which `AgentCallScope` deliberately does not carry, and `CallScope` must
  stay separate from `InvokerScope` or `src/execution` starts importing from `src/sdk`. The pair that
  *could* be one type — `InvokerScope` and `AgentCallScope`, both in
  `src/execution/agents/` — is a type-duplication question for `REFACTOR-PLAN.md`, not a layer.
- **Nine folders with the same three files.** A repeated pattern, not nine layers. The question this
  audit asked is whether the three hops earn themselves once, and they do (suspect 17).
- **The declaration-only files around every layer on these traces** — a `*.types.ts` and a
  `*.constants.ts` beside each renderer, each repository, each tool. They add no hop at all; the
  import is resolved at compile time. `REFACTOR-PLAN.md` Groups 1-5 cover them.
- **`AgentDefinitionRenderer.toolDescription`, `FileToolRegistry.all()`,
  `AgentFactory.orchestratorRole()`, `SdkAgentInvoker.orchestratorRole()`.** Dead or
  constant-returning methods, on no trace in this report because nothing calls them.
  `REFACTOR-PLAN.md` Group 6 deletes them.
- **`UsageTally` summing across retries that no longer happen.** Its comment
  (`usage.tally.ts:5-6`) says it adds up "every attempt of one call", but the retry now lives one
  level up in `AgentCallRunner.call:54-62`, and each retry calls `invoke` again and so builds a
  fresh tally. `add` therefore runs exactly once per call. It still earns its two hops — it is the
  mutable cell the `catch` at `sdk-agent-invoker.ts:122` reads so a stream that failed halfway
  reports what it spent — but the comment describes a mechanism that moved. A comment fix, not a
  layer change, and out of scope here.
- **`JsonValue.object` being the identity function.** One line, no hop of consequence; noted in
  `REFACTOR-PLAN.md`'s *Not doing*.
- **The duplicated `plural` helper, the duplicated prompt renderer, and the 8-fold
  path-resolution preamble in the validators.** All duplication, no extra hop.
  `REFACTOR-PLAN.md` Groups 7 and 8.

## Final numbers

- **Total hops in the four traces: 172.**
- **Forwards hops: 15** (9%) — 9 of them between `StepRunner` and the vendor `run()` call.
- **Hops remaining after the recommended removals: 167.** Ten of the fifteen Forwards hops stay, each
  with a stated reason: six are port or DI seams, three are intra-class dispatch, one is a
  framework-required base-class hop.
