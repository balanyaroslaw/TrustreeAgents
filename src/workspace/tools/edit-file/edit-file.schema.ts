import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.EditFile];

export const editFileSchema = z.object({
  path: z.string().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
  oldString: z
    .string()
    .min(1, 'oldString must not be empty')
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'oldString')),
  newString: z.string().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'newString')),
  replaceAll: z
    .boolean()
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'replaceAll')),
});
