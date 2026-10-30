import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.WriteFile];

export const writeFileSchema = z.object({
  path: z.string().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
  content: z.string().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'content')),
});
