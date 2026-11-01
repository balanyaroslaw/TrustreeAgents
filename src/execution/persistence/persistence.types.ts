import type { GuardedDecision } from '../../agents/orchestrator/decide/decision-outcome.types';
import type { StepDecision } from '../../agents/orchestrator/decide/step-decision.types';
import type { RunPlanStep } from '../../agents/orchestrator/plan/run-plan.types';
import type { DeveloperReport } from '../../agents/developer/developer-report.types';
import type { QaReport } from '../../agents/qa/qa-report.types';
import type { ReviewReport } from '../../agents/reviewer/review-report.types';
import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { RunStatus } from '../run-status.enum';
import type { StepStatus } from '../step-status.enum';

// The run row itself is created by the command, which owns the project it belongs to. What the
// executor adds is the branch it works on.
export interface NewRun {
  readonly runId: string;
  readonly prompt: string;
  readonly branch: string;
}

export interface PlanDraft {
  readonly runId: string;
  readonly summary: string;
  readonly assumptions: readonly string[];
  readonly steps: readonly RunPlanStep[];
}

export interface StepStatusUpdate {
  readonly runId: string;
  readonly index: number;
  readonly status: StepStatus;
  readonly attempts?: number;
  readonly summary?: string;
  readonly commitSha?: string | null;
  readonly failureReason?: string | null;
  readonly startedAt?: Date;
  readonly finishedAt?: Date;
}

// The tokens and the cost of a run are recomputed from its agent calls when it closes, so no
// total is passed in here.
export interface RunClosure {
  readonly runId: string;
  readonly status: RunStatus;
  readonly reportPath: string | null;
  readonly failureReason: string | null;
}

// An attempt is opened before its agents run, so every agent call made inside it can be written
// with its attempt id, and completed afterwards with what it produced.
export interface NewAttempt {
  readonly runId: string;
  readonly stepIndex: number;
  readonly attempt: number;
}

// One attempt of one step, with the three reports, the decision of the Orchestrator and what the
// guard made of it. Stored as it happened: nothing here is recomputed later.
// The effective decision and whether it was overridden are read from the guard outcome, and the
// tokens and the cost from the agent calls of the attempt, so nothing here is stated twice.
export interface AttemptCompletion {
  readonly attemptId: string;
  readonly developerReport: DeveloperReport | null;
  readonly qaReport: QaReport | null;
  readonly reviewReport: ReviewReport | null;
  readonly decision: StepDecision | null;
  readonly guarded: GuardedDecision | null;
  readonly changedFiles: readonly ChangedFile[];
  readonly note: string | null;
  readonly durationMs: number;
}
