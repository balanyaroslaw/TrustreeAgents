import { z } from 'zod';

// Only what the model calls need. The database variables are read by Prisma itself.
export const modelEnvironmentSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  ORCHESTRATOR_MODEL: z.string().min(1).optional(),
  DEVELOPER_MODEL: z.string().min(1).optional(),
  QA_MODEL: z.string().min(1).optional(),
  REVIEWER_MODEL: z.string().min(1).optional(),
});
