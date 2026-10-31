import type { z } from 'zod';
import type { reviewResultSchema } from './review-result.schema';

export type ReviewResult = z.infer<typeof reviewResultSchema>;

export type ReviewIssue = ReviewResult['issues'][number];

export type ReviewCriterionAssessment = ReviewResult['criteriaAssessment'][number];

export type ReviewChecklistEntry = ReviewResult['checklist'][number];

export type ReviewScores = ReviewResult['scores'];
