import type { z } from 'zod';
import type { qaBriefSchema } from './qa-brief.schema';

export type QaBrief = z.infer<typeof qaBriefSchema>;
