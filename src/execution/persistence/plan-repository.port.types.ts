import type { NewRun, PlanDraft, RunClosure, StepStatusUpdate } from './persistence.types';

// What the executor needs from the run and plan tables, and nothing more. The PostgreSQL
// implementation is PlanRepository in src/db/repositories; the executor only knows this port.
export interface PlanRepository {
  openRun(run: NewRun): Promise<void>;
  createPlan(plan: PlanDraft): Promise<void>;
  updateStepStatus(update: StepStatusUpdate): Promise<void>;
  closeRun(closure: RunClosure): Promise<void>;
}
