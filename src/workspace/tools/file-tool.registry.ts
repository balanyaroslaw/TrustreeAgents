import { Injectable } from '@nestjs/common';
import type { AgentTool } from '../../agents/agent-tool.types';
import type { FileToolName } from '../enums/file-tool-name.enum';
import { ListFilesTool } from './list-files/list-files.tool';
import { ReadFileTool } from './read-file/read-file.tool';
import { WriteFileTool } from './write-file/write-file.tool';

@Injectable()
export class FileToolRegistry {
  private readonly tools: readonly AgentTool[];

  constructor(
    readFileTool: ReadFileTool,
    writeFileTool: WriteFileTool,
    listFilesTool: ListFilesTool,
  ) {
    this.tools = [readFileTool, writeFileTool, listFilesTool];
  }

  all(): readonly AgentTool[] {
    return this.tools;
  }

  get(name: FileToolName): AgentTool | undefined {
    return this.tools.find((tool) => tool.name === name);
  }
}
