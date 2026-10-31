import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { DeveloperResult } from '../developer/developer-result.types';
import type { QaFullRun } from '../qa/qa-report.types';
import type { QaDefect, QaTestFile } from '../qa/qa-result.types';
import type { QaStatus } from '../qa/qa-status.enum';
import type { ReviewIssue } from '../reviewer/review-result.types';
import type { CompletedStepSummary, PlanStepContext } from './step-context.types';

export interface QaFactsForReview {
  readonly status: QaStatus;
  readonly lastFullRun: QaFullRun | null;
  readonly defects: readonly QaDefect[];
  readonly coverageSummary: string;
  readonly testFiles: readonly QaTestFile[];
  readonly warnings: readonly string[];
}

export interface ReviewInputPacket {
  readonly step: PlanStepContext;
  readonly changedCode: readonly ChangedFile[];
  readonly developerNotes: DeveloperResult | null;
  readonly qaFacts: QaFactsForReview | null;
  readonly completedSteps: readonly CompletedStepSummary[];
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly previousIssues: readonly ReviewIssue[];
}
