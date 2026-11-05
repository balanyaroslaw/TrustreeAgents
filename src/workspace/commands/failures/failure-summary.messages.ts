import type { FailureClass } from './failure-class.enum';

const NAME_SEPARATOR = ', ';
const SINGLE = 1;

// Every sentence of the computed failure summary. They are written by code from the recorded
// output, so they live in one place and no model is asked to phrase any of them.
export class FailureSummaryMessages {
  static header(): string {
    return '[Failure summary, computed]';
  }

  static counts(failedCount: number, totalCount: number | null, groups: number): string {
    const tests =
      totalCount === null
        ? `${FailureSummaryMessages.count(failedCount, 'test')} failed`
        : `${failedCount} of ${totalCount} tests failed`;

    return `${tests}. ${FailureSummaryMessages.count(groups, 'distinct cause')}:`;
  }

  static group(count: number, failureClass: FailureClass, signature: string): string {
    return `- ${count} × ${failureClass}: "${signature}"`;
  }

  static samples(tests: readonly string[]): string {
    return `  e.g. ${tests.map((test) => `"${test}"`).join(NAME_SEPARATOR)}`;
  }

  static oneCause(): string {
    return 'All failures share one cause. Fix that cause once.';
  }

  static dominantCause(count: number, failedCount: number): string {
    return (
      `${count} of the ${failedCount} failures share one cause. Fix that cause once before ` +
      'looking at the rest.'
    );
  }

  static hostBlocking(advice: string): string {
    return `This cannot be fixed by editing the workspace: ${advice}.`;
  }

  static groupsOmitted(count: number): string {
    return `[${FailureSummaryMessages.count(count, 'further cause')} omitted]`;
  }

  static identicalRun(): string {
    return '[Identical to the previous run: no file has changed since. The result will not change.]';
  }

  private static count(value: number, noun: string): string {
    return `${value} ${noun}${value === SINGLE ? '' : 's'}`;
  }
}
