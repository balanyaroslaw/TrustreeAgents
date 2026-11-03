import type { FailedStepSummary } from '../../agents/orchestrator/plan/failed-step.types';
import type { NewRun, PlanDraft, RunClosure, StepStatusUpdate } from './persistence.types';

// What the executor needs from the run and plan tables, and nothing more. The PostgreSQL
// implementation is PlanRepository in src/db/repositories; the executor only knows this port.
export interface PlanRepository {
  openRun(run: NewRun): Promise<void>;
  // The steps of this project that were given up in its last finished runs, newest first.
  failedSteps(projectId: string, limit: number): Promise<readonly FailedStepSummary[]>;
  createPlan(plan: PlanDraft): Promise<void>;
  updateStepStatus(update: StepStatusUpdate): Promise<void>;
  closeRun(closure: RunClosure): Promise<void>;
}
