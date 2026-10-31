import type { DeferredIssue } from '../decide/step-decision.types';
import type { StepDecisionKind } from '../decide/step-decision.enum';
import type { RunPlan } from '../plan/run-plan.types';

export interface StepOutcome {
  readonly index: number;
  readonly title: string;
  readonly decision: StepDecisionKind;
  readonly summary: string;
}

export interface SummaryInputPacket {
  readonly userPrompt: string;
  readonly plan: RunPlan;
  readonly steps: readonly StepOutcome[];
  readonly deferredIssues: readonly DeferredIssue[];
}
