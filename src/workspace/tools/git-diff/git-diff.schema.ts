import { z } from 'zod';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { GitDiffMode } from './git-diff-mode.enum';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.GitDiff];

export const gitDiffSchema = z.object({
  path: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'path')),
  mode: z
    .enum(GitDiffMode)
    .optional()
    .describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'mode')),
  base: z.string().optional().describe(ToolDefinitionRenderer.parameterHint(DEFINITION, 'base')),
});
