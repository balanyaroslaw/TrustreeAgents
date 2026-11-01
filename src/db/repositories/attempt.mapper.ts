import type { StepAttempt } from '@prisma/client';
import { DECISION_KIND_FROM_DB } from '../db.constants';
import { JsonValue } from '../json.value';
import type { StepAttemptRecord } from './attempt.repository.types';

export class AttemptMapper {
  static toRecord(attempt: StepAttempt): StepAttemptRecord {
    return {
      id: attempt.id,
      stepId: attempt.stepId,
      attempt: attempt.attempt,
      developerReport: JsonValue.object(attempt.developerReport),
      qaReport: JsonValue.object(attempt.qaReport),
      reviewReport: JsonValue.object(attempt.reviewReport),
      decision: JsonValue.object(attempt.decision),
      guarded: JsonValue.object(attempt.guarded),
      changedFiles: JsonValue.object(attempt.changedFiles),
      effectiveDecision:
        attempt.effectiveDecision === null
          ? null
          : DECISION_KIND_FROM_DB[attempt.effectiveDecision],
      overridden: attempt.overridden,
      tokensTotal: attempt.tokensTotal,
      costUsd: attempt.costUsd.toNumber(),
      durationMs: attempt.durationMs,
      createdAt: attempt.createdAt,
    };
  }
}
