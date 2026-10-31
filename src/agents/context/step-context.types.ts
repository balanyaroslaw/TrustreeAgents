export interface PlanStepContext {
  readonly index: number;
  readonly total: number;
  readonly title: string;
  readonly description: string;
  readonly acceptanceCriteria: readonly string[];
}

export interface CompletedStepSummary {
  readonly index: number;
  readonly title: string;
  readonly summary: string;
}
