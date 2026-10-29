import { z } from 'zod';
import { FIRST_LINE } from '../file-tool.constants';

export const readFileSchema = z
  .object({
    path: z.string().describe('Path to the file, relative to the workspace root.'),
    startLine: z
      .number()
      .int()
      .min(FIRST_LINE)
      .optional()
      .describe('First line to return, 1-based. Defaults to 1.'),
    endLine: z
      .number()
      .int()
      .min(FIRST_LINE)
      .optional()
      .describe('Last line to return, inclusive. Defaults to the end of the file.'),
  })
  .refine(
    (input) =>
      input.endLine === undefined ||
      input.startLine === undefined ||
      input.endLine >= input.startLine,
    { message: 'endLine must be greater than or equal to startLine', path: ['endLine'] },
  );
