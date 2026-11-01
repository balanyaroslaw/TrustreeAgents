import { AgentRole } from '../../agents/agent-role.enum';
import type { QaStatus } from '../../agents/qa/qa-status.enum';
import type { ReviewVerdict } from '../../agents/reviewer/review-verdict.enum';
import type { AgentCallLedger } from '../agents/agent-call.ledger';
import type { RunBudget } from '../budget/run-budget';
import type { AttemptOutcome, RunRequest, StepOutcome } from '../execution.types';
import { RunIdFormatter } from '../run-id.formatter';
import type { RunState } from '../run-state';
import type {
  RunReport,
  RunReportAgentMetrics,
  RunReportMetrics,
  RunReportStep,
  RunReportStepMetrics,
} from './run-report.types';

const NONE = 0;
const LAST = -1;

const REPORTED_ROLES: readonly AgentRole[] = [
  AgentRole.Orchestrator,
  AgentRole.Developer,
  AgentRole.Qa,
  AgentRole.Reviewer,
];

export class RunReportBuilder {
  static build(
    request: RunRequest,
    state: RunState,
    ledger: AgentCallLedger,
    budget: RunBudget,
  ): RunReport {
    return {
      runId: request.runId,
      shortId: RunIdFormatter.short(request.runId),
      prompt: request.prompt,
      branch: state.branch,
      status: state.status,
      durationMs: state.durationMs(),
      planSummary: state.planSummary,
      assumptions: state.plan?.assumptions ?? [],
      questions: state.questions,
      steps: state.steps.map((step) => RunReportBuilder.step(step, ledger)),
      deferredIssues: state.deferredIssues,
      stoppedReason: state.stoppedReason,
      summary: state.summary,
      metrics: RunReportBuilder.metrics(state, ledger, budget),
    };
  }

  private static step(step: StepOutcome, ledger: AgentCallLedger): RunReportStep {
    const last = RunReportBuilder.lastAttempt(step.attempts);

    return {
      index: step.index,
      title: step.title,
      status: step.status,
      attempts: step.attempts.length,
      summary: step.summary,
      commitSha: step.commitSha,
      failureReason: step.failureReason,
      note: step.note,
      qaStatus: RunReportBuilder.qaStatusOf(last),
      reviewVerdict: RunReportBuilder.verdictOf(last),
      // The same override fires in every attempt; the report lists each reason once.
      overrideReasons: [
        ...new Set(step.attempts.flatMap((attempt) => attempt.guarded?.overrideReasons ?? [])),
      ],
      tokens: RunReportBuilder.tokensOfStep(step.index, ledger),
    };
  }

  private static metrics(
    state: RunState,
    ledger: AgentCallLedger,
    budget: RunBudget,
  ): RunReportMetrics {
    return {
      tokensTotal: ledger.tokensTotal(),
      tokenBudget: budget.total(),
      agentCalls: ledger.all().length,
      toolCalls: ledger.toolCalls(),
      commandRuns: ledger.commandRuns(),
      byAgent: REPORTED_ROLES.map((role) => RunReportBuilder.agentMetrics(role, ledger)).filter(
        (metrics) => metrics.calls > NONE,
      ),
      byStep: state.steps.map((step) => RunReportBuilder.stepMetrics(step.index, ledger)),
    };
  }

  private static agentMetrics(role: AgentRole, ledger: AgentCallLedger): RunReportAgentMetrics {
    const calls = ledger.ofRole(role);

    return {
      agent: role,
      calls: calls.length,
      tokens: calls.reduce((total, call) => total + call.tokens.total, NONE),
      toolCalls: calls.reduce((total, call) => total + call.toolCalls, NONE),
      commandRuns: calls.reduce((total, call) => total + call.commandRuns, NONE),
    };
  }

  private static stepMetrics(index: number, ledger: AgentCallLedger): RunReportStepMetrics {
    const calls = ledger.ofStep(index);

    return {
      index,
      tokens: calls.reduce((total, call) => total + call.tokens.total, NONE),
      toolCalls: calls.reduce((total, call) => total + call.toolCalls, NONE),
      commandRuns: calls.reduce((total, call) => total + call.commandRuns, NONE),
    };
  }

  private static tokensOfStep(index: number, ledger: AgentCallLedger): number {
    return ledger.ofStep(index).reduce((total, call) => total + call.tokens.total, NONE);
  }

  private static lastAttempt(attempts: readonly AttemptOutcome[]): AttemptOutcome | null {
    return attempts.length === NONE ? null : attempts[attempts.length + LAST];
  }

  private static qaStatusOf(attempt: AttemptOutcome | null): QaStatus | null {
    return attempt?.qaReport?.status ?? null;
  }

  private static verdictOf(attempt: AttemptOutcome | null): ReviewVerdict | null {
    return attempt?.reviewReport?.verdict ?? null;
  }
}
