import { CompactNumberFormatter } from '../utils/compact-number.formatter';
import { DurationFormatter } from '../utils/duration.formatter';
import type {
  DeveloperDiscrepancies,
  DeveloperMetrics,
  DeveloperReport,
} from './developer-report.types';
import type { DeveloperChange } from './developer-result.types';

const LINE_SEPARATOR = '\n';
const ENTRY_SEPARATOR = '; ';
const PATH_SEPARATOR = ', ';
const NO_FILES = 'none';
const SINGLE = 1;

export class DeveloperReportFormatter {
  static format(report: DeveloperReport): string {
    const { result, metrics, discrepancies } = report;

    const lines = [
      `Status: ${result.status}`,
      `Summary: ${result.summary}`,
      DeveloperReportFormatter.files(metrics.filesChanged, result.changes),
    ];

    if (result.decisions.length > 0) {
      lines.push(`Decisions: ${result.decisions.join(ENTRY_SEPARATOR)}`);
    }
    if (result.openIssues.length > 0) {
      lines.push(`Open issues: ${result.openIssues.join(ENTRY_SEPARATOR)}`);
    }

    lines.push(DeveloperReportFormatter.metrics(metrics));

    const warning = DeveloperReportFormatter.warning(discrepancies);
    if (warning !== null) {
      lines.push(warning);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static files(filesChanged: number, changes: readonly DeveloperChange[]): string {
    const entries = changes.map(
      (change) => `${change.action} ${change.path} - ${change.description}`,
    );
    return `Files (${filesChanged}): ${entries.length === 0 ? NO_FILES : entries.join(ENTRY_SEPARATOR)}`;
  }

  private static metrics(metrics: DeveloperMetrics): string {
    const { filesChanged, filesCreated, filesModified, filesDeleted, tokens } = metrics;

    return (
      `Metrics: ${filesChanged} ${DeveloperReportFormatter.plural(filesChanged, 'file')} changed ` +
      `(${filesCreated} created, ${filesModified} modified, ${filesDeleted} deleted) | ` +
      `tokens ${CompactNumberFormatter.format(tokens.input)} in ` +
      `(${CompactNumberFormatter.format(tokens.cachedInput)} cached) / ` +
      `${CompactNumberFormatter.format(tokens.output)} out | ` +
      `${metrics.toolCalls} ${DeveloperReportFormatter.plural(metrics.toolCalls, 'tool call')} | ` +
      DurationFormatter.format(metrics.durationMs)
    );
  }

  private static warning(discrepancies: DeveloperDiscrepancies): string | null {
    const parts: string[] = [];

    if (discrepancies.claimedButNotChanged.length > 0) {
      parts.push(
        `reported but not changed: ${discrepancies.claimedButNotChanged.join(PATH_SEPARATOR)}`,
      );
    }
    if (discrepancies.unreportedChanges.length > 0) {
      parts.push(
        `changed but not reported: ${discrepancies.unreportedChanges.join(PATH_SEPARATOR)}`,
      );
    }

    return parts.length === 0 ? null : `Warning: ${parts.join(ENTRY_SEPARATOR)}`;
  }

  private static plural(count: number, singular: string): string {
    return count === SINGLE ? singular : `${singular}s`;
  }
}
