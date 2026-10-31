import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { DeveloperResult } from '../developer/developer-result.types';
import type { QaDefect } from '../qa/qa-result.types';
import type { QaBrief } from './qa-brief.types';
import type { CompletedStepSummary, PlanStepContext } from './step-context.types';

export interface QaInputPacket {
  readonly step: PlanStepContext;
  readonly changedCode: readonly ChangedFile[];
  readonly developerNotes: DeveloperResult | null;
  readonly brief: QaBrief | null;
  readonly completedSteps: readonly CompletedStepSummary[];
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly previousDefects: readonly QaDefect[];
}
