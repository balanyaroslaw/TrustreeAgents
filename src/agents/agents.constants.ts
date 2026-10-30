import { AgentRole } from './agent-role.enum';
import type { TeamAgentSummary } from './team-agent.types';

export const TEAM_AGENTS: readonly TeamAgentSummary[] = [
  {
    name: AgentRole.Orchestrator,
    role: 'Splits the prompt into tasks and assigns them to the team',
  },
  { name: AgentRole.Developer, role: 'Writes and edits the code for the assigned tasks' },
  { name: AgentRole.Qa, role: 'Writes and runs tests, reports defects' },
  { name: AgentRole.Reviewer, role: 'Reviews diffs and approves or rejects the result' },
];
