import type { QaStatus } from '../../qa/qa-status.enum';

const SINGLE = 1;

export class DecisionMessages {
  static qaDidNotPass(status: QaStatus): string {
    return `QA status is ${status}, not passed`;
  }

  static reviewRequestsChanges(): string {
    return 'the Reviewer requested changes';
  }

  static criteriaNotMet(criteria: readonly string[]): string {
    return `the Reviewer found acceptance criteria that are not met: ${criteria.join('; ')}`;
  }

  static blockingDefects(count: number): string {
    return `QA reported ${count} blocking ${count === SINGLE ? 'defect' : 'defects'}`;
  }

  static acceptNotAllowed(): string {
    return 'accept is not allowed while these facts stand';
  }

  static nothingToRework(): string {
    return 'rework was requested without any focus and without a blocking finding, so there is nothing actionable to do';
  }

  static attemptsExhausted(attempt: number, maxAttempts: number): string {
    return `attempt ${attempt} of ${maxAttempts} was the last one, so the step failed`;
  }
}
