import { z } from 'zod';

export const writeFileSchema = z.object({
  path: z.string().describe('Path to the file, relative to the workspace root.'),
  content: z
    .string()
    .describe('Full new contents of the file. The file is replaced, not appended to.'),
});
