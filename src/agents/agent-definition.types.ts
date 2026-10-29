import { AgentName } from './agent-name.enum';

export interface AgentDefinition {
  readonly name: AgentName;
  readonly role: string;
}
