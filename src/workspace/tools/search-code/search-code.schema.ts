import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import {
  FILE_TOOL_DEFINITIONS,
  MAX_SEARCH_CONTEXT_LINES,
  MAX_SEARCH_PATTERN_LENGTH,
  MIN_SEARCH_CONTEXT_LINES,
} from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.SearchCode];
const MIN_PATTERN_LENGTH = 1;

export const searchCodeSchema = z.object({
  pattern: z
    .string()
    .min(MIN_PATTERN_LENGTH, 'pattern must not be empty')
    .max(MAX_SEARCH_PATTERN_LENGTH)
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'pattern')),
  path: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
  glob: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'glob')),
  literal: z
    .boolean()
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'literal')),
  caseSensitive: z
    .boolean()
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'caseSensitive')),
  contextLines: z
    .number()
    .int()
    .min(MIN_SEARCH_CONTEXT_LINES)
    .max(MAX_SEARCH_CONTEXT_LINES)
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'contextLines')),
});
