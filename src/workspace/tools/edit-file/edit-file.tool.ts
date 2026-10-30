import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { editFileSchema } from './edit-file.schema';
import { EditFileService } from './edit-file.service';
import { EditFileValidator } from './edit-file.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.EditFile];

@Injectable()
export class EditFileTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = editFileSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    private readonly validator: EditFileValidator,
    private readonly service: EditFileService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.edit(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
