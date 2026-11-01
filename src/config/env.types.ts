import type { z } from 'zod';
import type { modelEnvironmentSchema } from './env.schema';

export type ModelEnvironment = z.infer<typeof modelEnvironmentSchema>;
