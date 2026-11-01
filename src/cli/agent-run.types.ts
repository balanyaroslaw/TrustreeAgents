import type { PlanStepContext } from '../agents/context/step-context.types';
import type { ChangedFile } from '../workspace/git/changed-file.types';

// The input one single-agent call gets, built by code from the task text and from git.
export interface AgentRunInput {
  readonly inputText: string;
  readonly step: PlanStepContext | null;
  readonly changedCode: readonly ChangedFile[];
}
