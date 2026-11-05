import { Inject, Injectable } from '@nestjs/common';
import type { CallRecorders } from '../../activity/call-recorders.types';
import { PackageTestScriptReader } from '../package-test-script.reader';
import { TestRunClassifier } from '../test-run.classifier';
import { TestRunKind } from '../test-run-kind.enum';
import { FailureSummaryBuilder } from './failure-summary.builder';
import { FailureSummaryMessages } from './failure-summary.messages';
import { TestFailureAnalyzer } from './test-failure.analyzer';
import type { CommandRunAnnotation, CommandRunRecord } from '../command-run.types';
import type { TestFailureReport } from './test-failure.types';

const NO_RUNS = 0;

// What code adds to the result of a test-run command before the model reads it: the failure
// summary computed from the output, and a line saying that an identical run has already been
// made. Both are facts about recorded runs; the raw output itself is never changed.
//
// The command is recognised as a test run exactly as TestRunClassifier recognises one, so the
// summary appears above the same runs the QA report and the rework brief are built from.
@Injectable()
export class TestRunAnnotator {
  constructor(
    @Inject(PackageTestScriptReader) private readonly testScripts: PackageTestScriptReader,
  ) {}

  async annotate(
    command: string,
    output: string,
    exitCode: number | null,
    recorders: CallRecorders | undefined,
  ): Promise<CommandRunAnnotation> {
    // PackageTestScriptReader never throws: a workspace with no readable package.json simply
    // has no test script, and the command text is then classified on its own.
    const testRunKind = TestRunClassifier.classify(command, await this.testScripts.read());
    if (testRunKind === TestRunKind.NotTest) {
      return { notes: [], testRunKind, failureReport: null };
    }
    const failureReport = TestFailureAnalyzer.analyze(output, exitCode);

    return {
      notes: TestRunAnnotator.notesOf(command, failureReport, recorders),
      testRunKind,
      failureReport,
    };
  }

  private static notesOf(
    command: string,
    report: TestFailureReport,
    recorders: CallRecorders | undefined,
  ): string[] {
    const notes: string[] = [];
    if (TestRunAnnotator.isIdenticalRepeat(command, report, recorders)) {
      notes.push(FailureSummaryMessages.identicalRun());
    }
    const summary = FailureSummaryBuilder.build(report);
    if (summary !== null) {
      notes.push(summary);
    }

    return notes;
  }

  // The same command, the same set of causes, and no file changed in between: the call is not
  // waiting for a different answer, it is repeating one it already has. The run is not blocked -
  // the line is the whole feature.
  private static isIdenticalRepeat(
    command: string,
    report: TestFailureReport,
    recorders: CallRecorders | undefined,
  ): boolean {
    if (recorders === undefined || report.groups.length === NO_RUNS) {
      return false;
    }
    const previous = TestRunAnnotator.lastRunOf(command, recorders.commands.snapshot());
    const previousReport = previous === null ? null : previous.failureReport;
    if (previous === null || previousReport === null) {
      return false;
    }

    return (
      !recorders.changes.changedSince(previous.sequence) &&
      TestRunAnnotator.sameSignatures(previousReport, report)
    );
  }

  private static lastRunOf(
    command: string,
    runs: readonly CommandRunRecord[],
  ): CommandRunRecord | null {
    const matching = runs.filter((run) => run.command === command);
    if (matching.length === NO_RUNS) {
      return null;
    }

    return matching.reduce((latest, run) => (run.sequence > latest.sequence ? run : latest));
  }

  private static sameSignatures(left: TestFailureReport, right: TestFailureReport): boolean {
    const signatures = new Set(left.groups.map((group) => group.signature));

    return (
      signatures.size === right.groups.length &&
      right.groups.every((group) => signatures.has(group.signature))
    );
  }
}
