import type { z } from 'zod';

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodTypeAny;
  execute(input: unknown): Promise<string>;
}
