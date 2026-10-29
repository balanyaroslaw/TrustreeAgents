import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { READ_FILE_DESCRIPTION } from '../file-tool.constants';
import { readFileSchema } from './read-file.schema';
import { ReadFileService } from './read-file.service';
import { ReadFileValidator } from './read-file.validator';

@Injectable()
export class ReadFileTool implements AgentTool {
  readonly name = FileToolName.ReadFile;
  readonly description = READ_FILE_DESCRIPTION;
  readonly schema = readFileSchema;

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
