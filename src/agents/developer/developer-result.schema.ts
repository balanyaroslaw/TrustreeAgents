import { z } from 'zod';
import { ChangeAction } from './change-action.enum';
import { DeveloperStatus } from './developer-status.enum';
import { MIN_CHANGE_DESCRIPTION_CHARACTERS, MIN_SUMMARY_CHARACTERS } from './developer.constants';

export const developerResultSchema = z.object({
  status: z
    .enum(DeveloperStatus)
    .describe(
      'completed = fully done, partial = some parts not done, blocked = cannot continue ' +
        'without an answer.',
    ),
  summary: z
    .string()
    .min(MIN_SUMMARY_CHARACTERS)
    .describe(
      '2-5 sentences: what was implemented and how, with concrete names. Example: "Added ' +
        'currency (ISO 4217, 3 letters) to Payment entity and CreatePaymentDto; ' +
        'PaymentService.create now validates it against SUPPORTED_CURRENCIES."',
    ),
  changes: z
    .array(
      z.object({
        path: z.string().describe('File path relative to the workspace root.'),
        action: z.enum(ChangeAction).describe('created, modified or deleted.'),
        description: z
          .string()
          .min(MIN_CHANGE_DESCRIPTION_CHARACTERS)
          .describe('One sentence: what changed in this file and why.'),
      }),
    )
    .describe('One entry per file you created, modified or deleted.'),
  decisions: z.array(z.string()).describe('Non-obvious decisions with the reason. Empty if none.'),
  openIssues: z
    .array(z.string())
    .describe('What is not done, assumptions, risks, questions. Empty if none.'),
});
