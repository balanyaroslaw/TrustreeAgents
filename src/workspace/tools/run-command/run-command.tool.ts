import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { runCommandSchema } from './run-command.schema';
import { RunCommandService } from './run-command.service';
import { RunCommandValidator } from './run-command.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.RunCommand];

@Injectable()
export class RunCommandTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = runCommandSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    private readonly validator: RunCommandValidator,
    private readonly service: RunCommandService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.run(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
