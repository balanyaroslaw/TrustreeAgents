import type { StepDecisionKind } from '../../agents/orchestrator/decide/step-decision.enum';

// The reports are stored exactly as the report builders produced them, so they stay unknown here
// and are written to jsonb untouched.
export interface AttemptPayload {
  readonly developerReport?: unknown;
  readonly qaReport?: unknown;
  readonly reviewReport?: unknown;
  readonly decision?: unknown;
  readonly guarded?: unknown;
  readonly changedFiles?: unknown;
  readonly effectiveDecision?: StepDecisionKind | null;
  readonly overridden?: boolean;
  readonly tokensTotal?: number;
  readonly costUsd?: number;
  readonly durationMs?: number;
  // Calls recorded before the attempt row existed; they are attached in the same transaction.
  readonly agentCallIds?: readonly string[];
}

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
  readonly effectiveDecision: StepDecisionKind | null;
  readonly overridden: boolean;
  readonly tokensTotal: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly createdAt: Date;
}
