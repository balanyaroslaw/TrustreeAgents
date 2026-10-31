import type { ChangedFile } from '../../../workspace/git/changed-file.types';
import type { PlanStepContext } from '../../context/step-context.types';
import type { DeveloperReport } from '../../developer/developer-report.types';

export interface BriefInputPacket {
  readonly step: PlanStepContext;
  readonly changedCode: readonly ChangedFile[];
  readonly developerReport: DeveloperReport;
}
