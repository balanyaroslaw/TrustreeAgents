import { z } from 'zod';

export const roleScopedWriteSchema = z.object({ path: z.string() });
