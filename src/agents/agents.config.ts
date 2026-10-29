export interface AgentDefinition {
  readonly name: string;
  readonly role: string;
}

export const AGENTS: readonly AgentDefinition[] = [
  { name: 'Orchestrator', role: 'Splits the prompt into tasks and assigns them to the team' },
  { name: 'Developer', role: 'Writes and edits the code for the assigned tasks' },
  { name: 'QA', role: 'Writes and runs tests, reports defects' },
  { name: 'Reviewer', role: 'Reviews diffs and approves or rejects the result' },
] as const;
