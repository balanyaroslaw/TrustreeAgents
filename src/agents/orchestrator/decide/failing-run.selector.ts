import type { CommandRunRecord } from '../../../workspace/commands/command-run.types';
import { FailureSummaryBuilder } from '../../../workspace/commands/failures/failure-summary.builder';
import { TestRunClassifier } from '../../../workspace/commands/test-run.classifier';
import { TestRunKind } from '../../../workspace/commands/test-run-kind.enum';
import { MAX_FAILING_OUTPUT_CHARACTERS } from './rework-brief.constants';
import type { FailingRunOutput } from './rework-brief.types';

const SUCCESS_EXIT_CODE = 0;
const NO_RUNS = 0;

// The last full-suite run of the attempt that did not succeed. A timed-out run has no exit code,
// so it is a failure here too.
//
// What counts as the full suite is decided exactly as the QA report decides it, so the two can
// never disagree: the command QA named and the report resolved wins, and only without one is the
// command text classified. A project whose suite the classifier cannot recognise, or a suite QA
// runs narrowed, would otherwise fail the step with no output to show for it.
export class FailingRunSelector {
  static select(
    runs: readonly CommandRunRecord[],
    testScript: string | null,
    fullSuiteCommand: string | null,
  ): FailingRunOutput | null {
    const failed = runs.filter(
      (run) =>
        FailingRunSelector.isFullSuite(run.command, testScript, fullSuiteCommand) &&
        (run.timedOut || run.exitCode !== SUCCESS_EXIT_CODE),
    );
    if (failed.length === NO_RUNS) {
      return null;
    }
    const last = failed.reduce((latest, candidate) =>
      candidate.sequence > latest.sequence ? candidate : latest,
    );
    if (last.outputTail.trim() === '') {
      return null;
    }

    return {
      command: last.command,
      // The same summary the tool result carried, recorded with the run: the Developer reads the
      // causes first and the raw tail only if it needs more.
      summary: last.failureReport === null ? null : FailureSummaryBuilder.build(last.failureReport),
      outputTail: FailingRunSelector.tail(last.outputTail, MAX_FAILING_OUTPUT_CHARACTERS),
    };
  }

  // The end of the output is kept: that is where a runner prints which tests failed.
  static tail(output: string, limit: number): string {
    return output.length <= limit ? output : output.slice(output.length - limit);
  }

  // QaFullRun.command is copied verbatim from the recorded run, so an exact match is enough and
  // nothing has to guess at the command text a second time.
  private static isFullSuite(
    command: string,
    testScript: string | null,
    fullSuiteCommand: string | null,
  ): boolean {
    return fullSuiteCommand === null
      ? TestRunClassifier.classify(command, testScript) === TestRunKind.FullSuite
      : command === fullSuiteCommand;
  }
}
