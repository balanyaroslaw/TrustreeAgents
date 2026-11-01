import type { StepStatus } from '../../execution/step-status.enum';
import type { StepAttemptRecord } from './attempt.repository.types';

export interface PlanStepRecord {
  readonly id: string;
  readonly runId: string;
  readonly index: number;
  readonly title: string;
  readonly description: string;
  readonly acceptanceCriteria: readonly string[];
  readonly status: StepStatus;
  readonly attemptsUsed: number;
  readonly summary: string | null;
  readonly commitSha: string | null;
  readonly failureReason: string | null;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
}

export interface PlanStepWithAttempts extends PlanStepRecord {
  readonly attempts: readonly StepAttemptRecord[];
}
