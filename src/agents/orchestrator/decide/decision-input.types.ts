import type { DeveloperReport } from '../../developer/developer-report.types';
import type { QaReport } from '../../qa/qa-report.types';
import type { ReviewReport } from '../../reviewer/review-report.types';
import type { PlanStepContext } from '../../context/step-context.types';
import type { StepDecisionKind } from './step-decision.enum';

export interface PreviousAttemptDecision {
  readonly attempt: number;
  readonly decision: StepDecisionKind;
  readonly reason: string;
  readonly reworkFocus: readonly string[];
}

export interface DecisionInputPacket {
  readonly step: PlanStepContext;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly developerReport: DeveloperReport;
  readonly qaReport: QaReport;
  readonly reviewReport: ReviewReport;
  readonly previousAttempts: readonly PreviousAttemptDecision[];
}
