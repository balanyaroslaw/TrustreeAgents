import { Inject, Injectable, Optional } from '@nestjs/common';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PlanStepContext } from '../agents/context/step-context.types';
import { StepDecisionKind } from '../agents/orchestrator/decide/step-decision.enum';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { PlanFormatter } from '../agents/orchestrator/plan/plan.formatter';
import { PlanInputRenderer } from '../agents/orchestrator/plan/plan-input.renderer';
import { NO_ANSWER_GIVEN } from '../agents/orchestrator/plan/plan-input.constants';
import type { AnsweredQuestion } from '../agents/orchestrator/plan/plan-input.types';
import type { RunPlan, RunPlanStep } from '../agents/orchestrator/plan/run-plan.types';
import type { RunSummary } from '../agents/orchestrator/summarize/run-summary.types';
import { SummaryInputRenderer } from '../agents/orchestrator/summarize/summary-input.renderer';
import type {
  StepOutcome as SummaryStepOutcome,
  SummaryInputPacket,
} from '../agents/orchestrator/summarize/summary-input.types';
import { AgentEventKind } from '../events/agent-event-kind.enum';
import { EventBus } from '../events/event-bus';
import { AtomicFileWriter } from '../workspace/io/atomic-file.writer';
import { ErrorInspector } from '../workspace/utils/error.inspector';
import { WorkspaceService } from '../workspace/workspace.service';
import { AgentCallLedger } from './agents/agent-call.ledger';
import { AgentCallRunner } from './agents/agent-call.runner';
import { AgentFailureKind } from './agents/agent-failure.enum';
import { AgentFailurePolicy } from './agents/agent-failure.policy';
import { AgentInvocationError } from './agents/agent-invocation.error';
import type { AgentInvokerFactory } from './agents/agent-invoker-factory.port.types';
import { BudgetExhaustedError } from './budget/budget-exhausted.error';
import { HostBlockedError } from './diagnosis/host-blocked.error';
import { RunBudget } from './budget/run-budget';
import { StepCheckpoint } from './checkpoint/step-checkpoint';
import {
  AGENT_INVOKER_FACTORY,
  DEFAULT_RUN_TIMEOUT_MS,
  DEFAULT_TOKEN_BUDGET,
  FIRST_ATTEMPT,
  FIRST_STEP_INDEX,
  MAX_PLAN_ATTEMPTS,
  MAX_PREVIOUS_FAILURES,
  OPTIONAL_CALL_TOKEN_RESERVE,
  PLAN_FILE_NAME,
  PLAN_REPOSITORY,
  USER_PROMPTER,
} from './execution.constants';
import { ExecutionMessages } from './execution.messages';
import type { RunOutcome, RunRequest, StepOutcome, StepRunResult } from './execution.types';
import type { UserPrompter } from './interaction/user-prompter.port.types';
import type { PlanRepository } from './persistence/plan-repository.port.types';
import { PortPreflight } from './preflight/port.preflight';
import { RunReportBuilder } from './report/run-report.builder';
import { RunReportFormatter } from './report/run-report.formatter';
import { RunIdFormatter } from './run-id.formatter';
import { RunRefusedError } from './run-refused.error';
import { RunSignalListener } from './run-signal.listener';
import { RunState } from './run-state';
import { RunStatus } from './run-status.enum';
import { StepRunner } from './step-runner';
import { StepStatus } from './step-status.enum';
import { WorkspaceSurveyor } from './workspace.surveyor';

const EMPTY = 0;
const NO_SCOPE = { stepIndex: null, attempt: null, attemptId: null };
const CONFIRMATION_ANSWERS: readonly string[] = ['y', 'yes'];

// Owns one run: preflight, planning, the ordered steps, the budget and the final report. It
// reaches the agents only through the AgentInvoker port, so no SDK type ever enters this layer,
// and it reports to the outside only through the EventBus.
@Injectable()
export class PlanExecutor {
  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(StepCheckpoint) private readonly checkpoint: StepCheckpoint,
    @Inject(StepRunner) private readonly stepRunner: StepRunner,
    @Inject(WorkspaceSurveyor) private readonly surveyor: WorkspaceSurveyor,
    @Inject(PortPreflight) private readonly ports: PortPreflight,
    @Inject(EventBus) private readonly events: EventBus,
    @Inject(AGENT_INVOKER_FACTORY) private readonly invokers: AgentInvokerFactory,
    @Inject(PLAN_REPOSITORY) private readonly plans: PlanRepository,
    @Optional() @Inject(USER_PROMPTER) private readonly prompter: UserPrompter | null = null,
  ) {}

  // `invokers` is passed only by `team run --dry-run`, which hands in the canned invoker; every
  // other caller gets the SDK factory this executor was built with.
  async execute(
    request: RunRequest,
    invokers: AgentInvokerFactory = this.invokers,
  ): Promise<RunOutcome> {
    const state = new RunState(Date.now());
    const budget = new RunBudget(request.tokenBudget ?? DEFAULT_TOKEN_BUDGET);
    const ledger = new AgentCallLedger();
    const controller = new AbortController();
    const signals = new RunSignalListener();
    const timeout = setTimeout(
      () => controller.abort(),
      request.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS,
    );
    timeout.unref();
    const caller = new AgentCallRunner(
      invokers,
      this.events,
      ledger,
      budget,
      request.runId,
      controller.signal,
    );

    await this.preflight(request, state);
    signals.attach(controller);
    try {
      await this.plans.openRun({
        runId: request.runId,
        prompt: request.prompt,
        branch: state.branch ?? '',
      });
      const plan = await this.plan(request, state, caller);
      if (plan !== null) {
        state.plan = plan;
        await this.publishPlan(request, plan);
        if (await this.confirmed(request)) {
          await this.runSteps(request, state, plan, budget, caller, controller.signal);
        } else {
          state.stop(RunStatus.Cancelled, ExecutionMessages.planRejected());
        }
      }
    } catch (error) {
      PlanExecutor.stopOn(state, error, controller.signal);
    } finally {
      clearTimeout(timeout);
      signals.detach();
      this.checkpoint.releaseBaseRef();
    }

    return this.finish(request, state, budget, ledger, caller);
  }

  // Everything that must be true before the run creates anything. A refusal leaves the workspace
  // exactly as it was: no branch, no run row, no report.
  private async preflight(request: RunRequest, state: RunState): Promise<void> {
    const requested = await realpath(resolve(request.workspacePath));
    if (requested !== this.workspace.root) {
      throw new RunRefusedError(
        ExecutionMessages.workspaceMismatch(request.workspacePath, this.workspace.root),
      );
    }
    // Checked before anything is created: a port the workspace needs and another container holds
    // would fail every attempt of every step identically, and no agent can fix it from here.
    const conflicts = await this.ports.conflicts();
    if (conflicts.length > EMPTY) {
      throw new RunRefusedError(ExecutionMessages.portsHeldByOtherContainers(conflicts));
    }
    await this.checkpoint.prepareRepository(request.runId);

    const uncommitted = await this.checkpoint.uncommittedPaths();
    if (uncommitted.length > EMPTY) {
      throw new RunRefusedError(ExecutionMessages.dirtyWorktree(uncommitted));
    }
    state.branch = await this.checkpoint.createRunBranch(request.runId);
  }

  // Asks for a plan, answers the clarifying questions once, and gives up after the second
  // attempt: a plan built on unanswered questions would be guesswork.
  private async plan(
    request: RunRequest,
    state: RunState,
    caller: AgentCallRunner,
  ): Promise<RunPlan | null> {
    let answered: readonly AnsweredQuestion[] = [];
    // What was attempted in this workspace before and abandoned, read once: the history of the
    // project cannot change while this run plans, and a project with no finished run has none.
    // The previous plan itself is deliberately not carried forward - the code is the source of
    // truth, and a plan that failed was often badly sized, which is why it failed.
    const previousFailures = await this.plans.failedSteps(request.projectId, MAX_PREVIOUS_FAILURES);

    for (let attempt = FIRST_ATTEMPT; attempt <= MAX_PLAN_ATTEMPTS; attempt += 1) {
      this.events.emit({
        kind: AgentEventKind.PlanRequested,
        runId: request.runId,
        at: Date.now(),
        prompt: request.prompt,
        planAttempt: attempt,
      });
      const survey = await this.surveyor.survey();
      const invocation = await caller.orchestrator<RunPlan>(
        OrchestratorTask.Plan,
        PlanInputRenderer.render({
          userPrompt: request.prompt,
          isExistingProject: survey.isExistingProject,
          workspaceDocuments: survey.documents,
          previousFailures,
          previousQuestionsAndAnswers: answered,
        }),
        NO_SCOPE,
      );
      const plan = invocation.output;
      if (plan.clarifyingQuestions.length === EMPTY) {
        return plan;
      }
      state.questions = plan.clarifyingQuestions;
      this.events.emit({
        kind: AgentEventKind.PlanQuestions,
        runId: request.runId,
        at: Date.now(),
        questions: plan.clarifyingQuestions,
      });
      answered = await this.answer(plan.clarifyingQuestions, request.attended);
    }

    state.stop(RunStatus.Failed, ExecutionMessages.planQuestionsRemain(state.questions));
    return null;
  }

  private async answer(
    questions: readonly string[],
    attended: boolean,
  ): Promise<readonly AnsweredQuestion[]> {
    if (!attended || this.prompter === null) {
      return questions.map((question) => ({ question, answer: NO_ANSWER_GIVEN }));
    }
    const answers = await this.prompter.ask(questions);

    return questions.map((question, position) => ({
      question,
      answer:
        answers[position] === undefined || answers[position] === ''
          ? NO_ANSWER_GIVEN
          : answers[position],
    }));
  }

  // A real run spends money, so an attended run is asked once, after the plan is visible and
  // before any step starts. An unattended run, or one started with --yes, goes ahead.
  private async confirmed(request: RunRequest): Promise<boolean> {
    if (request.autoApprove || !request.attended || this.prompter === null) {
      return true;
    }
    const [answer] = await this.prompter.ask([ExecutionMessages.confirmPlan()]);

    return CONFIRMATION_ANSWERS.includes((answer ?? '').trim().toLowerCase());
  }

  private async publishPlan(request: RunRequest, plan: RunPlan): Promise<void> {
    await this.plans.createPlan({
      runId: request.runId,
      summary: plan.summary,
      assumptions: plan.assumptions,
      steps: plan.steps,
    });
    await this.write(PLAN_FILE_NAME, PlanFormatter.markdown(plan, new Date()));
    await this.checkpoint.commitPlan(request.runId, plan);
    this.events.emit({
      kind: AgentEventKind.PlanCreated,
      runId: request.runId,
      at: Date.now(),
      steps: plan.steps.length,
      summary: plan.summary,
      plan: plan.steps,
    });
  }

  // The steps run in the order of the plan. A failed step fails the run: the later steps build on
  // it, so going on would only pile guesses on top of a broken one.
  private async runSteps(
    request: RunRequest,
    state: RunState,
    plan: RunPlan,
    budget: RunBudget,
    caller: AgentCallRunner,
    signal: AbortSignal,
  ): Promise<void> {
    const total = plan.steps.length;
    const allowed = request.maxSteps ?? total;

    for (const [position, planStep] of plan.steps.entries()) {
      const step = PlanExecutor.stepContext(planStep, position + FIRST_STEP_INDEX, total);
      if (step.index > allowed) {
        await this.skipOverLimit(request, state, plan, allowed);
        state.stop(RunStatus.Failed, ExecutionMessages.stepLimitReached(total, allowed));
        return;
      }
      this.events.emit({
        kind: AgentEventKind.StepStarted,
        runId: request.runId,
        at: Date.now(),
        index: step.index,
        total,
        title: step.title,
      });
      await this.plans.updateStepStatus({
        runId: request.runId,
        index: step.index,
        status: StepStatus.InProgress,
        startedAt: new Date(),
      });
      state.currentStep = step;
      const baseRef = await this.checkpoint.beginStep();
      if (baseRef === null) {
        throw new RunRefusedError(ExecutionMessages.dirtyWorktree([]));
      }
      const result = await this.stepRunner.run({
        runId: request.runId,
        step,
        completedSteps: state.completedSteps,
        baseRef,
        signal,
        budget,
        caller,
      });

      if (!result.accepted) {
        await this.failStep(request, state, step, result);
        await this.skipRemaining(request, state, plan, step.index);
        state.stop(
          RunStatus.Failed,
          ExecutionMessages.stepFailedRun(step.index, result.failureReason ?? ''),
        );
        return;
      }
      await this.acceptStep(request, state, step, result, total);
      state.currentStep = null;
    }
  }

  private async acceptStep(
    request: RunRequest,
    state: RunState,
    step: PlanStepContext,
    result: StepRunResult,
    total: number,
  ): Promise<void> {
    const commitSha = await this.checkpoint.commitStep(
      { runId: request.runId, index: step.index, total, title: step.title },
      result.summary,
    );
    await this.plans.updateStepStatus({
      runId: request.runId,
      index: step.index,
      status: StepStatus.Accepted,
      attempts: result.attempts.length,
      summary: result.summary,
      commitSha,
      finishedAt: new Date(),
    });
    state.addStep({
      index: step.index,
      title: step.title,
      status: StepStatus.Accepted,
      summary: result.summary,
      commitSha,
      failureReason: null,
      note: commitSha === null ? ExecutionMessages.nothingToCommit() : null,
      attempts: result.attempts,
      deferredIssues: result.deferredIssues,
    });
    this.events.emit({
      kind: AgentEventKind.StepAccepted,
      runId: request.runId,
      at: Date.now(),
      index: step.index,
      commitSha,
      summary: result.summary,
    });
  }

  private async failStep(
    request: RunRequest,
    state: RunState,
    step: PlanStepContext,
    result: StepRunResult,
  ): Promise<void> {
    const reason = result.failureReason ?? '';
    await this.plans.updateStepStatus({
      runId: request.runId,
      index: step.index,
      status: StepStatus.Failed,
      attempts: result.attempts.length,
      // Stored on the step, not only in the report: a later run on this workspace is shown why
      // this step was given up, and that reason is read back from this column.
      failureReason: reason,
      finishedAt: new Date(),
    });
    state.addStep({
      index: step.index,
      title: step.title,
      status: StepStatus.Failed,
      summary: '',
      commitSha: null,
      failureReason: reason,
      note: null,
      attempts: result.attempts,
      deferredIssues: result.deferredIssues,
    });
    this.events.emit({
      kind: AgentEventKind.StepFailed,
      runId: request.runId,
      at: Date.now(),
      index: step.index,
      reason,
    });
  }

  private async skipOverLimit(
    request: RunRequest,
    state: RunState,
    plan: RunPlan,
    allowed: number,
  ): Promise<void> {
    for (const [position, planStep] of plan.steps.entries()) {
      const index = position + FIRST_STEP_INDEX;
      if (index <= allowed) {
        continue;
      }
      await this.plans.updateStepStatus({
        runId: request.runId,
        index,
        status: StepStatus.Skipped,
        failureReason: ExecutionMessages.skippedOverStepLimit(allowed),
      });
      state.addStep({
        index,
        title: planStep.title,
        status: StepStatus.Skipped,
        summary: '',
        commitSha: null,
        failureReason: null,
        note: ExecutionMessages.skippedOverStepLimit(allowed),
        attempts: [],
        deferredIssues: [],
      });
    }
  }

  private async skipRemaining(
    request: RunRequest,
    state: RunState,
    plan: RunPlan,
    failedIndex: number,
  ): Promise<void> {
    for (const [position, planStep] of plan.steps.entries()) {
      const index = position + FIRST_STEP_INDEX;
      if (index <= failedIndex) {
        continue;
      }
      await this.plans.updateStepStatus({
        runId: request.runId,
        index,
        status: StepStatus.Skipped,
      });
      state.addStep({
        index,
        title: planStep.title,
        status: StepStatus.Skipped,
        summary: '',
        commitSha: null,
        failureReason: null,
        note: ExecutionMessages.skippedAfterFailure(failedIndex),
        attempts: [],
        deferredIssues: [],
      });
    }
  }

  // The last stage of every run, whatever ended it: the optional summary, the report, the closed
  // run row and the run_finished event.
  private async finish(
    request: RunRequest,
    state: RunState,
    budget: RunBudget,
    ledger: AgentCallLedger,
    caller: AgentCallRunner,
  ): Promise<RunOutcome> {
    if (state.status === RunStatus.Running) {
      state.stop(
        state.everyStepAccepted() && state.plan !== null ? RunStatus.Completed : RunStatus.Failed,
        null,
      );
    }
    await this.closeOpenStep(request, state);
    state.summary = await this.summarize(request, state, budget, caller);

    const report = RunReportBuilder.build(request, state, ledger, budget);
    // Said in the terminal as well as in the report, and said the same way: the person who
    // started the run should not have to open a file to learn why it stopped.
    if (report.diagnosis !== null) {
      this.events.emit({
        kind: AgentEventKind.RunDiagnosed,
        runId: request.runId,
        at: Date.now(),
        diagnosis: report.diagnosis,
      });
    }
    const reportPath = RunIdFormatter.reportPath(request.runId);
    await this.write(reportPath, RunReportFormatter.format(report));
    await this.checkpoint.commitReport(request.runId, reportPath);
    state.reportPath = reportPath;

    await this.plans.closeRun({
      runId: request.runId,
      status: state.status,
      reportPath,
      failureReason: state.stoppedReason,
    });
    this.events.emit({
      kind: AgentEventKind.RunFinished,
      runId: request.runId,
      at: Date.now(),
      status: state.status,
      reportPath,
      branch: state.branch,
    });

    return {
      runId: request.runId,
      status: state.status,
      branch: state.branch,
      reportPath,
      planSummary: state.planSummary,
      questions: state.questions,
      steps: state.steps,
      stoppedReason: state.stoppedReason,
      tokensTotal: ledger.tokensTotal(),
      durationMs: state.durationMs(),
    };
  }

  // A run stopped inside a step - cancelled, out of budget, or an agent call that could not be
  // recovered - leaves that step in progress. It is closed as failed with the reason the run
  // stopped, so the report says where it stopped.
  private async closeOpenStep(request: RunRequest, state: RunState): Promise<void> {
    const step = state.currentStep;
    if (step === null || state.hasOutcomeFor(step.index)) {
      return;
    }
    await this.plans.updateStepStatus({
      runId: request.runId,
      index: step.index,
      status: StepStatus.Failed,
      failureReason: state.stoppedReason,
      finishedAt: new Date(),
    });
    state.addStep({
      index: step.index,
      title: step.title,
      status: StepStatus.Failed,
      summary: '',
      commitSha: null,
      failureReason: state.stoppedReason,
      note: null,
      attempts: [],
      deferredIssues: [],
    });
  }

  // Optional, and never allowed to take the report down with it: the run is already over, so a
  // failed summary call only costs the overview.
  private async summarize(
    request: RunRequest,
    state: RunState,
    budget: RunBudget,
    caller: AgentCallRunner,
  ): Promise<RunSummary | null> {
    const { plan } = state;
    if (
      plan === null ||
      state.status === RunStatus.Cancelled ||
      !budget.allows(OPTIONAL_CALL_TOKEN_RESERVE)
    ) {
      return null;
    }
    const packet: SummaryInputPacket = {
      userPrompt: request.prompt,
      plan,
      steps: state.steps
        .filter((step) => step.status !== StepStatus.Skipped)
        .map(PlanExecutor.summaryStep),
      deferredIssues: state.deferredIssues,
    };

    try {
      const invocation = await caller.orchestrator<RunSummary>(
        OrchestratorTask.Summarize,
        SummaryInputRenderer.render(packet),
        NO_SCOPE,
      );
      return invocation.output;
    } catch (error) {
      if (error instanceof AgentInvocationError || error instanceof BudgetExhaustedError) {
        return null;
      }
      throw error;
    }
  }

  private async write(relativePath: string, content: string): Promise<void> {
    await AtomicFileWriter.replace(await this.workspace.resolveSafe(relativePath), content);
  }

  private static stopOn(state: RunState, error: unknown, signal: AbortSignal): void {
    if (signal.aborted) {
      state.stop(RunStatus.Cancelled, ExecutionMessages.cancelled());
      return;
    }
    if (error instanceof BudgetExhaustedError || error instanceof HostBlockedError) {
      state.stop(RunStatus.Failed, error.message);
      return;
    }
    if (error instanceof AgentInvocationError) {
      state.stop(
        error.kind === AgentFailureKind.Cancelled ? RunStatus.Cancelled : RunStatus.Failed,
        AgentFailurePolicy.stopReason(error),
      );
      return;
    }
    if (error instanceof RunRefusedError) {
      throw error;
    }
    state.stop(RunStatus.Failed, ErrorInspector.message(error));
  }

  private static stepContext(step: RunPlanStep, index: number, total: number): PlanStepContext {
    return {
      index,
      total,
      title: step.title,
      description: step.description,
      acceptanceCriteria: step.acceptanceCriteria,
    };
  }

  private static summaryStep(step: StepOutcome): SummaryStepOutcome {
    return {
      index: step.index,
      title: step.title,
      decision:
        step.status === StepStatus.Accepted ? StepDecisionKind.Accept : StepDecisionKind.Abort,
      summary: step.summary,
    };
  }
}
