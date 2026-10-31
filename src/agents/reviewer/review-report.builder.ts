import { ChangedFileStatus } from '../../workspace/git/changed-file-status.enum';
import type { ChangedFile } from '../../workspace/git/changed-file.types';
import { IssueCategory } from '../common/issue-category.enum';
import { IssueSeverity } from '../common/issue-severity.enum';
import type { AgentRunUsage } from '../developer/developer-report.types';
import { ChangedFileClassifier } from '../qa/changed-file.classifier';
import { ChangedFileKind } from '../qa/changed-file-kind.enum';
import { ChecklistItem } from './checklist-item.enum';
import { ChecklistStatus } from './checklist-status.enum';
import { ReviewDimension } from './review-dimension.enum';
import { CHECKLIST_ITEM_CATEGORIES } from './review-checklist.constants';
import { ReviewReportMessages } from './review-report.messages';
import type { ReviewMetrics, ReviewReport } from './review-report.types';
import type { ReviewIssue, ReviewResult } from './review-result.types';
import { ReviewVerdict } from './review-verdict.enum';
import {
  BLOCKING_SEVERITIES,
  DIMENSION_CATEGORIES,
  HIGH_SCORE,
  SCORE_FRACTION_DIGITS,
} from './reviewer.constants';

const NO_ENTRIES = 0;
const FIRST_POSITION = 1;

export class ReviewReportBuilder {
  static build(
    result: ReviewResult,
    changedFiles: readonly ChangedFile[],
    readPaths: readonly string[],
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
  ): ReviewReport {
    const changedSourcePaths = ReviewReportBuilder.changedSourcePaths(changedFiles);
    const unreadChangedFiles = changedSourcePaths.filter((path) => !readPaths.includes(path));
    const reasons = ReviewReportBuilder.verdictReasons(result);

    return {
      result,
      verdict:
        reasons.length === NO_ENTRIES ? ReviewVerdict.Approve : ReviewVerdict.ChangesRequested,
      verdictReasons:
        reasons.length === NO_ENTRIES ? [ReviewReportMessages.noBlockingIssues()] : reasons,
      issueCounts: ReviewReportBuilder.issueCounts(result.issues),
      overallScore: ReviewReportBuilder.overallScore(result),
      changedSourceFiles: changedSourcePaths.length,
      unreadChangedFiles,
      metrics: ReviewReportBuilder.metrics(usage, toolCalls, durationMs),
      warnings: ReviewReportBuilder.warnings(result, changedFiles, unreadChangedFiles),
    };
  }

  private static verdictReasons(result: ReviewResult): string[] {
    const reasons: string[] = [];

    for (const severity of BLOCKING_SEVERITIES) {
      const count = ReviewReportBuilder.countOfSeverity(result.issues, severity);
      if (count > NO_ENTRIES) {
        reasons.push(ReviewReportMessages.issuesOfSeverity(severity, count));
      }
    }
    result.criteriaAssessment.forEach((assessment, index) => {
      if (!assessment.met) {
        reasons.push(ReviewReportMessages.criterionNotMet(index + FIRST_POSITION));
      }
    });

    return reasons;
  }

  private static issueCounts(
    issues: readonly ReviewIssue[],
  ): Readonly<Record<IssueSeverity, number>> {
    return {
      [IssueSeverity.Blocker]: ReviewReportBuilder.countOfSeverity(issues, IssueSeverity.Blocker),
      [IssueSeverity.Major]: ReviewReportBuilder.countOfSeverity(issues, IssueSeverity.Major),
      [IssueSeverity.Minor]: ReviewReportBuilder.countOfSeverity(issues, IssueSeverity.Minor),
      [IssueSeverity.Nit]: ReviewReportBuilder.countOfSeverity(issues, IssueSeverity.Nit),
    };
  }

  private static overallScore(result: ReviewResult): number {
    const { correctness, paymentSafety, maintainability, testQuality } = result.scores;
    const scores = [correctness, paymentSafety, maintainability, testQuality];
    const average = scores.reduce((total, score) => total + score, NO_ENTRIES) / scores.length;

    return Number(average.toFixed(SCORE_FRACTION_DIGITS));
  }

  private static metrics(
    usage: AgentRunUsage,
    toolCalls: number,
    durationMs: number,
  ): ReviewMetrics {
    return {
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
    result: ReviewResult,
    changedFiles: readonly ChangedFile[],
    unreadChangedFiles: readonly string[],
  ): string[] {
    const warnings: string[] = [];

    if (unreadChangedFiles.length > NO_ENTRIES) {
      warnings.push(ReviewReportMessages.unreadFiles(unreadChangedFiles));
    }
    const changedPaths = new Set(changedFiles.map((file) => file.path));
    const foreignFiles = [
      ...new Set(
        result.issues.map((issue) => issue.file).filter((file) => !changedPaths.has(file)),
      ),
    ].sort();
    if (foreignFiles.length > NO_ENTRIES) {
      warnings.push(ReviewReportMessages.issueOutsideScope(foreignFiles));
    }

    const blockingCategories = new Set(
      result.issues
        .filter((issue) => BLOCKING_SEVERITIES.includes(issue.severity))
        .map((issue) => issue.category),
    );
    const reportedCategories = new Set(result.issues.map((issue) => issue.category));

    const unreportedChecklistIssues = result.checklist
      .filter(
        (entry) =>
          entry.status === ChecklistStatus.Issue &&
          !reportedCategories.has(CHECKLIST_ITEM_CATEGORIES[entry.item]),
      )
      .map((entry) => entry.item);
    if (unreportedChecklistIssues.length > NO_ENTRIES) {
      warnings.push(ReviewReportMessages.checklistIssueWithoutIssue(unreportedChecklistIssues));
    }

    warnings.push(...ReviewReportBuilder.contradictedChecklist(result, blockingCategories));

    const missing = Object.values(ChecklistItem).filter(
      (item) => !result.checklist.some((entry) => entry.item === item),
    );
    if (missing.length > NO_ENTRIES) {
      warnings.push(ReviewReportMessages.missingChecklistItems(missing));
    }

    warnings.push(...ReviewReportBuilder.scoreWarnings(result, blockingCategories));

    if (result.notReviewed.length > NO_ENTRIES) {
      warnings.push(ReviewReportMessages.notReviewed(result.notReviewed.length));
    }

    return warnings;
  }

  // A category can have several checklist items, so the checklist only contradicts a blocking
  // issue when none of that category's items reports a problem.
  private static contradictedChecklist(
    result: ReviewResult,
    blockingCategories: ReadonlySet<IssueCategory>,
  ): string[] {
    const warnings: string[] = [];

    for (const category of blockingCategories) {
      const items = Object.values(ChecklistItem).filter(
        (item) => CHECKLIST_ITEM_CATEGORIES[item] === category,
      );
      const answers = result.checklist.filter((entry) => items.includes(entry.item));
      if (
        answers.length > NO_ENTRIES &&
        answers.every((entry) => entry.status !== ChecklistStatus.Issue)
      ) {
        warnings.push(ReviewReportMessages.checklistOkWithBlockingIssue(category, items));
      }
    }

    return warnings;
  }

  private static scoreWarnings(
    result: ReviewResult,
    blockingCategories: ReadonlySet<IssueCategory>,
  ): string[] {
    return Object.values(ReviewDimension)
      .filter(
        (dimension) =>
          result.scores[dimension] >= HIGH_SCORE &&
          DIMENSION_CATEGORIES[dimension].some((category) => blockingCategories.has(category)),
      )
      .map((dimension) =>
        ReviewReportMessages.highScoreWithBlockingIssue(dimension, result.scores[dimension]),
      );
  }

  // A file the step deleted cannot be opened, so it is not expected among the files read.
  private static changedSourcePaths(changedFiles: readonly ChangedFile[]): string[] {
    return changedFiles
      .filter(
        (file) =>
          file.status !== ChangedFileStatus.Deleted &&
          ChangedFileClassifier.classify(file.path) === ChangedFileKind.Source,
      )
      .map((file) => file.path);
  }

  private static countOfSeverity(issues: readonly ReviewIssue[], severity: IssueSeverity): number {
    return issues.filter((issue) => issue.severity === severity).length;
  }
}
