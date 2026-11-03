import { DurationFormatter } from '../utils/duration.formatter';
import type { QaFullRun, QaUncoverableCriterion } from './qa-report.types';

const SINGLE = 1;
const NO_COMMANDS = 0;

export class QaReportMessages {
  static noFullRun(): string {
    return 'the full test suite was never run';
  }

  // Names both sides, so the next attempt can fix the name instead of guessing why it is stuck.
  static namedCommandNeverRun(named: string, recorded: readonly string[]): string {
    const ran =
      recorded.length === NO_COMMANDS
        ? 'no command was run at all'
        : `commands actually run: ${recorded.join('; ')}`;

    return `QA named "${named}" as its full test suite, but that command was never run (${ran})`;
  }

  static fullRunFailed(run: QaFullRun): string {
    return run.timedOut
      ? `the last full test run timed out after ${DurationFormatter.format(run.durationMs)}`
      : `the last full test run exited with code ${String(run.exitCode)}`;
  }

  static fullRunPassed(): string {
    return 'the last full test run passed and is newer than every test file change';
  }

  static staleFullRun(): string {
    return 'test files changed after the last full test run, so its result is out of date';
  }

  static severeDefects(count: number): string {
    return `${count} blocker or major ${QaReportMessages.plural(count, 'defect')} reported`;
  }

  static uncoveredCriteria(criteria: readonly string[]): string {
    return `not covered by any test: ${criteria.join('; ')}`;
  }

  static coveredCriteria(covered: number, total: number): string {
    const criteria = QaReportMessages.plural(total, 'criterion', 'criteria');

    return covered === total
      ? `all ${total} acceptance ${criteria} are at least partially covered`
      : `${covered} of ${total} acceptance ${criteria} are at least partially covered`;
  }

  // Stated whatever the status is, so the reason a criterion cannot be automated is in front of
  // whoever decides instead of being the thing that silently blocks the step.
  static uncoverableCriteria(entries: readonly QaUncoverableCriterion[]): string {
    const listed = entries.map((entry) => `${entry.criterion} (${entry.reason})`).join('; ');

    return `not coverable by an automated test, with a reason given by QA: ${listed}`;
  }

  static unjustifiedFiles(paths: readonly string[]): string {
    return `changed source files neither covered nor listed in notTested: ${paths.join(', ')}`;
  }

  static justifiedFiles(): string {
    return 'every changed source file is covered or explained in notTested';
  }

  static blocked(reason: string): string {
    return `QA reported itself blocked: ${reason}`;
  }

  static noDefects(): string {
    return 'no blocker or major defects';
  }

  static suspiciousTestChange(path: string, marker: string, line: string): string {
    return `${path} adds "${marker}" (a weakened or disabled test): ${line}`;
  }

  static claimedTestFileNotChanged(paths: readonly string[]): string {
    return `test files reported but not changed: ${paths.join(', ')}`;
  }

  static changedTestFileNotClaimed(paths: readonly string[]): string {
    return `test files changed but not reported: ${paths.join(', ')}`;
  }

  static coverageWithoutTests(criteria: readonly string[]): string {
    return `coverage entries without test names: ${criteria.join('; ')}`;
  }

  static unknownCoveredFiles(paths: readonly string[]): string {
    return `fileCoverage mentions files that were not changed in this step: ${paths.join(', ')}`;
  }

  static testOutOfScope(path: string): string {
    return `test file ${path} does not seem to cover the changed code`;
  }

  private static plural(count: number, singular: string, plural?: string): string {
    return count === SINGLE ? singular : (plural ?? `${singular}s`);
  }
}
