import { Injectable } from '@nestjs/common';
import { RunStatus } from '../run-status.enum';
import { StepStatus } from '../step-status.enum';
import type { PlanRepository } from './plan-repository.port.types';
import type {
  NewRun,
  PlanDraft,
  PlanStepRecord,
  RunClosure,
  RunRecord,
  StepStatusUpdate,
} from './persistence.types';

const FIRST_STEP_INDEX = 1;
const NO_TOKENS = 0;
const NO_ATTEMPTS = 0;

// The default store until the PostgreSQL repositories exist: it keeps the same rows in memory,
// so a run is complete and inspectable without a database.
@Injectable()
export class InMemoryPlanRepository implements PlanRepository {
  private readonly runs = new Map<string, RunRecord>();

  async openRun(run: NewRun): Promise<void> {
    this.runs.set(run.runId, {
      runId: run.runId,
      prompt: run.prompt,
      branch: run.branch,
      status: RunStatus.Running,
      planSummary: '',
      reportPath: null,
      tokensTotal: NO_TOKENS,
      startedAt: new Date(),
      finishedAt: null,
      steps: [],
    });
  }

  async createPlan(plan: PlanDraft): Promise<void> {
    const run = this.require(plan.runId);
    const steps: PlanStepRecord[] = plan.steps.map((step, position) => ({
      index: position + FIRST_STEP_INDEX,
      title: step.title,
      description: step.description,
      acceptanceCriteria: step.acceptanceCriteria,
      status: StepStatus.Pending,
      attempts: NO_ATTEMPTS,
      summary: '',
      commitSha: null,
      startedAt: null,
      finishedAt: null,
    }));

    this.runs.set(run.runId, { ...run, planSummary: plan.summary, steps });
  }

  async updateStepStatus(update: StepStatusUpdate): Promise<void> {
    const run = this.require(update.runId);
    const steps = run.steps.map((step) =>
      step.index === update.index ? InMemoryPlanRepository.merge(step, update) : step,
    );

    this.runs.set(run.runId, { ...run, steps });
  }

  async closeRun(closure: RunClosure): Promise<void> {
    const run = this.require(closure.runId);
    this.runs.set(run.runId, {
      ...run,
      status: closure.status,
      reportPath: closure.reportPath,
      tokensTotal: closure.tokensTotal,
      finishedAt: new Date(),
    });
  }

  async loadRun(runId: string): Promise<RunRecord | null> {
    return this.runs.get(runId) ?? null;
  }

  private require(runId: string): RunRecord {
    const run = this.runs.get(runId);
    if (run === undefined) {
      throw new Error(`run ${runId} was not opened`);
    }
    return run;
  }

  private static merge(step: PlanStepRecord, update: StepStatusUpdate): PlanStepRecord {
    return {
      ...step,
      status: update.status,
      attempts: update.attempts ?? step.attempts,
      summary: update.summary ?? step.summary,
      commitSha: update.commitSha === undefined ? step.commitSha : update.commitSha,
      startedAt: update.startedAt ?? step.startedAt,
      finishedAt: update.finishedAt ?? step.finishedAt,
    };
  }
}
