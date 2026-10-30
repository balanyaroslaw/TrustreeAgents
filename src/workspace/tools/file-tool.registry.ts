import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../agents/agent-tool.types';
import type { FileToolName } from '../enums/file-tool-name.enum';
import { DeleteFileTool } from './delete-file/delete-file.tool';
import { EditFileTool } from './edit-file/edit-file.tool';
import { FILE_TOOL_DEFINITIONS } from './file-tool.constants';
import type { ToolDefinition } from './file-tool.types';
import { GitDiffTool } from './git-diff/git-diff.tool';
import { GitStatusTool } from './git-status/git-status.tool';
import { ListFilesTool } from './list-files/list-files.tool';
import { ReadFileTool } from './read-file/read-file.tool';
import { RunCommandTool } from './run-command/run-command.tool';
import { SearchCodeTool } from './search-code/search-code.tool';
import { WriteFileTool } from './write-file/write-file.tool';

@Injectable()
export class FileToolRegistry {
  private readonly tools: readonly AgentTool[];

  constructor(
    readFileTool: ReadFileTool,
    writeFileTool: WriteFileTool,
    listFilesTool: ListFilesTool,
    editFileTool: EditFileTool,
    deleteFileTool: DeleteFileTool,
    gitStatusTool: GitStatusTool,
    gitDiffTool: GitDiffTool,
    searchCodeTool: SearchCodeTool,
    runCommandTool: RunCommandTool,
  ) {
    this.tools = [
      readFileTool,
      writeFileTool,
      listFilesTool,
      editFileTool,
      deleteFileTool,
      gitStatusTool,
      gitDiffTool,
      searchCodeTool,
      runCommandTool,
    ];
  }

  all(): readonly AgentTool[] {
    return this.tools;
  }

  definitions(): readonly ToolDefinition[] {
    return Object.values(FILE_TOOL_DEFINITIONS);
  }

  get(name: FileToolName): AgentTool | undefined {
    return this.tools.find((tool) => tool.name === name);
  }

  build(names: readonly FileToolName[]): readonly AgentTool[] {
    return names.flatMap((name) => {
      const tool = this.get(name);
      return tool === undefined ? [] : [tool];
    });
  }
}
