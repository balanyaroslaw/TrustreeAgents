import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { WRITE_FILE_DESCRIPTION } from '../file-tool.constants';
import { writeFileSchema } from './write-file.schema';
import { WriteFileService } from './write-file.service';
import { WriteFileValidator } from './write-file.validator';

@Injectable()
export class WriteFileTool implements AgentTool {
  readonly name = FileToolName.WriteFile;
  readonly description = WRITE_FILE_DESCRIPTION;
  readonly schema = writeFileSchema;

  constructor(
    private readonly validator: WriteFileValidator,
    private readonly service: WriteFileService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.write(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
