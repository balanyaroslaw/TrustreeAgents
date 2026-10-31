import { z } from 'zod';
import { IssueCategory } from '../common/issue-category.enum';
import { IssueSeverity } from '../common/issue-severity.enum';
import { ChecklistItem } from './checklist-item.enum';
import { ChecklistStatus } from './checklist-status.enum';
import { ReviewDimension } from './review-dimension.enum';
import { MAX_SCORE, MIN_REVIEW_SUMMARY_CHARACTERS, MIN_SCORE } from './reviewer.constants';

const SCORE_RANGE = `${MIN_SCORE} (bad) to ${MAX_SCORE} (very good)`;

export const reviewResultSchema = z.object({
  summary: z
    .string()
    .min(MIN_REVIEW_SUMMARY_CHARACTERS)
    .describe(
      '3-5 sentences: what the change does, whether it meets the acceptance criteria, and the ' +
        'main concerns.',
    ),
  criteriaAssessment: z
    .array(
      z.object({
        criterion: z.string().describe('The acceptance criterion text, as you received it.'),
        met: z
          .boolean()
          .describe('true only if the code itself satisfies the criterion, not the notes.'),
        evidence: z
          .string()
          .describe(
            'Where it is satisfied (file and function), or what is missing when met is false.',
          ),
      }),
    )
    .describe('One entry per acceptance criterion, in the order you received them.'),
  checklist: z
    .array(
      z.object({
        item: z.enum(ChecklistItem).describe('The id of the checklist question you answer.'),
        status: z
          .enum(ChecklistStatus)
          .describe(
            'ok = satisfied by the code, issue = a problem (also report it in issues), ' +
              'not_applicable = the change does not touch this area.',
          ),
        note: z
          .string()
          .describe(
            'What you checked and where (file or function). For not_applicable give the reason.',
          ),
      }),
    )
    .describe('One entry per checklist id, all of them, in the order of the questions.'),
  issues: z
    .array(
      z.object({
        severity: z
          .enum(IssueSeverity)
          .describe(
            'blocker = money loss, data corruption, a security hole or an unmet acceptance ' +
              'criterion, major = a real bug under plausible conditions or a race condition, ' +
              'minor = an edge case or maintainability problem, nit = style preference.',
          ),
        category: z.enum(IssueCategory).describe('The area the problem belongs to.'),
        file: z.string().describe('Path of the file the problem is in, relative to the root.'),
        line: z.number().int().optional().describe('Line number, when you can name one.'),
        title: z.string().describe('Short title naming the wrong behaviour.'),
        problem: z.string().describe('What is wrong and why it matters, concretely.'),
        suggestedFix: z.string().describe('A concrete change that fixes it.'),
      }),
    )
    .describe('One entry per problem in the changed code. Empty if there is none.'),
  scores: z
    .object({
      correctness: z
        .number()
        .int()
        .min(MIN_SCORE)
        .max(MAX_SCORE)
        .describe(`Does the code do what the step requires, ${SCORE_RANGE}.`),
      paymentSafety: z
        .number()
        .int()
        .min(MIN_SCORE)
        .max(MAX_SCORE)
        .describe(`Money, idempotency, concurrency and security, ${SCORE_RANGE}.`),
      maintainability: z
        .number()
        .int()
        .min(MIN_SCORE)
        .max(MAX_SCORE)
        .describe(`Readability, structure and fit with the project, ${SCORE_RANGE}.`),
      testQuality: z
        .number()
        .int()
        .min(MIN_SCORE)
        .max(MAX_SCORE)
        .describe(`Do the tests prove the behaviour, ${SCORE_RANGE}.`),
      justifications: z
        .record(z.enum(ReviewDimension), z.string())
        .describe('One sentence per dimension saying why it got that score.'),
    })
    .describe('A score per dimension with its justification.'),
  strengths: z.array(z.string()).describe('Up to 3 things done well. Empty if none.'),
  outOfScope: z
    .array(z.string())
    .describe('Problems in code that was not changed in this step. Empty if none.'),
  notReviewed: z
    .array(z.string())
    .describe('Parts of the change you could not review properly, and why. Empty if none.'),
});
