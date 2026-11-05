import type { CommandRunRecord } from '../command-run.types';
import { TestRunKind } from '../test-run-kind.enum';

const SUCCESS_EXIT_CODE = 0;
const NO_RUNS = 0;

// Which of the recorded command runs ran the whole suite and did not succeed. The runs carry the
// kind they were classified as and the analysis of their own output, both written when they were
// recorded, so every reader picks the same run and reads the same causes.
export class FullSuiteRunSelector {
  static lastFailing(runs: readonly CommandRunRecord[]): CommandRunRecord | null {
    const failed = runs.filter(FullSuiteRunSelector.isFailedFullSuite);
    if (failed.length === NO_RUNS) {
      return null;
    }

    return failed.reduce((latest, run) => (run.sequence > latest.sequence ? run : latest));
  }

  // The first full-suite run whose failures are a problem of this machine: the run stops on it,
  // because the next attempt would fail identically and cost the same tokens.
  static firstHostBlocking(runs: readonly CommandRunRecord[]): CommandRunRecord | null {
    return (
      [...runs]
        .sort((left, right) => left.sequence - right.sequence)
        .find(
          (run) =>
            run.testRunKind === TestRunKind.FullSuite && run.failureReport?.hostBlocking === true,
        ) ?? null
    );
  }

  private static isFailedFullSuite(run: CommandRunRecord): boolean {
    return (
      run.testRunKind === TestRunKind.FullSuite &&
      (run.timedOut || run.exitCode !== SUCCESS_EXIT_CODE)
    );
  }
}
