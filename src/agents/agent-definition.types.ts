import type { FileToolName } from '../workspace/enums/file-tool-name.enum';
import type { AgentRole } from './agent-role.enum';

export type DefinedAgentRole = AgentRole.Developer | AgentRole.Qa;

export interface AgentDefinition {
  readonly role: AgentRole;
  readonly toolDescription: string;
  readonly mission: string;
  readonly workflow: readonly string[];
  readonly rules: readonly string[];
  readonly outputFormat: readonly string[];
  readonly tools: readonly FileToolName[];
  readonly maxTurns: number;
}
