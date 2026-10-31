import type { z } from 'zod';
import type { stepDecisionSchema } from './step-decision.schema';

export type StepDecision = z.infer<typeof stepDecisionSchema>;

export type DeferredIssue = StepDecision['deferredIssues'][number];
