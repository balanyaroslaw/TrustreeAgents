import type { IssueSeverity } from '../common/issue-severity.enum';
import type { TokenMetrics } from '../developer/developer-report.types';
import type { ReviewResult } from './review-result.types';
import type { ReviewVerdict } from './review-verdict.enum';

export interface ReviewMetrics {
  readonly tokens: TokenMetrics;
  readonly toolCalls: number;
  readonly durationMs: number;
}

export interface ReviewReport {
  readonly result: ReviewResult;
  readonly verdict: ReviewVerdict;
  readonly verdictReasons: readonly string[];
  readonly issueCounts: Readonly<Record<IssueSeverity, number>>;
  readonly overallScore: number;
  readonly changedSourceFiles: number;
  readonly unreadChangedFiles: readonly string[];
  readonly metrics: ReviewMetrics;
  readonly warnings: readonly string[];
}
