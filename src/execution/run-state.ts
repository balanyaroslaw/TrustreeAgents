import type { CompletedStepSummary, PlanStepContext } from '../agents/context/step-context.types';
import type { DeferredIssue } from '../agents/orchestrator/decide/step-decision.types';
import type { RunPlan } from '../agents/orchestrator/plan/run-plan.types';
import type { RunSummary } from '../agents/orchestrator/summarize/run-summary.types';
import type { StepOutcome } from './execution.types';
import { RunStatus } from './run-status.enum';
import { StepStatus } from './step-status.enum';

// Everything one run accumulates. It is written only by PlanExecutor and read by the report
// builder, so a stopped run still reports what it reached.
export class RunState {
  status: RunStatus = RunStatus.Running;
  branch: string | null = null;
  reportPath: string | null = null;
  plan: RunPlan | null = null;
  questions: readonly string[] = [];
  summary: RunSummary | null = null;
  stoppedReason: string | null = null;
  // The step that is running, so a run that stops inside one can still record it.
  currentStep: PlanStepContext | null = null;

  private readonly stepOutcomes: StepOutcome[] = [];
  private readonly accepted: CompletedStepSummary[] = [];
  private readonly deferred: DeferredIssue[] = [];

  constructor(private readonly startedAt: number) {}

  addStep(outcome: StepOutcome): void {
    this.stepOutcomes.push(outcome);
    this.deferred.push(...outcome.deferredIssues);
    if (outcome.status === StepStatus.Accepted) {
      this.accepted.push({
        index: outcome.index,
        title: outcome.title,
        summary: outcome.summary,
      });
    }
  }

  stop(status: RunStatus, reason: string | null): void {
    this.status = status;
    if (reason !== null) {
      this.stoppedReason = reason;
    }
  }

  get steps(): readonly StepOutcome[] {
    return this.stepOutcomes;
  }

  get completedSteps(): readonly CompletedStepSummary[] {
    return this.accepted;
  }

  get deferredIssues(): readonly DeferredIssue[] {
    return this.deferred;
  }

  get planSummary(): string {
    return this.plan?.summary ?? '';
  }

  hasOutcomeFor(index: number): boolean {
    return this.stepOutcomes.some((step) => step.index === index);
  }

  everyStepAccepted(): boolean {
    return this.stepOutcomes.every((step) => step.status === StepStatus.Accepted);
  }

  durationMs(): number {
    return Date.now() - this.startedAt;
  }
}
