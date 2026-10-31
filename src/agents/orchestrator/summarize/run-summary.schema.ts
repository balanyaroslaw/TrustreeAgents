import { z } from 'zod';
import { MIN_RUN_OVERVIEW_CHARACTERS } from '../orchestrator.constants';

export const runSummarySchema = z.object({
  overview: z
    .string()
    .min(MIN_RUN_OVERVIEW_CHARACTERS)
    .describe(
      '3-6 sentences on what the run delivered, using only what the step summaries support. No ' +
        'numbers: the system adds the real metrics.',
    ),
  notDone: z
    .array(
      z.object({
        what: z.string().describe('What was planned but not completed.'),
        reason: z.string().describe('Why it was not completed.'),
      }),
    )
    .describe('What was planned but not completed, with the reason. Empty if none.'),
  followUps: z
    .array(z.string())
    .describe(
      'What a human should look at next, most important first: deferred findings, assumptions, ' +
        'known limitations. Empty if none.',
    ),
});
