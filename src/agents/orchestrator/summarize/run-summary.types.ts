import type { z } from 'zod';
import type { runSummarySchema } from './run-summary.schema';

export type RunSummary = z.infer<typeof runSummarySchema>;

export type UnfinishedWork = RunSummary['notDone'][number];
