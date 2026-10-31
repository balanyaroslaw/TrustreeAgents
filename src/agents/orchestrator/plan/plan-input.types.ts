export interface AnsweredQuestion {
  readonly question: string;
  readonly answer: string;
}

export interface PlanInputPacket {
  readonly userPrompt: string;
  readonly isExistingProject: boolean;
  readonly workspaceDocuments: readonly string[];
  readonly previousQuestionsAndAnswers: readonly AnsweredQuestion[];
}
