import { z } from 'zod';
import { MIN_DECISION_REASON_CHARACTERS } from '../orchestrator.constants';
import { StepDecisionKind } from './step-decision.enum';

export const stepDecisionSchema = z.object({
  decision: z
    .enum(StepDecisionKind)
    .describe(
      'accept = the step is done, rework = the Developer must change it, abort = the run has ' +
        'to stop because continuing cannot help.',
    ),
  reason: z
    .string()
    .min(MIN_DECISION_REASON_CHARACTERS)
    .describe(
      '1-3 sentences explaining the decision in terms of the acceptance criteria and the ' +
        'findings you were given.',
    ),
  reworkFocus: z
    .array(z.string())
    .describe(
      'When reworking: the changes the Developer must make, most important first, one sentence ' +
        'each. Do not retype the QA defects or the Reviewer issues, they are passed on ' +
        'verbatim. Empty for accept and abort.',
    ),
  deferredIssues: z
    .array(
      z.object({
        issue: z.string().describe('The finding you chose not to act on now.'),
        reason: z.string().describe('Why it can wait.'),
      }),
    )
    .describe('Findings consciously left for later. Empty if none.'),
  stepSummary: z
    .string()
    .optional()
    .describe(
      'When accepting: one sentence in the past tense naming what this step delivered, used by ' +
        'later steps and the final report. Omit otherwise.',
    ),
});
