import type { IssueCategory } from '../common/issue-category.enum';
import type { IssueSeverity } from '../common/issue-severity.enum';
import type { ChecklistItem } from './checklist-item.enum';
import type { ReviewDimension } from './review-dimension.enum';
import { DIMENSION_LABELS } from './reviewer.constants';

const SINGLE = 1;

export class ReviewReportMessages {
  static issuesOfSeverity(severity: IssueSeverity, count: number): string {
    return `${count} ${severity} ${ReviewReportMessages.plural(count, 'issue')}`;
  }

  static criterionNotMet(position: number): string {
    return `criterion ${position} not met`;
  }

  static noBlockingIssues(): string {
    return 'no blocker or major issues and every acceptance criterion met';
  }

  static unreadFiles(paths: readonly string[]): string {
    return `changed source files that were never opened with read_file: ${paths.join(', ')}`;
  }

  static issueOutsideScope(paths: readonly string[]): string {
    return `issues point at files that were not changed in this step: ${paths.join(', ')}`;
  }

  static checklistIssueWithoutIssue(items: readonly ChecklistItem[]): string {
    return `checklist marked "issue" but nothing reported in issues: ${items.join(', ')}`;
  }

  static checklistOkWithBlockingIssue(
    category: IssueCategory,
    items: readonly ChecklistItem[],
  ): string {
    return (
      `the checklist reports no problem in ${category} (${items.join(', ')}) although a ` +
      'blocking issue of that area was reported'
    );
  }

  static missingChecklistItems(items: readonly ChecklistItem[]): string {
    return `checklist entries missing: ${items.join(', ')}`;
  }

  static highScoreWithBlockingIssue(dimension: ReviewDimension, score: number): string {
    return `${DIMENSION_LABELS[dimension]} scored ${score} although a blocking issue of that area was reported`;
  }

  static notReviewed(count: number): string {
    return `${count} ${ReviewReportMessages.plural(count, 'part')} of the change ${count === SINGLE ? 'was' : 'were'} not reviewed`;
  }

  private static plural(count: number, singular: string): string {
    return count === SINGLE ? singular : `${singular}s`;
  }
}
