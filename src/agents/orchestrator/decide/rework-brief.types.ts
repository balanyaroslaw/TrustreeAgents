import type { QaDefect } from '../../qa/qa-result.types';
import type { ReviewIssue } from '../../reviewer/review-result.types';
import type { DeferredIssue } from './step-decision.types';

export interface ReworkBrief {
  readonly focus: readonly string[];
  readonly qaDefects: readonly QaDefect[];
  readonly reviewIssues: readonly ReviewIssue[];
  readonly deferredIssues: readonly DeferredIssue[];
}
