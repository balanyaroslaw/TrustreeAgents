import type { IssueSeverity } from '../../common/issue-severity.enum';
import type { ReviewIssue } from '../../reviewer/review-result.types';
import { SEVERITY_ORDER } from '../../reviewer/reviewer.constants';
import {
  EXCERPT_CONTEXT_LINES,
  EXCERPT_MERGE_DISTANCE_LINES,
  MAX_CODE_EXCERPTS,
  MAX_EXCERPT_TOTAL_LINES,
} from './rework-brief.constants';
import type { ExcerptGroup, ExcerptRange } from './rework-brief.types';

const FIRST_LINE = 1;
const NOT_FOUND = -1;
const UNRANKED_SEVERITY = SEVERITY_ORDER.length;

// Which lines of which files the brief should quote, decided before anything is read from disk.
// Issues are taken most severe first, so the excerpts that survive the packet budget are the ones
// that matter most, and nearby issues in one file share an excerpt instead of quoting the same
// lines twice. An issue without a usable file and line is not quoted; it still reaches the
// Developer through the issue list.
export class ExcerptPlanner {
  static plan(issues: readonly ReviewIssue[]): ExcerptRange[] {
    const groups: ExcerptGroup[] = [];

    for (const issue of issues) {
      const { line } = issue;
      if (issue.file.trim() === '' || line === undefined || !Number.isInteger(line)) {
        continue;
      }
      if (line >= FIRST_LINE) {
        ExcerptPlanner.place(groups, issue.file, line, issue.severity);
      }
    }

    return ExcerptPlanner.withinBudget(ExcerptPlanner.ranked(groups).map(ExcerptPlanner.rangeOf));
  }

  private static place(
    groups: ExcerptGroup[],
    path: string,
    line: number,
    severity: IssueSeverity,
  ): void {
    const rank = ExcerptPlanner.rankOf(severity);
    const near = groups.find(
      (group) =>
        group.path === path &&
        group.lines.some((known) => Math.abs(known - line) <= EXCERPT_MERGE_DISTANCE_LINES),
    );

    if (near === undefined) {
      groups.push({ path, lines: [line], severityRank: rank });
      return;
    }
    near.lines.push(line);
    near.severityRank = Math.min(near.severityRank, rank);
  }

  private static rankOf(severity: IssueSeverity): number {
    const rank = SEVERITY_ORDER.indexOf(severity);
    return rank === NOT_FOUND ? UNRANKED_SEVERITY : rank;
  }

  // Stable within a severity, so the order the Reviewer reported is kept.
  private static ranked(groups: readonly ExcerptGroup[]): ExcerptGroup[] {
    return groups
      .map((group, index) => ({ group, index }))
      .sort(
        (left, right) =>
          left.group.severityRank - right.group.severityRank || left.index - right.index,
      )
      .map((entry) => entry.group);
  }

  private static rangeOf(group: ExcerptGroup): ExcerptRange {
    return {
      path: group.path,
      startLine: Math.max(FIRST_LINE, Math.min(...group.lines) - EXCERPT_CONTEXT_LINES),
      endLine: Math.max(...group.lines) + EXCERPT_CONTEXT_LINES,
    };
  }

  private static withinBudget(ranges: readonly ExcerptRange[]): ExcerptRange[] {
    const kept: ExcerptRange[] = [];
    let lines = 0;

    for (const range of ranges) {
      const length = range.endLine - range.startLine + FIRST_LINE;
      if (kept.length >= MAX_CODE_EXCERPTS || lines + length > MAX_EXCERPT_TOTAL_LINES) {
        break;
      }
      kept.push(range);
      lines += length;
    }

    return kept;
  }
}
