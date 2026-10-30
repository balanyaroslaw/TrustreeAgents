import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { readFileSchema } from './read-file.schema';
import { ReadFileService } from './read-file.service';
import { ReadFileValidator } from './read-file.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.ReadFile];

@Injectable()
export class ReadFileTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = readFileSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    private readonly validator: ReadFileValidator,
    private readonly service: ReadFileService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.read(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
