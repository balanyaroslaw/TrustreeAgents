// One step that was attempted in this workspace before and failed, as code reads it back from
// plan_steps and step_attempts. The planner receives these rendered as text, never the rows.
export interface FailedStepSummary {
  readonly title: string;
  readonly attempts: number;
  readonly reason: string;
}
