import type { PlanStep } from '@prisma/client';
import { STEP_STATUS_FROM_DB } from '../db.constants';
import { JsonValue } from '../json.value';
import type { PlanStepRecord } from './plan.repository.types';

export class PlanStepMapper {
  static toRecord(step: PlanStep): PlanStepRecord {
    return {
      id: step.id,
      runId: step.runId,
      index: step.index,
      title: step.title,
      description: step.description,
      acceptanceCriteria: JsonValue.strings(step.acceptanceCriteria),
      status: STEP_STATUS_FROM_DB[step.status],
      attemptsUsed: step.attemptsUsed,
      summary: step.summary,
      commitSha: step.commitSha,
      failureReason: step.failureReason,
      startedAt: step.startedAt,
      finishedAt: step.finishedAt,
    };
  }
}
