import type { z } from 'zod';
import type { runPlanSchema } from './run-plan.schema';

export type RunPlan = z.infer<typeof runPlanSchema>;

export type RunPlanStep = RunPlan['steps'][number];
