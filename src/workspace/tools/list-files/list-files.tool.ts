import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { LIST_FILES_DESCRIPTION } from '../file-tool.constants';
import { listFilesSchema } from './list-files.schema';
import { ListFilesService } from './list-files.service';
import { ListFilesValidator } from './list-files.validator';

@Injectable()
export class ListFilesTool implements AgentTool {
  readonly name = FileToolName.ListFiles;
  readonly description = LIST_FILES_DESCRIPTION;
  readonly schema = listFilesSchema;

  constructor(
    private readonly validator: ListFilesValidator,
    private readonly service: ListFilesService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.list(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
