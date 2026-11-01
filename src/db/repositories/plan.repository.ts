import { Inject, Injectable } from '@nestjs/common';
import { StepStatus as DbStepStatus } from '@prisma/client';
import { JsonValue } from '../json.value';
import { PrismaService } from '../prisma.service';
import { GuardedRepository } from './guarded.repository';
import { PlanStepMapper } from './plan-step.mapper';
import type { NewPlanStep, PlanStepRecord } from './plan.repository.types';

@Injectable()
export class PlanRepository extends GuardedRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  // The steps of a plan are written once, in their plan order.
  async createSteps(runId: string, steps: readonly NewPlanStep[]): Promise<PlanStepRecord[]> {
    const created = await this.prisma.$transaction(
      steps.map((step) =>
        this.prisma.planStep.create({
          data: {
            runId,
            index: step.index,
            title: step.title,
            description: step.description,
            acceptanceCriteria: JsonValue.required(step.acceptanceCriteria),
          },
        }),
      ),
    );

    return created.map(PlanStepMapper.toRecord);
  }

  async startStep(stepId: string): Promise<string | null> {
    return this.guardWrite('start the step', () =>
      this.prisma.planStep.update({
        where: { id: stepId },
        data: { status: DbStepStatus.in_progress, startedAt: new Date() },
      }),
    );
  }

  async acceptStep(
    stepId: string,
    summary: string,
    commitSha: string | null,
  ): Promise<string | null> {
    return this.guardWrite('accept the step', () =>
      this.prisma.planStep.update({
        where: { id: stepId },
        data: {
          status: DbStepStatus.accepted,
          summary,
          commitSha,
          finishedAt: new Date(),
        },
      }),
    );
  }

  async failStep(stepId: string, reason: string): Promise<string | null> {
    return this.guardWrite('fail the step', () =>
      this.prisma.planStep.update({
        where: { id: stepId },
        data: { status: DbStepStatus.failed, failureReason: reason, finishedAt: new Date() },
      }),
    );
  }

  async skipStep(stepId: string, reason: string): Promise<string | null> {
    return this.guardWrite('skip the step', () =>
      this.prisma.planStep.update({
        where: { id: stepId },
        data: { status: DbStepStatus.skipped, failureReason: reason },
      }),
    );
  }

  async stepsOf(runId: string): Promise<PlanStepRecord[]> {
    const steps = await this.prisma.planStep.findMany({
      where: { runId },
      orderBy: { index: 'asc' },
    });

    return steps.map(PlanStepMapper.toRecord);
  }
}
