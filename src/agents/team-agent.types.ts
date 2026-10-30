import type { AgentRole } from './agent-role.enum';

export interface TeamAgentSummary {
  readonly name: AgentRole;
  readonly role: string;
}
