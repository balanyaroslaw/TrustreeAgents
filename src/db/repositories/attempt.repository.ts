import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { COST_SCALE } from '../prices/model-price.constants';
import { DECISION_KIND_TO_DB } from '../db.constants';
import { JsonValue } from '../json.value';
import { PrismaService } from '../prisma.service';
import type {
  AttemptCompletion,
  NewAttempt,
} from '../../execution/persistence/persistence.types';
import type { AttemptRepository as AttemptRepositoryPort } from '../../execution/persistence/attempt-repository.port.types';
import { GuardedRepository } from './guarded.repository';

const NO_TOKENS = 0;
const NO_COST = 0;

@Injectable()
export class AttemptRepository extends GuardedRepository implements AttemptRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  // Opened before the agents of the attempt run, so every call they make is written with this
  // row's id. The attempt counter of the step moves with it.
  async openAttempt(attempt: NewAttempt): Promise<string | null> {
    const opened = await this.guard('open the attempt', () =>
      this.prisma.$transaction(async (transaction) => {
        const step = await transaction.planStep.update({
          where: { runId_index: { runId: attempt.runId, index: attempt.stepIndex } },
          data: { attemptsUsed: attempt.attempt },
          select: { id: true },
        });

        return transaction.stepAttempt.create({
          data: { stepId: step.id, attempt: attempt.attempt },
          select: { id: true },
        });
      }),
    );

    return opened.value?.id ?? null;
  }

  // The tokens and the cost of the attempt are summed from the calls that carry its id, never
  // from what an agent reported.
  async completeAttempt(completion: AttemptCompletion): Promise<void> {
    await this.guardWrite('complete the attempt', () =>
      this.prisma.$transaction(async (transaction) => {
        const spent = await transaction.agentCall.aggregate({
          where: { attemptId: completion.attemptId },
          _sum: { totalTokens: true, costUsd: true },
        });

        await transaction.stepAttempt.update({
          where: { id: completion.attemptId },
          data: {
            developerReport: JsonValue.of(completion.developerReport),
            qaReport: JsonValue.of(completion.qaReport),
            reviewReport: JsonValue.of(completion.reviewReport),
            decision: JsonValue.of(completion.decision),
            guarded: JsonValue.of(completion.guarded),
            changedFiles: JsonValue.of(completion.changedFiles),
            note: completion.note,
            effectiveDecision:
              completion.guarded === null
                ? null
                : DECISION_KIND_TO_DB[completion.guarded.effective],
            overridden: completion.guarded?.overridden ?? false,
            tokensTotal: spent._sum.totalTokens ?? NO_TOKENS,
            costUsd: new Prisma.Decimal(spent._sum.costUsd ?? NO_COST).toDecimalPlaces(COST_SCALE),
            durationMs: completion.durationMs,
          },
        });
      }),
    );
  }
}
