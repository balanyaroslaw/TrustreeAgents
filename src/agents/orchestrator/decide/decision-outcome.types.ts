import type { StepDecisionKind } from './step-decision.enum';
import type { StepDecision } from './step-decision.types';

export interface GuardedDecision {
  readonly effective: StepDecisionKind;
  readonly original: StepDecisionKind;
  readonly overridden: boolean;
  readonly overrideReasons: readonly string[];
  readonly decision: StepDecision;
}
