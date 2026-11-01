import { Inject, Injectable } from '@nestjs/common';
import type { AgentTool } from '../../../agents/agent-tool.types';
import { FileToolName } from '../../enums/file-tool-name.enum';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { FILE_TOOL_DEFINITIONS } from '../file-tool.constants';
import { ToolDefinitionRenderer } from '../tool-definition.renderer';
import { searchCodeSchema } from './search-code.schema';
import { SearchCodeService } from './search-code.service';
import { SearchCodeValidator } from './search-code.validator';

const DEFINITION = FILE_TOOL_DEFINITIONS[FileToolName.SearchCode];

@Injectable()
export class SearchCodeTool implements AgentTool {
  readonly name = DEFINITION.name;
  readonly description = ToolDefinitionRenderer.description(DEFINITION);
  readonly schema = searchCodeSchema;
  readonly requiresApproval = DEFINITION.requiresApproval;
  readonly mutatesWorkspace = DEFINITION.mutatesWorkspace;

  constructor(
    @Inject(SearchCodeValidator) private readonly validator: SearchCodeValidator,
    @Inject(SearchCodeService) private readonly service: SearchCodeService,
  ) {}

  async execute(input: unknown): Promise<string> {
    try {
      return await this.service.search(await this.validator.validate(input));
    } catch (error) {
      return WorkspaceMessages.error(ErrorInspector.message(error));
    }
  }
}
