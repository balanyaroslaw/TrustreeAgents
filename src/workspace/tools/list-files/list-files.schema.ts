import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { FILE_TOOL_DEFINITIONS, MAX_LIST_DEPTH, MIN_LIST_DEPTH } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.ListFiles];

export const listFilesSchema = z.object({
  path: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
  depth: z
    .number()
    .int()
    .min(MIN_LIST_DEPTH)
    .max(MAX_LIST_DEPTH)
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'depth')),
});
