import type { GuardedDecision } from '../../agents/orchestrator/decide/decision-outcome.types';
import type { StepDecision } from '../../agents/orchestrator/decide/step-decision.types';
import type { RunPlanStep } from '../../agents/orchestrator/plan/run-plan.types';
import type { DeveloperReport } from '../../agents/developer/developer-report.types';
import type { QaReport } from '../../agents/qa/qa-report.types';
import type { ReviewReport } from '../../agents/reviewer/review-report.types';
import type { RunStatus } from '../run-status.enum';
import type { StepStatus } from '../step-status.enum';

export interface NewRun {
  readonly runId: string;
  readonly prompt: string;
  readonly branch: string;
}

export interface PlanDraft {
  readonly runId: string;
  readonly summary: string;
  readonly steps: readonly RunPlanStep[];
}

export interface StepStatusUpdate {
  readonly runId: string;
  readonly index: number;
  readonly status: StepStatus;
  readonly attempts?: number;
  readonly summary?: string;
  readonly commitSha?: string | null;
  readonly startedAt?: Date;
  readonly finishedAt?: Date;
}

export interface RunClosure {
  readonly runId: string;
  readonly status: RunStatus;
  readonly reportPath: string | null;
  readonly tokensTotal: number;
}

export interface PlanStepRecord {
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly acceptanceCriteria: readonly string[];
  readonly status: StepStatus;
  readonly attempts: number;
  readonly summary: string;
  readonly commitSha: string | null;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
}

export interface RunRecord {
  readonly runId: string;
  readonly prompt: string;
  readonly branch: string;
  readonly status: RunStatus;
  readonly planSummary: string;
  readonly reportPath: string | null;
  readonly tokensTotal: number;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly steps: readonly PlanStepRecord[];
}

// One attempt of one step, with the three reports, the decision of the Orchestrator and what the
// guard made of it. Stored as it happened: nothing here is recomputed later.
export interface AttemptRecord {
  readonly runId: string;
  readonly stepIndex: number;
  readonly attempt: number;
  readonly developerReport: DeveloperReport | null;
  readonly qaReport: QaReport | null;
  readonly reviewReport: ReviewReport | null;
  readonly decision: StepDecision | null;
  readonly guarded: GuardedDecision | null;
  readonly note: string | null;
  readonly tokens: number;
  readonly durationMs: number;
  readonly createdAt: Date;
}
