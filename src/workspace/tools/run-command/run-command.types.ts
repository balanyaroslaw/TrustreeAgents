import type { z } from 'zod';
import type { CommandRisk } from '../../commands/command-risk.enum';
import type { runCommandSchema } from './run-command.schema';

export type RunCommandInput = z.infer<typeof runCommandSchema>;

export interface ValidatedCommandRequest {
  readonly executable: string;
  readonly args: readonly string[];
  readonly displayCommand: string;
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly risk: CommandRisk;
}

export interface CommandOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly output: string;
  readonly outputCut: boolean;
  readonly timedOut: boolean;
  readonly durationMs: number;
}
