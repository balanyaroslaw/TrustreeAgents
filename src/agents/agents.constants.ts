import type { AgentDefinition } from './agent-definition.types';
import { AgentName } from './agent-name.enum';

export const TEAM_AGENTS: readonly AgentDefinition[] = [
  {
    name: AgentName.Orchestrator,
    role: 'Splits the prompt into tasks and assigns them to the team',
  },
  { name: AgentName.Developer, role: 'Writes and edits the code for the assigned tasks' },
  { name: AgentName.Qa, role: 'Writes and runs tests, reports defects' },
  { name: AgentName.Reviewer, role: 'Reviews diffs and approves or rejects the result' },
];
