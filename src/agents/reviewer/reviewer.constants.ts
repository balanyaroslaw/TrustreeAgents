import { IssueCategory } from '../common/issue-category.enum';
import { IssueSeverity } from '../common/issue-severity.enum';
import { ReviewDimension } from './review-dimension.enum';

export const REVIEWER_MAX_TURNS = 30;
export const REVIEWER_MAX_LISTED_FILES = 30;

export const BLOCKING_SEVERITIES: readonly IssueSeverity[] = [
  IssueSeverity.Blocker,
  IssueSeverity.Major,
];

export const SEVERITY_ORDER: readonly IssueSeverity[] = [
  IssueSeverity.Blocker,
  IssueSeverity.Major,
  IssueSeverity.Minor,
  IssueSeverity.Nit,
];

export const MIN_REVIEW_SUMMARY_CHARACTERS = 60;
export const MIN_SCORE = 1;
export const MAX_SCORE = 5;
export const HIGH_SCORE = 4;
export const SCORE_FRACTION_DIGITS = 1;

// Which issue categories a score dimension covers, so a high score can be checked against the
// issues that were reported.
export const DIMENSION_CATEGORIES: Readonly<Record<ReviewDimension, readonly IssueCategory[]>> = {
  [ReviewDimension.Correctness]: [IssueCategory.Correctness, IssueCategory.DataModel],
  [ReviewDimension.PaymentSafety]: [
    IssueCategory.PaymentSafety,
    IssueCategory.Concurrency,
    IssueCategory.Security,
  ],
  [ReviewDimension.Maintainability]: [
    IssueCategory.Maintainability,
    IssueCategory.ErrorHandling,
    IssueCategory.ApiContract,
  ],
  [ReviewDimension.TestQuality]: [IssueCategory.TestQuality],
};

export const DIMENSION_LABELS: Readonly<Record<ReviewDimension, string>> = {
  [ReviewDimension.Correctness]: 'correctness',
  [ReviewDimension.PaymentSafety]: 'payment safety',
  [ReviewDimension.Maintainability]: 'maintainability',
  [ReviewDimension.TestQuality]: 'tests',
};
