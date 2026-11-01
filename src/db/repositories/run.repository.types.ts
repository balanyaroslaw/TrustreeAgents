import type { RunStatus } from '../../execution/run-status.enum';
import type { PlanStepWithAttempts } from './plan.repository.types';

export interface NewRun {
  readonly projectId: string;
  readonly prompt: string;
}

export interface RunRecord {
  readonly id: string;
  readonly projectId: string;
  readonly prompt: string;
  readonly status: RunStatus;
  readonly branch: string | null;
  readonly planSummary: string | null;
  readonly assumptions: readonly string[];
  readonly reportPath: string | null;
  readonly tokensTotal: number;
  readonly costUsd: number;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly failureReason: string | null;
}

export interface RunListRow {
  readonly id: string;
  readonly prompt: string;
  readonly status: RunStatus;
  readonly startedAt: Date;
  readonly durationMs: number | null;
  readonly stepsTotal: number;
  readonly stepsAccepted: number;
  readonly tokensTotal: number;
  readonly costUsd: number;
}

export interface RunDetail extends RunRecord {
  readonly steps: readonly PlanStepWithAttempts[];
}

export interface RunTotals {
  readonly tokensTotal: number;
  readonly costUsd: number;
}
