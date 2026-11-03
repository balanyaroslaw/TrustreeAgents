import { Inject, Injectable } from '@nestjs/common';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import { AgentRole } from '../agents/agent-role.enum';
import { DeveloperInputRenderer } from '../agents/context/developer-input.renderer';
import { QaInputRenderer } from '../agents/context/qa-input.renderer';
import { ReviewInputRenderer } from '../agents/context/review-input.renderer';
import type { QaBrief } from '../agents/context/qa-brief.types';
import type { QaFactsForReview } from '../agents/context/review-input.types';
import { DeveloperReportBuilder } from '../agents/developer/developer-report.builder';
import { DeveloperStatus } from '../agents/developer/developer-status.enum';
import type { DeveloperResult } from '../agents/developer/developer-result.types';
import { BriefInputRenderer } from '../agents/orchestrator/brief/brief-input.renderer';
import { DecisionGuard } from '../agents/orchestrator/decide/decision.guard';
import { DecisionInputRenderer } from '../agents/orchestrator/decide/decision-input.renderer';
import type { PreviousAttemptDecision } from '../agents/orchestrator/decide/decision-input.types';
import { ReworkBriefBuilder } from '../agents/orchestrator/decide/rework-brief.builder';
import { StepDecisionKind } from '../agents/orchestrator/decide/step-decision.enum';
import type {
  DeferredIssue,
  StepDecision,
} from '../agents/orchestrator/decide/step-decision.types';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { CoverageLevel } from '../agents/qa/coverage-level.enum';
import { QaReportBuilder } from '../agents/qa/qa-report.builder';
import { TestFileDiffCollector } from '../agents/qa/test-file-diff.collector';
import { PackageTestScriptReader } from '../workspace/commands/package-test-script.reader';
import type { QaReport } from '../agents/qa/qa-report.types';
import type { QaResult } from '../agents/qa/qa-result.types';
import { ReviewReportBuilder } from '../agents/reviewer/review-report.builder';
import type { ReviewResult } from '../agents/reviewer/review-result.types';
import { AgentEventKind } from '../events/agent-event-kind.enum';
import { EventBus } from '../events/event-bus';
import { GitService } from '../workspace/git/git.service';
import { AgentFailurePolicy } from './agents/agent-failure.policy';
import { AgentInvocationError } from './agents/agent-invocation.error';
import type { AgentCallScope, AgentInvocation } from './agents/agent-invocation.types';
import { AttemptCarry } from './attempt-carry';
import { AttemptState } from './attempt-state';
import {
  ATTEMPT_REPOSITORY,
  FIRST_ATTEMPT,
  MAX_STEP_ATTEMPTS,
  OPTIONAL_CALL_TOKEN_RESERVE,
  STEP_AGENT_SEQUENCE,
} from './execution.constants';
import { ExecutionMessages } from './execution.messages';
import type { AttemptOutcome, StepRunContext, StepRunResult } from './execution.types';
import type { AttemptRepository } from './persistence/attempt-repository.port.types';

const ENTRY_SEPARATOR = '; ';
const EMPTY = 0;

// Runs one plan step: Developer, QA and Reviewer in the order of STEP_AGENT_SEQUENCE, then the
// decision of the Orchestrator, enforced by DecisionGuard, for at most MAX_STEP_ATTEMPTS
// attempts. It never interprets agent prose: it works with the typed reports, the guard outcome
// and what git reports.
@Injectable()
export class StepRunner {
  constructor(
    @Inject(GitService) private readonly git: GitService,
    @Inject(EventBus) private readonly events: EventBus,
    @Inject(ATTEMPT_REPOSITORY) private readonly attempts: AttemptRepository,
    @Inject(TestFileDiffCollector) private readonly testDiffs: TestFileDiffCollector,
    @Inject(PackageTestScriptReader) private readonly testScripts: PackageTestScriptReader,
  ) {}

  async run(context: StepRunContext): Promise<StepRunResult> {
    const outcomes: AttemptOutcome[] = [];
    const deferredIssues: DeferredIssue[] = [];
    const decisions: PreviousAttemptDecision[] = [];
    const carry = new AttemptCarry();

    for (let attempt = FIRST_ATTEMPT; attempt <= MAX_STEP_ATTEMPTS; attempt += 1) {
      this.events.emit({
        kind: AgentEventKind.AttemptStarted,
        runId: context.runId,
        at: Date.now(),
        index: context.step.index,
        attempt,
        maxAttempts: MAX_STEP_ATTEMPTS,
      });

      const state = new AttemptState(attempt, Date.now(), context.budget.spent());
      state.attemptId = await this.attempts.openAttempt({
        runId: context.runId,
        stepIndex: context.step.index,
        attempt,
      });
      await this.runAttempt(context, state, carry, decisions);

      const outcome = state.outcome(context.budget.spent());
      outcomes.push(outcome);
      await this.persist(state, outcome);

      const { guarded } = state;
      if (guarded === null) {
        carry.fromNote(state.note, state.changedCode);
      } else {
        StepRunner.collectDeferred(deferredIssues, guarded.decision.deferredIssues);
        decisions.push(StepRunner.previousDecision(attempt, guarded.decision));

        if (guarded.effective === StepDecisionKind.Accept) {
          return StepRunner.accepted(StepRunner.summaryOf(state), outcomes, deferredIssues);
        }
        if (guarded.effective === StepDecisionKind.Abort) {
          return StepRunner.failed(
            [guarded.decision.reason, ...guarded.overrideReasons].join(ENTRY_SEPARATOR),
            outcomes,
            deferredIssues,
          );
        }
        const { qaReport, reviewReport } = state;
        if (qaReport !== null && reviewReport !== null) {
          carry.fromDecision(
            ReworkBriefBuilder.build(guarded.decision, qaReport, reviewReport),
            qaReport.result.defects,
            reviewReport.result.issues,
            state.changedCode,
          );
        }
      }
      if (attempt >= MAX_STEP_ATTEMPTS) {
        return StepRunner.failed(
          ExecutionMessages.attemptLimit(MAX_STEP_ATTEMPTS),
          outcomes,
          deferredIssues,
        );
      }
    }

    return StepRunner.failed(
      ExecutionMessages.attemptLimit(MAX_STEP_ATTEMPTS),
      outcomes,
      deferredIssues,
    );
  }

  private async runAttempt(
    context: StepRunContext,
    state: AttemptState,
    carry: AttemptCarry,
    decisions: readonly PreviousAttemptDecision[],
  ): Promise<void> {
    for (const role of STEP_AGENT_SEQUENCE) {
      if (state.verificationSkipped) {
        return;
      }
      await this.runRole(role, context, state, carry);
    }
    if (!state.verificationSkipped) {
      await this.decide(context, state, decisions);
    }
  }

  private async runRole(
    role: DefinedAgentRole,
    context: StepRunContext,
    state: AttemptState,
    carry: AttemptCarry,
  ): Promise<void> {
    if (role === AgentRole.Developer) {
      return this.runDeveloper(context, state, carry);
    }
    if (role === AgentRole.Qa) {
      return this.runQa(context, state, carry);
    }
    return this.runReviewer(context, state, carry);
  }

  private async runDeveloper(
    context: StepRunContext,
    state: AttemptState,
    carry: AttemptCarry,
  ): Promise<void> {
    const input = DeveloperInputRenderer.render({
      step: context.step,
      completedSteps: context.completedSteps,
      attempt: state.attempt,
      maxAttempts: MAX_STEP_ATTEMPTS,
      reworkBrief: carry.reworkBrief,
      systemNote: carry.systemNote,
      changedCode: carry.changedCode,
    });
    const invocation = await this.invoke<DeveloperResult>(
      context,
      AgentRole.Developer,
      input,
      state,
    );
    if (invocation === null) {
      return;
    }
    state.developerReport = DeveloperReportBuilder.build(
      invocation.output,
      invocation.changes,
      invocation.usage,
      invocation.toolCalls,
      invocation.durationMs,
    );
    // git, not the Developer, says what changed.
    state.changedCode = await this.git.changedFiles(context.baseRef);
    state.reviewScope = state.changedCode;

    if (state.changedCode.length === EMPTY) {
      state.skipVerification(
        invocation.output.status === DeveloperStatus.Blocked
          ? ExecutionMessages.developerBlocked(invocation.output.openIssues)
          : ExecutionMessages.noChangedFiles(),
      );
    }
  }

  private async runQa(
    context: StepRunContext,
    state: AttemptState,
    carry: AttemptCarry,
  ): Promise<void> {
    state.brief = await this.brief(context, state);

    const input = QaInputRenderer.render({
      step: context.step,
      changedCode: state.changedCode,
      developerNotes: state.developerReport?.result ?? null,
      brief: state.brief,
      completedSteps: context.completedSteps,
      attempt: state.attempt,
      maxAttempts: MAX_STEP_ATTEMPTS,
      previousDefects: carry.previousDefects,
    });
    const invocation = await this.invoke<QaResult>(context, AgentRole.Qa, input, state);
    if (invocation === null) {
      return;
    }
    // The tests QA wrote are part of what the Reviewer reviews.
    state.reviewScope = await this.git.changedFiles(context.baseRef);
    state.qaReport = QaReportBuilder.build(
      invocation.output,
      state.changedCode,
      invocation.commandRuns,
      invocation.changes,
      invocation.usage,
      invocation.toolCalls,
      invocation.durationMs,
      await this.testDiffs.collect(context.baseRef, state.reviewScope),
      await this.testScripts.read(),
    );
  }

  private async runReviewer(
    context: StepRunContext,
    state: AttemptState,
    carry: AttemptCarry,
  ): Promise<void> {
    const input = ReviewInputRenderer.render({
      step: context.step,
      changedCode: state.reviewScope,
      developerNotes: state.developerReport?.result ?? null,
      qaFacts: StepRunner.qaFacts(state.qaReport),
      completedSteps: context.completedSteps,
      attempt: state.attempt,
      maxAttempts: MAX_STEP_ATTEMPTS,
      previousIssues: carry.previousIssues,
    });
    const invocation = await this.invoke<ReviewResult>(context, AgentRole.Reviewer, input, state);
    if (invocation === null) {
      return;
    }
    state.reviewReport = ReviewReportBuilder.build(
      invocation.output,
      state.reviewScope,
      invocation.readPaths,
      invocation.usage,
      invocation.toolCalls,
      invocation.durationMs,
    );
  }

  // Optional: it only sharpens the focus of QA, so a low budget skips it.
  private async brief(context: StepRunContext, state: AttemptState): Promise<QaBrief | null> {
    if (state.developerReport === null || !context.budget.allows(OPTIONAL_CALL_TOKEN_RESERVE)) {
      return null;
    }
    const input = BriefInputRenderer.render({
      step: context.step,
      changedCode: state.changedCode,
      developerReport: state.developerReport,
    });
    const invocation = await context.caller.orchestrator<QaBrief>(
      OrchestratorTask.Brief,
      input,
      StepRunner.scopeOf(context, state),
    );

    return invocation.output;
  }

  private async decide(
    context: StepRunContext,
    state: AttemptState,
    decisions: readonly PreviousAttemptDecision[],
  ): Promise<void> {
    const { developerReport, qaReport, reviewReport } = state;
    if (developerReport === null || qaReport === null || reviewReport === null) {
      state.skipVerification(ExecutionMessages.incompleteAttempt());
      return;
    }
    const input = DecisionInputRenderer.render({
      step: context.step,
      attempt: state.attempt,
      maxAttempts: MAX_STEP_ATTEMPTS,
      developerReport,
      qaReport,
      reviewReport,
      previousAttempts: decisions,
    });
    const invocation = await context.caller.orchestrator<StepDecision>(
      OrchestratorTask.Decide,
      input,
      StepRunner.scopeOf(context, state),
    );
    const guarded = DecisionGuard.apply(
      invocation.output,
      qaReport,
      reviewReport,
      state.attempt,
      MAX_STEP_ATTEMPTS,
    );
    state.guarded = guarded;

    this.events.emit({
      kind: AgentEventKind.DecisionMade,
      runId: context.runId,
      at: Date.now(),
      index: context.step.index,
      attempt: state.attempt,
      decision: guarded.original,
      reason: guarded.decision.reason,
    });
    if (guarded.overridden) {
      this.events.emit({
        kind: AgentEventKind.DecisionOverridden,
        runId: context.runId,
        at: Date.now(),
        index: context.step.index,
        attempt: state.attempt,
        original: guarded.original,
        effective: guarded.effective,
        reasons: guarded.overrideReasons,
      });
    }
  }

  // Returns null when the call failed in a way the attempt can absorb: the note is recorded and
  // the attempt becomes a rework. Anything else is rethrown and ends the run.
  private async invoke<TOutput>(
    context: StepRunContext,
    role: AgentRole,
    input: string,
    state: AttemptState,
  ): Promise<AgentInvocation<TOutput> | null> {
    try {
      return await context.caller.agent<TOutput>(role, input, StepRunner.scopeOf(context, state));
    } catch (error) {
      const note =
        error instanceof AgentInvocationError ? AgentFailurePolicy.reworkNote(error) : null;
      if (note === null) {
        throw error;
      }
      state.skipVerification(note);
      return null;
    }
  }

  // An attempt whose row could not be opened is still run and still reported; only its stored
  // copy is missing, which the guarded write has already logged.
  private async persist(state: AttemptState, outcome: AttemptOutcome): Promise<void> {
    const { attemptId } = state;
    if (attemptId === null) {
      return;
    }
    await this.attempts.completeAttempt({
      attemptId,
      developerReport: outcome.developerReport,
      qaReport: outcome.qaReport,
      reviewReport: outcome.reviewReport,
      decision: outcome.guarded?.decision ?? null,
      guarded: outcome.guarded,
      changedFiles: state.reviewScope,
      note: outcome.note,
      durationMs: outcome.durationMs,
    });
  }

  private static qaFacts(report: QaReport | null): QaFactsForReview | null {
    if (report === null) {
      return null;
    }
    const covered = report.result.coverage.filter(
      (entry) => entry.level === CoverageLevel.Covered,
    ).length;

    return {
      status: report.status,
      lastFullRun: report.lastFullRun,
      defects: report.result.defects,
      coverageSummary: ExecutionMessages.coverageSummary(covered, report.result.coverage.length),
      uncoverableCriteria: report.uncoverableCriteria,
      testFiles: report.result.testFiles,
      warnings: report.warnings,
    };
  }

  private static scopeOf(context: StepRunContext, state: AttemptState): AgentCallScope {
    return {
      stepIndex: context.step.index,
      attempt: state.attempt,
      attemptId: state.attemptId,
    };
  }

  // The same finding can be deferred in every attempt of a step; the step defers it once.
  private static collectDeferred(
    collected: DeferredIssue[],
    deferred: readonly DeferredIssue[],
  ): void {
    for (const issue of deferred) {
      if (!collected.some((known) => known.issue === issue.issue)) {
        collected.push(issue);
      }
    }
  }

  private static previousDecision(
    attempt: number,
    decision: StepDecision,
  ): PreviousAttemptDecision {
    return {
      attempt,
      decision: decision.decision,
      reason: decision.reason,
      reworkFocus: decision.reworkFocus,
    };
  }

  private static summaryOf(state: AttemptState): string {
    return (
      state.guarded?.decision.stepSummary ??
      state.developerReport?.result.summary ??
      ''
    ).trim();
  }

  private static accepted(
    summary: string,
    attempts: readonly AttemptOutcome[],
    deferredIssues: readonly DeferredIssue[],
  ): StepRunResult {
    return { accepted: true, summary, failureReason: null, attempts, deferredIssues };
  }

  private static failed(
    reason: string,
    attempts: readonly AttemptOutcome[],
    deferredIssues: readonly DeferredIssue[],
  ): StepRunResult {
    return { accepted: false, summary: '', failureReason: reason, attempts, deferredIssues };
  }
}
