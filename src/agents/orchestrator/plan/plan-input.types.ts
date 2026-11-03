import type { FailedStepSummary } from './failed-step.types';

export interface AnsweredQuestion {
  readonly question: string;
  readonly answer: string;
}

export interface PlanInputPacket {
  readonly userPrompt: string;
  readonly isExistingProject: boolean;
  readonly workspaceDocuments: readonly string[];
  // What was already tried in this workspace and failed, newest run first. Empty for a
  // workspace that has no finished run yet.
  readonly previousFailures: readonly FailedStepSummary[];
  readonly previousQuestionsAndAnswers: readonly AnsweredQuestion[];
}
