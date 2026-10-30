import type { z } from 'zod';
import type { developerResultSchema } from './developer-result.schema';

export type DeveloperResult = z.infer<typeof developerResultSchema>;

export type DeveloperChange = DeveloperResult['changes'][number];
