import { z } from 'zod';
import {
  MAX_CLARIFYING_QUESTIONS,
  MAX_PLAN_STEPS,
  MIN_ACCEPTANCE_CRITERIA,
} from '../orchestrator.constants';

export const runPlanSchema = z.object({
  clarifyingQuestions: z
    .array(z.string())
    .max(MAX_CLARIFYING_QUESTIONS)
    .describe(
      'Questions to ask before planning, each answerable in one sentence. A non-empty list ' +
        'means the plan is ignored, so return questions or a plan, never both. Empty when the ' +
        'request is clear.',
    ),
  summary: z
    .string()
    .describe(
      '2-4 sentences on what will be built or changed and the approach. Empty only when you ' +
        'return clarifying questions.',
    ),
  steps: z
    .array(
      z.object({
        title: z.string().describe('Short title of the step, naming the behaviour it delivers.'),
        description: z
          .string()
          .describe('What the Developer has to do in this step, in a few sentences.'),
        acceptanceCriteria: z
          .array(z.string())
          .min(MIN_ACCEPTANCE_CRITERIA)
          .describe(
            'Observable statements that must be true after the step, each checkable by a test. ' +
              'Example: "POST /payments returns 201 with status pending and stores the amount ' +
              'in minor units".',
          ),
      }),
    )
    .max(MAX_PLAN_STEPS)
    .describe('The steps in the order they must be done. Empty when you return questions.'),
  assumptions: z
    .array(z.string())
    .describe('What you assumed where the request was silent. Empty if none.'),
});
