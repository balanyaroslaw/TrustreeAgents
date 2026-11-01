import { Inject, Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { writeFileSchema } from './write-file.schema';
import { WriteFileService } from './write-file.service';
import { WriteFileValidator } from './write-file.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.WriteFile];

@Injectable()
export class WriteFileTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = writeFileSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    @Inject(WriteFileValidator) private readonly validator: WriteFileValidator,
    @Inject(WriteFileService) private readonly service: WriteFileService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.write(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
