import type { StepDecisionKind } from '../../agents/orchestrator/decide/step-decision.enum';

// The reports are stored exactly as the report builders produced them, so they stay unknown here
// and are read back from jsonb untouched.
export interface StepAttemptRecord {
  readonly id: string;
  readonly stepId: string;
  readonly attempt: number;
  readonly developerReport: unknown;
  readonly qaReport: unknown;
  readonly reviewReport: unknown;
  readonly decision: unknown;
  readonly guarded: unknown;
  readonly changedFiles: unknown;
  // Why the attempt ended without a decision, when the code and not the Orchestrator ended it.
  readonly note: string | null;
  readonly effectiveDecision: StepDecisionKind | null;
  readonly overridden: boolean;
  readonly tokensTotal: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly createdAt: Date;
}
