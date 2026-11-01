import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, Run } from '@prisma/client';
import { StepStatus as DbStepStatus } from '@prisma/client';
import type { RunStatus } from '../../execution/run-status.enum';
import { RUN_STATUS_FROM_DB, RUN_STATUS_TO_DB } from '../db.constants';
import { JsonValue } from '../json.value';
import { PrismaService } from '../prisma.service';
import { AttemptMapper } from './attempt.mapper';
import { PlanStepMapper } from './plan-step.mapper';
import { GuardedRepository } from './guarded.repository';
import type { NewRun, RunDetail, RunListRow, RunRecord, RunTotals } from './run.repository.types';

const NO_TOKENS = 0;
const NO_COST = 0;
const UUID_LENGTH = 36;
// How far back a short id is looked up: ids are uuid columns, so the prefix is matched in code.
const PREFIX_SEARCH_LIMIT = 200;

const RUN_DETAIL_INCLUDE = {
  steps: {
    orderBy: { index: 'asc' },
    include: { attempts: { orderBy: { attempt: 'asc' } } },
  },
} satisfies Prisma.RunInclude;

@Injectable()
export class RunRepository extends GuardedRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  // The run row is the only write that may stop a run: without it nothing else can be stored.
  async create(run: NewRun): Promise<RunRecord> {
    const created = await this.prisma.run.create({
      data: { projectId: run.projectId, prompt: run.prompt },
    });

    return RunRepository.toRecord(created);
  }

  async setPlan(
    runId: string,
    summary: string,
    assumptions: readonly string[],
  ): Promise<string | null> {
    return this.guardWrite('set the plan of the run', () =>
      this.prisma.run.update({
        where: { id: runId },
        data: { planSummary: summary, assumptions: JsonValue.of(assumptions) },
      }),
    );
  }

  async setBranch(runId: string, branch: string): Promise<string | null> {
    return this.guardWrite('set the branch of the run', () =>
      this.prisma.run.update({ where: { id: runId }, data: { branch } }),
    );
  }

  async close(
    runId: string,
    status: RunStatus,
    reportPath: string | null,
    failureReason?: string | null,
  ): Promise<string | null> {
    return this.guardWrite('close the run', () =>
      this.prisma.run.update({
        where: { id: runId },
        data: {
          status: RUN_STATUS_TO_DB[status],
          reportPath,
          failureReason: failureReason ?? null,
          finishedAt: new Date(),
        },
      }),
    );
  }

  // Tokens and cost of a run are always the sum of its agent calls, never a counter kept by hand.
  async recomputeTotals(runId: string): Promise<RunTotals> {
    const sums = await this.prisma.agentCall.aggregate({
      where: { runId },
      _sum: { totalTokens: true, costUsd: true },
    });
    const totals: RunTotals = {
      tokensTotal: sums._sum.totalTokens ?? NO_TOKENS,
      costUsd: sums._sum.costUsd?.toNumber() ?? NO_COST,
    };
    await this.guardWrite('store the totals of the run', () =>
      this.prisma.run.update({
        where: { id: runId },
        data: { tokensTotal: totals.tokensTotal, costUsd: sums._sum.costUsd ?? NO_COST },
      }),
    );

    return totals;
  }

  async recent(limit: number): Promise<RunListRow[]> {
    const runs = await this.prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: { steps: { select: { status: true } } },
    });

    return runs.map((run) => ({
      id: run.id,
      prompt: run.prompt,
      status: RUN_STATUS_FROM_DB[run.status],
      startedAt: run.startedAt,
      durationMs: RunRepository.durationOf(run.startedAt, run.finishedAt),
      stepsTotal: run.steps.length,
      stepsAccepted: run.steps.filter((step) => step.status === DbStepStatus.accepted).length,
      tokensTotal: run.tokensTotal,
      costUsd: run.costUsd.toNumber(),
    }));
  }

  async byId(id: string): Promise<RunDetail | null> {
    const run = await this.prisma.run.findUnique({
      where: { id },
      include: RUN_DETAIL_INCLUDE,
    });

    return run === null ? null : RunRepository.toDetail(run);
  }

  // The short id from a branch name or a report file is enough to find a run.
  async byIdOrPrefix(idOrPrefix: string): Promise<RunDetail | null> {
    if (idOrPrefix.length === UUID_LENGTH) {
      return this.byId(idOrPrefix);
    }
    const recent = await this.prisma.run.findMany({
      orderBy: { startedAt: 'desc' },
      take: PREFIX_SEARCH_LIMIT,
      select: { id: true },
    });
    const match = recent.find((run) => run.id.startsWith(idOrPrefix));

    return match === undefined ? null : this.byId(match.id);
  }

  async latest(): Promise<RunDetail | null> {
    const run = await this.prisma.run.findFirst({
      orderBy: { startedAt: 'desc' },
      include: RUN_DETAIL_INCLUDE,
    });

    return run === null ? null : RunRepository.toDetail(run);
  }

  async countOlderThan(cutoff: Date): Promise<number> {
    return this.prisma.run.count({ where: { startedAt: { lt: cutoff } } });
  }

  async deleteOlderThan(cutoff: Date): Promise<number> {
    const deleted = await this.prisma.run.deleteMany({ where: { startedAt: { lt: cutoff } } });
    return deleted.count;
  }

  async deleteById(id: string): Promise<number> {
    const deleted = await this.prisma.run.deleteMany({ where: { id } });
    return deleted.count;
  }

  private static toRecord(run: Run): RunRecord {
    return {
      id: run.id,
      projectId: run.projectId,
      prompt: run.prompt,
      status: RUN_STATUS_FROM_DB[run.status],
      branch: run.branch,
      planSummary: run.planSummary,
      assumptions: JsonValue.strings(run.assumptions),
      reportPath: run.reportPath,
      tokensTotal: run.tokensTotal,
      costUsd: run.costUsd.toNumber(),
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      failureReason: run.failureReason,
    };
  }

  private static toDetail(
    run: Prisma.RunGetPayload<{ include: typeof RUN_DETAIL_INCLUDE }>,
  ): RunDetail {
    return {
      ...RunRepository.toRecord(run),
      steps: run.steps.map((step) => ({
        ...PlanStepMapper.toRecord(step),
        attempts: step.attempts.map(AttemptMapper.toRecord),
      })),
    };
  }

  private static durationOf(startedAt: Date, finishedAt: Date | null): number | null {
    return finishedAt === null ? null : finishedAt.getTime() - startedAt.getTime();
  }
}
