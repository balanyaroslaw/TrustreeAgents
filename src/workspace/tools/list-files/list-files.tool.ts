import { Inject, Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { listFilesSchema } from './list-files.schema';
import { ListFilesService } from './list-files.service';
import { ListFilesValidator } from './list-files.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.ListFiles];

@Injectable()
export class ListFilesTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = listFilesSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    @Inject(ListFilesValidator) private readonly validator: ListFilesValidator,
    @Inject(ListFilesService) private readonly service: ListFilesService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.list(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
