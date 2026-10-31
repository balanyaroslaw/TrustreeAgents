import { z } from 'zod';
import {
  MAX_BRIEF_FOCUS_ITEMS,
  MAX_BRIEF_INTERFACE_ITEMS,
  MAX_BRIEF_RISK_ITEMS,
} from './qa-input.constants';

export const qaBriefSchema = z.object({
  focus: z
    .array(z.string())
    .max(MAX_BRIEF_FOCUS_ITEMS)
    .describe(
      'What QA should verify first, as concrete behaviours, not outcomes. Example: "POST ' +
        '/payments/:id/refunds rejects a total above the captured amount". Never a replacement ' +
        'for the acceptance criteria.',
    ),
  risks: z
    .array(z.string())
    .max(MAX_BRIEF_RISK_ITEMS)
    .describe(
      'Risky areas of this change that need extra attention, for example concurrency, money ' +
        'handling or status transitions.',
    ),
  changedInterfaces: z
    .array(z.string())
    .max(MAX_BRIEF_INTERFACE_ITEMS)
    .describe(
      'Endpoints, methods, entities or events added or changed in this step, as you understand ' +
        'them from the Developer report.',
    ),
});
