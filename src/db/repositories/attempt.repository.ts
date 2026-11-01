import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { COST_SCALE } from '../prices/model-price.constants';
import { DECISION_KIND_TO_DB } from '../db.constants';
import { JsonValue } from '../json.value';
import { PrismaService } from '../prisma.service';
import { AttemptMapper } from './attempt.mapper';
import type { AttemptPayload, StepAttemptRecord } from './attempt.repository.types';
import { GuardedRepository } from './guarded.repository';

const NO_TOKENS = 0;
const NO_COST = 0;
const NO_DURATION = 0;
const NO_CALLS = 0;

@Injectable()
export class AttemptRepository extends GuardedRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    super();
  }

  // The attempt, the calls it paid for and the attempt counter of the step belong together, so
  // they are written in one transaction.
  async append(
    stepId: string,
    attempt: number,
    payload: AttemptPayload,
  ): Promise<StepAttemptRecord | null> {
    const written = await this.guard('append the attempt', () =>
      this.prisma.$transaction(async (transaction) => {
        const created = await transaction.stepAttempt.create({
          data: {
            stepId,
            attempt,
            developerReport: JsonValue.of(payload.developerReport),
            qaReport: JsonValue.of(payload.qaReport),
            reviewReport: JsonValue.of(payload.reviewReport),
            decision: JsonValue.of(payload.decision),
            guarded: JsonValue.of(payload.guarded),
            changedFiles: JsonValue.of(payload.changedFiles),
            effectiveDecision:
              payload.effectiveDecision === undefined || payload.effectiveDecision === null
                ? null
                : DECISION_KIND_TO_DB[payload.effectiveDecision],
            overridden: payload.overridden ?? false,
            tokensTotal: payload.tokensTotal ?? NO_TOKENS,
            costUsd: new Prisma.Decimal(payload.costUsd ?? NO_COST).toDecimalPlaces(COST_SCALE),
            durationMs: payload.durationMs ?? NO_DURATION,
          },
        });
        const callIds = payload.agentCallIds ?? [];
        if (callIds.length > NO_CALLS) {
          await transaction.agentCall.updateMany({
            where: { id: { in: [...callIds] } },
            data: { attemptId: created.id },
          });
        }
        await transaction.planStep.update({
          where: { id: stepId },
          data: { attemptsUsed: attempt },
        });

        return created;
      }),
    );

    return written.value === null ? null : AttemptMapper.toRecord(written.value);
  }

  async attemptsOf(stepId: string): Promise<StepAttemptRecord[]> {
    const attempts = await this.prisma.stepAttempt.findMany({
      where: { stepId },
      orderBy: { attempt: 'asc' },
    });

    return attempts.map(AttemptMapper.toRecord);
  }
}
