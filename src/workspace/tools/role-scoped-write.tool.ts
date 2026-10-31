import type { z } from 'zod';
import type { AgentRole } from '../../agents/agent-role.enum';
import type { AgentTool } from '../../agents/agent-tool.types';
import { PathPolicy } from '../security/path.policy';
import { RoleWritePolicy } from '../security/role-write.policy';
import { ErrorInspector } from '../utils/error.inspector';
import { WorkspaceMessages } from '../workspace.messages';
import type { WorkspaceService } from '../workspace.service';
import { roleScopedWriteSchema } from './role-scoped-write.schema';

// Wraps a write tool with the write rules of one role: the normal path policy is checked first,
// the role rules after it, and only then the wrapped tool runs its own validation.
export class RoleScopedWriteTool implements AgentTool {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType<unknown>;
  readonly requiresApproval: boolean;
  readonly mutatesWorkspace: boolean;

  constructor(
    private readonly tool: AgentTool,
    private readonly role: AgentRole,
    private readonly workspace: WorkspaceService,
  ) {
    this.name = tool.name;
    this.description = tool.description;
    this.schema = tool.schema;
    this.requiresApproval = tool.requiresApproval;
    this.mutatesWorkspace = tool.mutatesWorkspace;
  }

  async execute(input: unknown): Promise<string> {
    const parsed = roleScopedWriteSchema.safeParse(input);
    if (!parsed.success) {
      return this.tool.execute(input);
    }

    const denied = await this.denyReason(parsed.data.path);
    return denied === null ? this.tool.execute(input) : WorkspaceMessages.error(denied);
  }

  private async denyReason(inputPath: string): Promise<string | null> {
    try {
      const relativePath = this.workspace.toRelative(await this.workspace.resolveSafe(inputPath));
      return (
        PathPolicy.denyWriteReason(relativePath) ?? RoleWritePolicy.check(this.role, relativePath)
      );
    } catch (error) {
      return ErrorInspector.message(error);
    }
  }
}
