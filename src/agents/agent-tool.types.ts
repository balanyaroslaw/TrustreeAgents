import type { z } from 'zod';

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType<unknown>;
  readonly requiresApproval: boolean;
  readonly mutatesWorkspace: boolean;
  execute(input: unknown): Promise<string>;
}
