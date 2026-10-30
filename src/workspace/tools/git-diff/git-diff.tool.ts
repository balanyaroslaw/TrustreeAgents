import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { gitDiffSchema } from './git-diff.schema';
import { GitDiffService } from './git-diff.service';
import { GitDiffValidator } from './git-diff.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.GitDiff];

@Injectable()
export class GitDiffTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = gitDiffSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    private readonly validator: GitDiffValidator,
    private readonly service: GitDiffService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.diff(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
