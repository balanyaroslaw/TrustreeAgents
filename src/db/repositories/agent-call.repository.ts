import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type AgentCall } from '@prisma/client';
import {
  AGENT_CALL_ERROR_STATUS,
  AGENT_CALL_OK_STATUS,
  AGENT_ROLE_FROM_DB,
  AGENT_ROLE_TO_DB,
  MODEL_NAME_SEPARATOR,
  NO_MODEL,
  STEP_STATUS_FROM_DB,
  UNASSIGNED_STEP_LABEL,
} from '../db.constants';
import { DatabaseMessages } from '../db.messages';
import { CostCalculator } from '../prices/cost.calculator';
import { COST_SCALE } from '../prices/model-price.constants';
import { PrismaService } from '../prisma.service';
import type {
  NewAgentCall,
  RecordedAgentCall,
  StepUsageRow,
  UsageFilter,
  UsageRow,
  UsageTotals,
} from './agent-call.repository.types';
import { GuardedRepository } from './guarded.repository';
import { ModelPriceRepository } from './model-price.repository';

const NONE = 0;

@Injectable()
export class AgentCallRepository extends GuardedRepository {
  // Which models were already reported as unpriced in which run, so the warning appears once.
  private readonly warnedModels = new Map<string, Set<string>>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ModelPriceRepository) private readonly prices: ModelPriceRepository,
  ) {
    super();
  }

  // Every agent call is priced on write from the model_prices table: an unknown model costs 0 and
  // returns a warning instead of failing the call.
  async record(call: NewAgentCall): Promise<RecordedAgentCall> {
    const price = (await this.prices.byModels([call.model])).get(call.model) ?? null;
    const { costUsd, priceKnown } = CostCalculator.calculate(call, price);
    const priceWarning = priceKnown ? null : this.warnOnce(call.runId, call.model);
    const totalTokens = call.inputTokens + call.outputTokens;

    const written = await this.guard('record the agent call', () =>
      this.prisma.agentCall.create({
        data: {
          runId: call.runId,
          attemptId: call.attemptId ?? null,
          role: AGENT_ROLE_TO_DB[call.role],
          task: call.task ?? null,
          model: call.model,
          inputTokens: call.inputTokens,
          cachedInputTokens: call.cachedInputTokens,
          outputTokens: call.outputTokens,
          totalTokens,
          costUsd: costUsd.toDecimalPlaces(COST_SCALE),
          toolCalls: call.toolCalls,
          durationMs: call.durationMs,
          status:
            call.failureKind === undefined || call.failureKind === null
              ? AGENT_CALL_OK_STATUS
              : AGENT_CALL_ERROR_STATUS,
          failureKind: call.failureKind ?? null,
          instructionsHash: call.instructionsHash ?? null,
          startedAt: call.startedAt ?? new Date(),
          finishedAt: call.finishedAt ?? new Date(),
        },
        select: { id: true },
      }),
    );

    return {
      id: written.value?.id ?? null,
      costUsd: costUsd.toNumber(),
      warning: priceWarning ?? written.warning,
    };
  }

  async usageByRun(runId: string): Promise<UsageRow[]> {
    const groups = await this.prisma.agentCall.groupBy({
      by: ['role', 'model'],
      where: { runId },
      _sum: {
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true,
        durationMs: true,
      },
      _count: { _all: true },
    });

    return groups
      .map((group) => ({
        label: AGENT_ROLE_FROM_DB[group.role],
        model: group.model,
        calls: group._count._all,
        inputTokens: group._sum.inputTokens ?? NONE,
        cachedInputTokens: group._sum.cachedInputTokens ?? NONE,
        outputTokens: group._sum.outputTokens ?? NONE,
        totalTokens: group._sum.totalTokens ?? NONE,
        costUsd: group._sum.costUsd?.toNumber() ?? NONE,
        durationMs: group._sum.durationMs ?? NONE,
      }))
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  async usageByModel(runId: string): Promise<UsageRow[]> {
    const groups = await this.prisma.agentCall.groupBy({
      by: ['model'],
      where: { runId },
      _sum: {
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true,
        durationMs: true,
      },
      _count: { _all: true },
    });

    return groups
      .map((group) => ({
        label: group.model,
        model: group.model,
        calls: group._count._all,
        inputTokens: group._sum.inputTokens ?? NONE,
        cachedInputTokens: group._sum.cachedInputTokens ?? NONE,
        outputTokens: group._sum.outputTokens ?? NONE,
        totalTokens: group._sum.totalTokens ?? NONE,
        costUsd: group._sum.costUsd?.toNumber() ?? NONE,
        durationMs: group._sum.durationMs ?? NONE,
      }))
      .sort((left, right) => right.totalTokens - left.totalTokens);
  }

  // One row per plan step, plus one for the calls that belong to no attempt, so the rows always
  // add up to the total of the run.
  async usageByStep(runId: string): Promise<StepUsageRow[]> {
    const steps = await this.prisma.planStep.findMany({
      where: { runId },
      orderBy: { index: 'asc' },
      include: { attempts: { include: { agentCalls: true } } },
    });
    const rows: StepUsageRow[] = steps.map((step) => ({
      index: step.index,
      status: STEP_STATUS_FROM_DB[step.status],
      attempts: step.attempts.length,
      label: `${step.index}. ${step.title}`,
      ...AgentCallRepository.totalsOf(step.attempts.flatMap((attempt) => attempt.agentCalls)),
    }));

    const outside = await this.prisma.agentCall.findMany({ where: { runId, attemptId: null } });
    if (outside.length > NONE) {
      rows.push({
        index: null,
        status: null,
        attempts: NONE,
        label: UNASSIGNED_STEP_LABEL,
        ...AgentCallRepository.totalsOf(outside),
      });
    }

    return rows;
  }

  async usageTotals(filter: UsageFilter): Promise<UsageTotals> {
    const where = filter.runId === undefined ? {} : { runId: filter.runId };
    const sums = await this.prisma.agentCall.aggregate({
      where,
      _sum: {
        inputTokens: true,
        cachedInputTokens: true,
        outputTokens: true,
        totalTokens: true,
        costUsd: true,
        durationMs: true,
      },
      _count: { _all: true },
    });
    const models = await this.prisma.agentCall.findMany({
      where,
      distinct: ['model'],
      select: { model: true },
    });

    return {
      calls: sums._count._all,
      inputTokens: sums._sum.inputTokens ?? NONE,
      cachedInputTokens: sums._sum.cachedInputTokens ?? NONE,
      outputTokens: sums._sum.outputTokens ?? NONE,
      totalTokens: sums._sum.totalTokens ?? NONE,
      costUsd: sums._sum.costUsd?.toNumber() ?? NONE,
      durationMs: sums._sum.durationMs ?? NONE,
      models: models.map((entry) => entry.model).sort(),
    };
  }

  private warnOnce(runId: string, model: string): string | null {
    const warned = this.warnedModels.get(runId) ?? new Set<string>();
    this.warnedModels.set(runId, warned);
    if (warned.has(model)) {
      return null;
    }
    warned.add(model);
    const warning = DatabaseMessages.unknownPrice(model);
    this.logger.warn(warning);

    return warning;
  }

  private static totalsOf(calls: readonly AgentCall[]): Omit<UsageRow, 'label'> {
    const models = [...new Set(calls.map((call) => call.model))].sort();

    return {
      model: models.length === NONE ? NO_MODEL : models.join(MODEL_NAME_SEPARATOR),
      calls: calls.length,
      inputTokens: AgentCallRepository.sum(calls, (call) => call.inputTokens),
      cachedInputTokens: AgentCallRepository.sum(calls, (call) => call.cachedInputTokens),
      outputTokens: AgentCallRepository.sum(calls, (call) => call.outputTokens),
      totalTokens: AgentCallRepository.sum(calls, (call) => call.totalTokens),
      costUsd: calls
        .reduce((total, call) => total.add(call.costUsd), new Prisma.Decimal(NONE))
        .toNumber(),
      durationMs: AgentCallRepository.sum(calls, (call) => call.durationMs),
    };
  }

  private static sum(calls: readonly AgentCall[], of: (call: AgentCall) => number): number {
    return calls.reduce((total, call) => total + of(call), NONE);
  }
}
