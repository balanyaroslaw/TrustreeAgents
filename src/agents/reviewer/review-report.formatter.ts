import { IssueSeverity } from '../common/issue-severity.enum';
import { CompactNumberFormatter } from '../utils/compact-number.formatter';
import { DurationFormatter } from '../utils/duration.formatter';
import { ChecklistStatus } from './checklist-status.enum';
import { ReviewDimension } from './review-dimension.enum';
import type { ReviewReport } from './review-report.types';
import type {
  ReviewChecklistEntry,
  ReviewCriterionAssessment,
  ReviewIssue,
  ReviewResult,
} from './review-result.types';
import { DIMENSION_LABELS, SCORE_FRACTION_DIGITS, SEVERITY_ORDER } from './reviewer.constants';

const LINE_SEPARATOR = '\n';
const ENTRY_SEPARATOR = '; ';
const FIELD_SEPARATOR = ' | ';
const BULLET = ' - ';
const DETAIL_INDENT = '     ';
const NOT_APPLICABLE_LABEL = 'n/a';
const NO_ENTRIES = 0;

export class ReviewReportFormatter {
  static format(report: ReviewReport): string {
    const { result } = report;
    const lines = [
      `Review verdict: ${report.verdict} (${report.verdictReasons.join(ENTRY_SEPARATOR)})`,
      ReviewReportFormatter.scores(report.overallScore, result),
      `Summary: ${result.summary}`,
      ...ReviewReportFormatter.criteria(result.criteriaAssessment),
      ...ReviewReportFormatter.issues(result.issues),
      ...ReviewReportFormatter.checklist(result.checklist),
    ];

    if (result.strengths.length > NO_ENTRIES) {
      lines.push(`Strengths: ${result.strengths.join(ENTRY_SEPARATOR)}`);
    }
    if (result.outOfScope.length > NO_ENTRIES) {
      lines.push(`Out of scope: ${result.outOfScope.join(ENTRY_SEPARATOR)}`);
    }
    if (result.notReviewed.length > NO_ENTRIES) {
      lines.push(`Not reviewed: ${result.notReviewed.join(ENTRY_SEPARATOR)}`);
    }
    lines.push(ReviewReportFormatter.metrics(report));
    if (report.warnings.length > NO_ENTRIES) {
      lines.push(`Warnings: ${report.warnings.join(ENTRY_SEPARATOR)}`);
    }

    return lines.join(LINE_SEPARATOR);
  }

  private static scores(overallScore: number, result: ReviewResult): string {
    const dimensions = Object.values(ReviewDimension).map(
      (dimension) => `${DIMENSION_LABELS[dimension]} ${result.scores[dimension]}`,
    );
    return (
      `Scores: overall ${overallScore.toFixed(SCORE_FRACTION_DIGITS)}` +
      `${FIELD_SEPARATOR}${dimensions.join(FIELD_SEPARATOR)}`
    );
  }

  private static criteria(assessments: readonly ReviewCriterionAssessment[]): string[] {
    if (assessments.length === NO_ENTRIES) {
      return [];
    }
    const met = assessments.filter((assessment) => assessment.met).length;
    const unmet = assessments
      .filter((assessment) => !assessment.met)
      .map((assessment) => `${BULLET}[not met] "${assessment.criterion}": ${assessment.evidence}`);

    return [`Criteria: ${met} of ${assessments.length} met`, ...unmet];
  }

  private static issues(issues: readonly ReviewIssue[]): string[] {
    if (issues.length === NO_ENTRIES) {
      return [];
    }
    const entries = ReviewReportFormatter.sorted(issues).flatMap((issue) => [
      `${BULLET}[${issue.severity}] ${issue.category} ${ReviewReportFormatter.location(issue)} ${issue.title}`,
      `${DETAIL_INDENT}problem: ${issue.problem}`,
      `${DETAIL_INDENT}fix: ${issue.suggestedFix}`,
    ]);

    return [`Issues (${issues.length}):`, ...entries];
  }

  private static location(issue: ReviewIssue): string {
    return issue.line === undefined ? issue.file : `${issue.file}:${String(issue.line)}`;
  }

  private static checklist(checklist: readonly ReviewChecklistEntry[]): string[] {
    if (checklist.length === NO_ENTRIES) {
      return [];
    }
    const header =
      `Checklist: ${ReviewReportFormatter.countOf(checklist, ChecklistStatus.Ok)} ok, ` +
      `${ReviewReportFormatter.countOf(checklist, ChecklistStatus.Issue)} issue, ` +
      `${ReviewReportFormatter.countOf(checklist, ChecklistStatus.NotApplicable)} ${NOT_APPLICABLE_LABEL}`;
    const problems = checklist
      .filter((entry) => entry.status === ChecklistStatus.Issue)
      .map((entry) => `${BULLET}[${entry.status}] ${entry.item}: ${entry.note}`);

    return [header, ...problems];
  }

  private static metrics(report: ReviewReport): string {
    const { tokens } = report.metrics;
    const read = report.changedSourceFiles - report.unreadChangedFiles.length;

    return (
      `Metrics: read ${read} of ${report.changedSourceFiles} changed source files | ` +
      `tokens ${CompactNumberFormatter.format(tokens.input)} in ` +
      `(${CompactNumberFormatter.format(tokens.cachedInput)} cached) / ` +
      `${CompactNumberFormatter.format(tokens.output)} out | ` +
      `${report.metrics.toolCalls} tool calls | ` +
      DurationFormatter.format(report.metrics.durationMs)
    );
  }

  private static sorted(issues: readonly ReviewIssue[]): ReviewIssue[] {
    return [...issues].sort(
      (left, right) =>
        ReviewReportFormatter.rankOf(left.severity) -
          ReviewReportFormatter.rankOf(right.severity) || left.file.localeCompare(right.file),
    );
  }

  private static rankOf(severity: IssueSeverity): number {
    return SEVERITY_ORDER.indexOf(severity);
  }

  private static countOf(
    checklist: readonly ReviewChecklistEntry[],
    status: ChecklistStatus,
  ): number {
    return checklist.filter((entry) => entry.status === status).length;
  }
}
