import type { CommandRisk } from './command-risk.enum';

export interface CommandClassification {
  readonly risk: CommandRisk;
  readonly reason?: string;
}
