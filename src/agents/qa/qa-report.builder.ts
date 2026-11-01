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
import type { QaFullRun, QaMetrics, QaReport, QaScope } from './qa-report.types';
import type { QaResult } from './qa-result.types';
import { QaStatus } from './qa-status.enum';
import { SEVERE_DEFECT_SEVERITIES } from './qa.constants';
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
  ): QaReport {
    const lastFullRun = QaReportBuilder.lastFullRun(runs, changes);
    const changedSourcePaths = QaReportBuilder.pathsOfKind(changedFiles, ChangedFileKind.Source);
    // A file the step deleted cannot be covered by a test, so it is not expected in fileCoverage.
    const coverableSourcePaths = QaReportBuilder.pathsOfKind(
      changedFiles.filter((file) => file.status !== ChangedFileStatus.Deleted),
      ChangedFileKind.Source,
    );
    const reasons = QaReportBuilder.statusReasons(result, lastFullRun, coverableSourcePaths);

    return {
      result,
      status: QaReportBuilder.status(reasons),
      statusReasons: [...reasons.failed, ...reasons.incomplete, ...reasons.passed],
      scope: QaReportBuilder.scope(changedFiles),
      lastFullRun,
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
    lastFullRun: QaFullRun | null,
    changedSourcePaths: readonly string[],
  ): { failed: string[]; incomplete: string[]; passed: string[] } {
    const failed: string[] = [];
    const incomplete: string[] = [];
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
      incomplete.push(QaReportMessages.noFullRun());
    } else if (!lastFullRun.fresh) {
      incomplete.push(QaReportMessages.staleFullRun());
    }
    const uncovered = result.coverage
      .filter((entry) => entry.level === CoverageLevel.None)
      .map((entry) => entry.criterion);
    if (uncovered.length > NO_ENTRIES) {
      incomplete.push(QaReportMessages.uncoveredCriteria(uncovered));
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
      passed.push(QaReportMessages.coveredCriteria(result.coverage.length));
      passed.push(QaReportMessages.justifiedFiles());
      passed.push(QaReportMessages.noDefects());
    }

    return { failed, incomplete, passed };
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

  private static lastFullRun(
    runs: readonly CommandRunRecord[],
    changes: readonly TrackedChange[],
  ): QaFullRun | null {
    const fullRuns = runs.filter(
      (run) => TestRunClassifier.classify(run.command) === TestRunKind.FullSuite,
    );
    if (fullRuns.length === NO_ENTRIES) {
      return null;
    }
    const run = fullRuns.reduce((latest, candidate) =>
      candidate.sequence > latest.sequence ? candidate : latest,
    );

    return {
      command: run.command,
      exitCode: run.exitCode,
      timedOut: run.timedOut,
      durationMs: run.durationMs,
      fresh: !QaReportBuilder.testChangedAfter(changes, run.sequence),
      summary: TestSummaryParser.parse(run.outputTail),
    };
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
