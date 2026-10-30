import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { FILE_TOOL_DEFINITIONS, FIRST_LINE } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.ReadFile];

export const readFileSchema = z
  .object({
    path: z.string().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
    startLine: z
      .number()
      .int()
      .min(FIRST_LINE)
      .optional()
      .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'startLine')),
    endLine: z
      .number()
      .int()
      .min(FIRST_LINE)
      .optional()
      .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'endLine')),
  })
  .refine(
    (input) =>
      input.endLine === undefined ||
      input.startLine === undefined ||
      input.endLine >= input.startLine,
    { message: 'endLine must be greater than or equal to startLine', path: ['endLine'] },
  );
