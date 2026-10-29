import { z } from 'zod';
import { DEFAULT_LIST_DEPTH, MAX_LIST_DEPTH, MIN_LIST_DEPTH } from '../file-tool.constants';

export const listFilesSchema = z.object({
  path: z
    .string()
    .optional()
    .describe('Directory to list, relative to the workspace root. Defaults to the root.'),
  depth: z
    .number()
    .int()
    .min(MIN_LIST_DEPTH)
    .max(MAX_LIST_DEPTH)
    .optional()
    .describe(
      `How many directory levels to show, ${MIN_LIST_DEPTH}-${MAX_LIST_DEPTH}. Defaults to ${DEFAULT_LIST_DEPTH}.`,
    ),
});
