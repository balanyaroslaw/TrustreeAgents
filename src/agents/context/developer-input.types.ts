import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { ReworkBrief } from '../orchestrator/decide/rework-brief.types';
import type { CompletedStepSummary, PlanStepContext } from './step-context.types';

export interface DeveloperInputPacket {
  readonly step: PlanStepContext;
  readonly completedSteps: readonly CompletedStepSummary[];
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly reworkBrief: ReworkBrief | null;
  // What the code observed about the previous attempt, for example that no file changed. It is a
  // recorded fact, not the judgement of the Orchestrator, so it is shown separately.
  readonly systemNote: string | null;
  readonly changedCode: readonly ChangedFile[];
}
