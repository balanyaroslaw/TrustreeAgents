import type { AgentRole } from '../agents/agent-role.enum';
import type { CompletedStepSummary, PlanStepContext } from '../agents/context/step-context.types';
import type { DeveloperReport, TokenMetrics } from '../agents/developer/developer-report.types';
import type { GuardedDecision } from '../agents/orchestrator/decide/decision-outcome.types';
import type { DeferredIssue } from '../agents/orchestrator/decide/step-decision.types';
import type { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import type { QaReport } from '../agents/qa/qa-report.types';
import type { ReviewReport } from '../agents/reviewer/review-report.types';
import type { AgentCallRunner } from './agents/agent-call.runner';
import type { AgentFailureKind } from './agents/agent-failure.enum';
import type { RunBudget } from './budget/run-budget';
import type { RunStatus } from './run-status.enum';
import type { StepStatus } from './step-status.enum';

export interface RunRequest {
  readonly runId: string;
  readonly workspacePath: string;
  readonly prompt: string;
  readonly attended: boolean;
  readonly tokenBudget?: number;
  readonly timeoutMs?: number;
}

// What the workspace looks like before planning: the Orchestrator is told whether it starts from
// an empty folder and which documents it can read.
export interface WorkspaceSurvey {
  readonly isExistingProject: boolean;
  readonly documents: readonly string[];
}

// One agent call as it is accounted for: the same row that goes to agent_calls.
export interface AgentCallRecord {
  readonly runId: string;
  readonly role: AgentRole;
  readonly task: OrchestratorTask | null;
  readonly stepIndex: number | null;
  readonly attempt: number | null;
  readonly tokens: TokenMetrics;
  readonly toolCalls: number;
  readonly commandRuns: number;
  readonly durationMs: number;
  readonly failure: AgentFailureKind | null;
}

export interface AttemptOutcome {
  readonly attempt: number;
  readonly developerReport: DeveloperReport | null;
  readonly qaReport: QaReport | null;
  readonly reviewReport: ReviewReport | null;
  readonly guarded: GuardedDecision | null;
  // Set when the code, not the Orchestrator, ended the attempt: no file changed, the agent ran
  // out of turns, or it never produced a valid answer.
  readonly note: string | null;
  readonly tokens: number;
  readonly durationMs: number;
}

export interface StepRunResult {
  readonly accepted: boolean;
  readonly summary: string;
  readonly failureReason: string | null;
  readonly attempts: readonly AttemptOutcome[];
  readonly deferredIssues: readonly DeferredIssue[];
}

export interface StepOutcome {
  readonly index: number;
  readonly title: string;
  readonly status: StepStatus;
  readonly summary: string;
  readonly commitSha: string | null;
  readonly failureReason: string | null;
  // What the code observed about the step itself, for example that it changed no file and
  // therefore has no commit.
  readonly note: string | null;
  readonly attempts: readonly AttemptOutcome[];
  readonly deferredIssues: readonly DeferredIssue[];
}

export interface StepRunContext {
  readonly runId: string;
  readonly step: PlanStepContext;
  readonly completedSteps: readonly CompletedStepSummary[];
  readonly baseRef: string;
  readonly signal: AbortSignal;
  readonly budget: RunBudget;
  readonly caller: AgentCallRunner;
}

export interface StepCommitContext {
  readonly runId: string;
  readonly index: number;
  readonly total: number;
  readonly title: string;
}

export interface RunOutcome {
  readonly runId: string;
  readonly status: RunStatus;
  readonly branch: string | null;
  readonly reportPath: string | null;
  readonly planSummary: string;
  readonly questions: readonly string[];
  readonly steps: readonly StepOutcome[];
  readonly stoppedReason: string | null;
  readonly tokensTotal: number;
  readonly durationMs: number;
}
