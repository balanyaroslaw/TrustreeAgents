import type { CommandRunRecord } from '../../workspace/commands/command-run.types';
import { TestRunClassifier } from '../../workspace/commands/test-run.classifier';
import { TestRunKind } from '../../workspace/commands/test-run-kind.enum';
import { TestSummaryParser } from '../../workspace/commands/test-summary.parser';
import { ChangedFileStatus } from '../../workspace/git/changed-file-status.enum';
import type { ChangedFile } from '../../workspace/git/changed-file.types';
import type { TrackedChange } from '../../workspace/activity/tracked-change.types';
import type { AgentRunUsage } from '../developer/developer-report.types';
import { ChangedFileClassifier } from './changed-file.classifier';
import { ChangedFileKind } from './changed-file-kind.enum';
import { CoverageLevel } from './coverage-level.enum';
import { QaReportMessages } from './qa-report.messages';
import type {
  QaMetrics,
  QaReport,
  QaScope,
  QaUncoverableCriterion,
  ResolvedFullRun,
} from './qa-report.types';
import type { QaResult } from './qa-result.types';
import { QaStatus } from './qa-status.enum';
import {
  MIN_CRITERION_REFERENCE_CHARACTERS,
  SEVERE_DEFECT_SEVERITIES,
  WHITESPACE_PATTERN,
} from './qa.constants';
import { SuspiciousTestChangeDetector } from './suspicious-test-change.detector';
import { TestScopeChecker } from './test-scope.checker';

const SUCCESS_EXIT_CODE = 0;
const NO_ENTRIES = 0;

export class QaReportBuilder {
  static build(
    result: QaResult,
    changedFiles: readonly ChangedFile[],
    runs: readonly CommandRunRecord[],
    changes: readonly TrackedChange[],
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
    testFileDiff: string,
    testScript: string | null,
  ): QaReport {
    const fullRun = QaReportBuilder.lastFullRun(result, runs, changes, testScript);
    const changedSourcePaths = QaReportBuilder.pathsOfKind(changedFiles, ChangedFileKind.Source);
    // A file the step deleted cannot be covered by a test, so it is not expected in fileCoverage.
    const coverableSourcePaths = QaReportBuilder.pathsOfKind(
      changedFiles.filter((file) => file.status !== ChangedFileStatus.Deleted),
      ChangedFileKind.Source,
    );
    const uncoverableCriteria = QaReportBuilder.uncoverableCriteria(result);
    const reasons = QaReportBuilder.statusReasons(
      result,
      fullRun,
      coverableSourcePaths,
      uncoverableCriteria,
      runs,
    );

    return {
      result,
      status: QaReportBuilder.status(reasons),
      statusReasons: [
        ...reasons.failed,
        ...reasons.incomplete,
        ...reasons.notes,
        ...reasons.passed,
      ],
      uncoverableCriteria,
      scope: QaReportBuilder.scope(changedFiles),
      lastFullRun: fullRun.run,
      metrics: QaReportBuilder.metrics(changes, runs, usage, toolCalls, durationMs),
      warnings: QaReportBuilder.warnings(result, changes, changedSourcePaths, testFileDiff),
    };
  }

  private static status(reasons: {
    failed: readonly string[];
    incomplete: readonly string[];
  }): QaStatus {
    if (reasons.failed.length > NO_ENTRIES) {
      return QaStatus.Failed;
    }
    return reasons.incomplete.length > NO_ENTRIES ? QaStatus.Incomplete : QaStatus.Passed;
  }

  private static statusReasons(
    result: QaResult,
    fullRun: ResolvedFullRun,
    changedSourcePaths: readonly string[],
    uncoverable: readonly QaUncoverableCriterion[],
    runs: readonly CommandRunRecord[],
  ): { failed: string[]; incomplete: string[]; notes: string[]; passed: string[] } {
    const lastFullRun = fullRun.run;
    const failed: string[] = [];
    const incomplete: string[] = [];
    // Reported whatever the status turns out to be, so nothing that was weighed is left unsaid.
    const notes: string[] = [];
    const passed: string[] = [];

    if (
      lastFullRun !== null &&
      (lastFullRun.timedOut || lastFullRun.exitCode !== SUCCESS_EXIT_CODE)
    ) {
      failed.push(QaReportMessages.fullRunFailed(lastFullRun));
    }
    const severe = result.defects.filter((defect) =>
      SEVERE_DEFECT_SEVERITIES.includes(defect.severity),
    );
    if (severe.length > NO_ENTRIES) {
      failed.push(QaReportMessages.severeDefects(severe.length));
    }

    if (lastFullRun === null) {
      // A command QA named but never ran is said plainly, with what it did run, so the next
      // attempt can correct the name instead of guessing why the step will not pass.
      incomplete.push(
        fullRun.namedButNotRun === null
          ? QaReportMessages.noFullRun()
          : QaReportMessages.namedCommandNeverRun(
              fullRun.namedButNotRun,
              runs.map((run) => run.command),
            ),
      );
    } else if (!lastFullRun.fresh) {
      incomplete.push(QaReportMessages.staleFullRun());
    }
    // Symmetric with the rule for changed source files below: a criterion QA could not cover is a
    // gap in the verification only when nothing explains it. A criterion that notTested names,
    // with a reason, is reported as a note instead, because no Developer attempt can make an
    // untestable criterion testable and the step would otherwise never leave incomplete.
    const justified = new Set(uncoverable.map((entry) => entry.criterion));
    const uncovered = result.coverage
      .filter((entry) => entry.level === CoverageLevel.None && !justified.has(entry.criterion))
      .map((entry) => entry.criterion);
    if (uncovered.length > NO_ENTRIES) {
      incomplete.push(QaReportMessages.uncoveredCriteria(uncovered));
    }
    if (uncoverable.length > NO_ENTRIES) {
      notes.push(QaReportMessages.uncoverableCriteria(uncoverable));
    }
    const unjustified = QaReportBuilder.unjustifiedFiles(result, changedSourcePaths);
    if (unjustified.length > NO_ENTRIES) {
      incomplete.push(QaReportMessages.unjustifiedFiles(unjustified));
    }
    if (result.blockedReason !== undefined) {
      incomplete.push(QaReportMessages.blocked(result.blockedReason));
    }

    if (failed.length === NO_ENTRIES && incomplete.length === NO_ENTRIES) {
      passed.push(QaReportMessages.fullRunPassed());
      passed.push(
        QaReportMessages.coveredCriteria(
          result.coverage.length - uncoverable.length,
          result.coverage.length,
        ),
      );
      passed.push(QaReportMessages.justifiedFiles());
      passed.push(QaReportMessages.noDefects());
    }

    return { failed, incomplete, notes, passed };
  }

  // The criteria at level none that notTested both names and explains. The match is deliberately
  // forgiving in either direction, because QA writes the criterion from memory, but a very short
  // "what" is ignored so one vague entry cannot justify every criterion in the step.
  private static uncoverableCriteria(result: QaResult): QaUncoverableCriterion[] {
    const entries: QaUncoverableCriterion[] = [];

    for (const entry of result.coverage) {
      if (entry.level !== CoverageLevel.None) {
        continue;
      }
      const reason = QaReportBuilder.justificationFor(result, entry.criterion);
      if (reason !== null) {
        entries.push({ criterion: entry.criterion, reason });
      }
    }

    return entries;
  }

  private static justificationFor(result: QaResult, criterion: string): string | null {
    const wanted = QaReportBuilder.comparable(criterion);

    for (const entry of result.notTested) {
      const reason = entry.reason.trim();
      const what = QaReportBuilder.comparable(entry.what);
      if (reason === '' || what.length < MIN_CRITERION_REFERENCE_CHARACTERS) {
        continue;
      }
      if (what.includes(wanted) || wanted.includes(what)) {
        return reason;
      }
    }

    return null;
  }

  private static comparable(text: string): string {
    return text.toLowerCase().replace(WHITESPACE_PATTERN, ' ').trim();
  }

  private static unjustifiedFiles(
    result: QaResult,
    changedSourcePaths: readonly string[],
  ): string[] {
    const covered = new Set(
      result.fileCoverage
        .filter((entry) => entry.level !== CoverageLevel.None)
        .map((entry) => entry.path),
    );

    return changedSourcePaths.filter(
      (path) => !covered.has(path) && !QaReportBuilder.isJustified(result, path),
    );
  }

  private static isJustified(result: QaResult, path: string): boolean {
    return result.notTested.some((entry) => entry.what.includes(path));
  }

  // QA chooses which command counts as its full suite; the code supplies whether it passed. The
  // named command is looked up among the commands that were actually recorded, so a project that
  // runs its suites through a script of its own is no longer invisible here. Without a name, the
  // command text is classified as before.
  private static lastFullRun(
    result: QaResult,
    runs: readonly CommandRunRecord[],
    changes: readonly TrackedChange[],
    testScript: string | null,
  ): ResolvedFullRun {
    const named = QaReportBuilder.namedFullSuiteCommand(result);
    const fullRuns =
      named === null
        ? runs.filter(
            (run) => TestRunClassifier.classify(run.command, testScript) === TestRunKind.FullSuite,
          )
        : runs.filter((run) => QaReportBuilder.comparable(run.command) === named);

    if (fullRuns.length === NO_ENTRIES) {
      return { run: null, namedButNotRun: named };
    }
    const run = fullRuns.reduce((latest, candidate) =>
      candidate.sequence > latest.sequence ? candidate : latest,
    );

    return {
      run: {
        command: run.command,
        exitCode: run.exitCode,
        timedOut: run.timedOut,
        durationMs: run.durationMs,
        fresh: !QaReportBuilder.testChangedAfter(changes, run.sequence),
        summary: TestSummaryParser.parse(run.outputTail),
      },
      namedButNotRun: null,
    };
  }

  // Blank counts as absent, which is what keeps the classifier fallback reachable.
  private static namedFullSuiteCommand(result: QaResult): string | null {
    const named: unknown = result.fullSuiteCommand;

    return typeof named === 'string' && named.trim() !== ''
      ? QaReportBuilder.comparable(named)
      : null;
  }

  private static testChangedAfter(changes: readonly TrackedChange[], sequence: number): boolean {
    return changes.some(
      (change) =>
        change.sequence > sequence &&
        ChangedFileClassifier.classify(change.path) === ChangedFileKind.Test,
    );
  }

  private static scope(changedFiles: readonly ChangedFile[]): QaScope {
    return {
      sourceFiles: QaReportBuilder.countOfKind(changedFiles, ChangedFileKind.Source),
      testFiles: QaReportBuilder.countOfKind(changedFiles, ChangedFileKind.Test),
      otherFiles: QaReportBuilder.countOfKind(changedFiles, ChangedFileKind.Other),
    };
  }

  private static metrics(
    changes: readonly TrackedChange[],
    runs: readonly CommandRunRecord[],
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
  ): QaMetrics {
    return {
      testFilesChanged: QaReportBuilder.changedTestPaths(changes).length,
      commandsRun: runs.length,
      tokens: {
        input: usage.input,
        cachedInput: usage.cachedInput,
        output: usage.output,
        total: usage.input + usage.output,
      },
      toolCalls,
      durationMs,
    };
  }

  private static warnings(
    result: QaResult,
    changes: readonly TrackedChange[],
    changedSourcePaths: readonly string[],
    testFileDiff: string,
  ): string[] {
    const changedTests = QaReportBuilder.changedTestPaths(changes);
    const claimedTests = result.testFiles.map((entry) => entry.path);
    const warnings = [...SuspiciousTestChangeDetector.detect(testFileDiff)];

    const notChanged = QaReportBuilder.missingFrom(claimedTests, changedTests);
    if (notChanged.length > NO_ENTRIES) {
      warnings.push(QaReportMessages.claimedTestFileNotChanged(notChanged));
    }
    const notClaimed = QaReportBuilder.missingFrom(changedTests, claimedTests);
    if (notClaimed.length > NO_ENTRIES) {
      warnings.push(QaReportMessages.changedTestFileNotClaimed(notClaimed));
    }
    const withoutTests = result.coverage
      .filter((entry) => entry.tests.length === NO_ENTRIES)
      .map((entry) => entry.criterion);
    if (withoutTests.length > NO_ENTRIES) {
      warnings.push(QaReportMessages.coverageWithoutTests(withoutTests));
    }
    const unknownFiles = QaReportBuilder.missingFrom(
      result.fileCoverage.map((entry) => entry.path),
      changedSourcePaths,
    );
    if (unknownFiles.length > NO_ENTRIES) {
      warnings.push(QaReportMessages.unknownCoveredFiles(unknownFiles));
    }

    return [...warnings, ...TestScopeChecker.check(changedTests, changedSourcePaths, testFileDiff)];
  }

  private static changedTestPaths(changes: readonly TrackedChange[]): string[] {
    return changes
      .filter((change) => ChangedFileClassifier.classify(change.path) === ChangedFileKind.Test)
      .map((change) => change.path);
  }

  private static pathsOfKind(
    changedFiles: readonly ChangedFile[],
    kind: ChangedFileKind,
  ): string[] {
    return changedFiles
      .filter((file) => ChangedFileClassifier.classify(file.path) === kind)
      .map((file) => file.path);
  }

  private static countOfKind(changedFiles: readonly ChangedFile[], kind: ChangedFileKind): number {
    return QaReportBuilder.pathsOfKind(changedFiles, kind).length;
  }

  private static missingFrom(paths: readonly string[], known: readonly string[]): string[] {
    const index = new Set(known);
    return [...new Set(paths.filter((path) => !index.has(path)))].sort();
  }
}
