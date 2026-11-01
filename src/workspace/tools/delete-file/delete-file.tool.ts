import { Inject, Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { deleteFileSchema } from './delete-file.schema';
import { DeleteFileService } from './delete-file.service';
import { DeleteFileValidator } from './delete-file.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.DeleteFile];

@Injectable()
export class DeleteFileTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = deleteFileSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    @Inject(DeleteFileValidator) private readonly validator: DeleteFileValidator,
    @Inject(DeleteFileService) private readonly service: DeleteFileService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.delete(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
