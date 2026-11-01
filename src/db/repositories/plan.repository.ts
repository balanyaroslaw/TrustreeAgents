import { Inject, Injectable } from '@nestjs/common';
import { JsonValue } from '../json.value';
import { PrismaService } from '../prisma.service';
import { STEP_STATUS_TO_DB } from '../db.constants';
import type {
  NewRun,
  PlanDraft,
  RunClosure,
  StepStatusUpdate,
} from '../../execution/persistence/persistence.types';
import type { PlanRepository as PlanRepositoryPort } from '../../execution/persistence/plan-repository.port.types';
import { FIRST_STEP_INDEX } from '../../execution/execution.constants';
import { GuardedRepository } from './guarded.repository';
import { RunRepository } from './run.repository';

// The plan of a run as the executor needs it. Steps are addressed by their position in the plan,
// which is what the executor knows, and resolved to their row here. The columns of the run row
// itself stay with RunRepository, so one row is never written by two repositories.
@Injectable()
export class PlanRepository extends GuardedRepository implements PlanRepositoryPort {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RunRepository) private readonly runs: RunRepository,
  ) {
    super();
  }

  // The run row is created by the command that owns the project; what the executor adds is the
  // branch it works on.
  async openRun(run: NewRun): Promise<void> {
    await this.runs.setBranch(run.runId, run.branch);
  }

  // The steps of a plan are written once, in their plan order.
  async createPlan(plan: PlanDraft): Promise<void> {
    await this.runs.setPlan(plan.runId, plan.summary, plan.assumptions);
    await this.guardWrite('create the plan steps', () =>
      this.prisma.planStep.createMany({
        data: plan.steps.map((step, position) => ({
          runId: plan.runId,
          index: position + FIRST_STEP_INDEX,
          title: step.title,
          description: step.description,
          acceptanceCriteria: JsonValue.required(step.acceptanceCriteria),
        })),
      }),
    );
  }

  async updateStepStatus(update: StepStatusUpdate): Promise<void> {
    await this.guardWrite('update the step', () =>
      this.prisma.planStep.update({
        where: { runId_index: { runId: update.runId, index: update.index } },
        data: {
          status: STEP_STATUS_TO_DB[update.status],
          ...(update.attempts === undefined ? {} : { attemptsUsed: update.attempts }),
          ...(update.summary === undefined ? {} : { summary: update.summary }),
          ...(update.commitSha === undefined ? {} : { commitSha: update.commitSha }),
          ...(update.failureReason === undefined ? {} : { failureReason: update.failureReason }),
          ...(update.startedAt === undefined ? {} : { startedAt: update.startedAt }),
          ...(update.finishedAt === undefined ? {} : { finishedAt: update.finishedAt }),
        },
      }),
    );
  }

  // The tokens and cost of the run are recomputed from its agent calls, so the closed row never
  // carries a total kept by hand.
  async closeRun(closure: RunClosure): Promise<void> {
    await this.runs.recomputeTotals(closure.runId);
    await this.runs.close(
      closure.runId,
      closure.status,
      closure.reportPath,
      closure.failureReason,
    );
  }
}
