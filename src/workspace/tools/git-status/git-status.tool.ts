import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { gitStatusSchema } from './git-status.schema';
import { GitStatusService } from './git-status.service';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.GitStatus];

@Injectable()
export class GitStatusTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = gitStatusSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(private readonly service: GitStatusService) {}

  async execute(): Promise<string> {
    try {
      return await this.service.status();
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
