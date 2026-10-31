import { Inject, Injectable } from '@nestjs/common';
import { AGENT_DEFINITIONS } from '../../agents/agent-definitions.constants';
import type { DefinedAgentRole } from '../../agents/agent-definition.types';
import type { AgentTool } from '../../agents/agent-tool.types';
import type { FileToolName } from '../enums/file-tool-name.enum';
import { RoleWritePolicy } from '../security/role-write.policy';
import { WorkspaceService } from '../workspace.service';
import { RoleScopedWriteTool } from './role-scoped-write.tool';
import { DeleteFileTool } from './delete-file/delete-file.tool';
import { EditFileTool } from './edit-file/edit-file.tool';
import { FILE_TOOL_DEFINITIONS, ROLE_SCOPED_WRITE_TOOLS } from './file-tool.constants';
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

  // Every parameter carries an explicit @Inject so the constructor also resolves in runtimes
  // that do not emit design:paramtypes metadata (the tsx dev script).
  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(ReadFileTool) readFileTool: ReadFileTool,
    @Inject(WriteFileTool) writeFileTool: WriteFileTool,
    @Inject(ListFilesTool) listFilesTool: ListFilesTool,
    @Inject(EditFileTool) editFileTool: EditFileTool,
    @Inject(DeleteFileTool) deleteFileTool: DeleteFileTool,
    @Inject(GitStatusTool) gitStatusTool: GitStatusTool,
    @Inject(GitDiffTool) gitDiffTool: GitDiffTool,
    @Inject(SearchCodeTool) searchCodeTool: SearchCodeTool,
    @Inject(RunCommandTool) runCommandTool: RunCommandTool,
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

  forRole(role: DefinedAgentRole): readonly AgentTool[] {
    const tools = this.build(AGENT_DEFINITIONS[role].tools);
    if (!RoleWritePolicy.hasRules(role)) {
      return tools;
    }
    return tools.map((tool) => this.scopedToRole(role, tool));
  }

  private scopedToRole(role: DefinedAgentRole, tool: AgentTool): AgentTool {
    return ROLE_SCOPED_WRITE_TOOLS.some((name) => name === tool.name)
      ? new RoleScopedWriteTool(tool, role, this.workspace)
      : tool;
  }
}
