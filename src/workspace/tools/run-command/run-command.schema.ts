import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import {
  FILE_TOOL_DEFINITIONS,
  MAX_COMMAND_LENGTH,
  MAX_COMMAND_TIMEOUT_SECONDS,
  MIN_COMMAND_TIMEOUT_SECONDS,
} from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.RunCommand];
const MIN_COMMAND_LENGTH = 1;

export const runCommandSchema = z.object({
  command: z
    .string()
    .min(MIN_COMMAND_LENGTH, 'command must not be empty')
    .max(MAX_COMMAND_LENGTH)
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'command')),
  timeoutSeconds: z
    .number()
    .int()
    .min(MIN_COMMAND_TIMEOUT_SECONDS)
    .max(MAX_COMMAND_TIMEOUT_SECONDS)
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'timeoutSeconds')),
  cwd: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'cwd')),
});
