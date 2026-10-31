import type { TestSummaryCounts } from '../../workspace/commands/test-summary.types';
import { CompactNumberFormatter } from '../utils/compact-number.formatter';
import { DurationFormatter } from '../utils/duration.formatter';
import { CoverageLevel } from './coverage-level.enum';
import type { QaFullRun, QaMetrics, QaReport, QaScope } from './qa-report.types';
import type {
  QaCoverageEntry,
  QaDefect,
  QaFileCoverage,
  QaNotTestedEntry,
  QaResult,
  QaTestFile,
} from './qa-result.types';

const LINE_SEPARATOR = '\n';
const ENTRY_SEPARATOR = '; ';
const NAME_SEPARATOR = ', ';
const FIELD_SEPARATOR = ' | ';
const BULLET = ' - ';
const NOT_AVAILABLE = 'n/a';
const NONE = 'none';
const STALE = 'not fresh';
const FRESH = 'fresh';
const TIMED_OUT = 'timed out';
const SINGLE = 1;

export class QaReportFormatter {
  static format(report: QaReport): string {
    const { result } = report;
    const lines = [
      `QA status: ${report.status} (${report.statusReasons.join(ENTRY_SEPARATOR)})`,
      QaReportFormatter.scope(report.scope),
    ];

    if (report.lastFullRun !== null) {
      lines.push(`Last full run: ${QaReportFormatter.fullRun(report.lastFullRun)}`);
    }
    lines.push(`Summary: ${result.summary}`);
    lines.push(...QaReportFormatter.coverage(result.coverage));
    if (result.fileCoverage.length > 0) {
      lines.push(`File coverage: ${QaReportFormatter.fileCoverage(result.fileCoverage)}`);
    }
    lines.push(...QaReportFormatter.defects(result.defects));
    if (result.notTested.length > 0) {
      lines.push(`Not tested: ${QaReportFormatter.notTested(result.notTested)}`);
    }
    if (result.outOfScope.length > 0) {
      lines.push(`Out of scope: ${result.outOfScope.join(ENTRY_SEPARATOR)}`);
    }
    if (result.flakyTests.length > 0) {
      lines.push(`Flaky: ${result.flakyTests.join(NAME_SEPARATOR)}`);
    }
    lines.push(QaReportFormatter.testFiles(result));
    lines.push(QaReportFormatter.metrics(report.metrics));
    if (report.warnings.length > 0) {
      lines.push(`Warnings: ${report.warnings.join(ENTRY_SEPARATOR)}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static scope(scope: QaScope): string {
    return (
      `Scope: ${scope.sourceFiles} source ${QaReportFormatter.plural(scope.sourceFiles, 'file')}, ` +
      `${scope.testFiles} test ${QaReportFormatter.plural(scope.testFiles, 'file')}, ` +
      `${scope.otherFiles} other`
    );
  }

  // Public: the Reviewer input packet shows the same line to keep one format for a test run.
  static fullRun(run: QaFullRun): string {
    const exitCode = run.timedOut
      ? TIMED_OUT
      : `exit ${run.exitCode === null ? NOT_AVAILABLE : String(run.exitCode)}`;

    return [
      run.command,
      exitCode,
      DurationFormatter.format(run.durationMs),
      `tests ${QaReportFormatter.summaryCounts(run.summary)}`,
      run.fresh ? FRESH : STALE,
    ].join(FIELD_SEPARATOR);
  }

  private static summaryCounts(summary: TestSummaryCounts): string {
    const parts: string[] = [];
    if (summary.failed !== undefined) {
      parts.push(`${summary.failed} failed`);
    }
    if (summary.passed !== undefined) {
      parts.push(`${summary.passed} passed`);
    }
    if (summary.skipped !== undefined) {
      parts.push(`${summary.skipped} skipped`);
    }
    if (summary.total !== undefined) {
      parts.push(`${summary.total} total`);
    }
    return parts.length === 0 ? NOT_AVAILABLE : parts.join(NAME_SEPARATOR);
  }

  private static coverage(coverage: readonly QaCoverageEntry[]): string[] {
    const header =
      `Coverage: ${coverage.length} ${QaReportFormatter.plural(coverage.length, 'criterion', 'criteria')}: ` +
      `${QaReportFormatter.countOf(coverage, CoverageLevel.Covered)} covered, ` +
      `${QaReportFormatter.countOf(coverage, CoverageLevel.Partial)} partial, ` +
      `${QaReportFormatter.countOf(coverage, CoverageLevel.None)} none`;

    const incomplete = coverage
      .filter((entry) => entry.level !== CoverageLevel.Covered)
      .map(
        (entry) =>
          `${BULLET}[${entry.level}] "${entry.criterion}": tests: ` +
          `${entry.tests.length === 0 ? NONE : entry.tests.join(NAME_SEPARATOR)}` +
          `${entry.note === undefined ? '' : ` (${entry.note})`}`,
      );

    return [header, ...incomplete];
  }

  private static fileCoverage(fileCoverage: readonly QaFileCoverage[]): string {
    return fileCoverage.map((entry) => `${entry.path} ${entry.level}`).join(ENTRY_SEPARATOR);
  }

  private static defects(defects: readonly QaDefect[]): string[] {
    if (defects.length === 0) {
      return [];
    }
    const entries = defects.map(
      (defect) =>
        `${BULLET}[${defect.severity}] ${defect.title}` +
        `${defect.testName === undefined ? '' : ` (test: ${defect.testName})`}: ` +
        `expected ${defect.expected}, got ${defect.actual}` +
        `${defect.suspectedLocation === undefined ? '' : `; suspected: ${defect.suspectedLocation}`}` +
        `; reproduce: ${defect.reproduction}`,
    );

    return [`Defects (${defects.length}):`, ...entries];
  }

  private static notTested(notTested: readonly QaNotTestedEntry[]): string {
    return notTested.map((entry) => `${entry.what}: ${entry.reason}`).join(ENTRY_SEPARATOR);
  }

  private static testFiles(result: QaResult): string {
    const entries = result.testFiles.map(
      (file: QaTestFile) => `${file.path} - ${file.description}`,
    );
    return `Test files (${entries.length}): ${entries.length === 0 ? NONE : entries.join(ENTRY_SEPARATOR)}`;
  }

  private static metrics(metrics: QaMetrics): string {
    const { tokens } = metrics;

    return (
      `Metrics: ${metrics.testFilesChanged} test ` +
      `${QaReportFormatter.plural(metrics.testFilesChanged, 'file')} changed | ` +
      `${metrics.commandsRun} ${QaReportFormatter.plural(metrics.commandsRun, 'command')} | ` +
      `tokens ${CompactNumberFormatter.format(tokens.input)} in ` +
      `(${CompactNumberFormatter.format(tokens.cachedInput)} cached) / ` +
      `${CompactNumberFormatter.format(tokens.output)} out | ` +
      `${metrics.toolCalls} ${QaReportFormatter.plural(metrics.toolCalls, 'tool call')} | ` +
      DurationFormatter.format(metrics.durationMs)
    );
  }

  private static countOf(coverage: readonly QaCoverageEntry[], level: CoverageLevel): number {
    return coverage.filter((entry) => entry.level === level).length;
  }

  private static plural(count: number, singular: string, plural?: string): string {
    return count === SINGLE ? singular : (plural ?? `${singular}s`);
  }
}
