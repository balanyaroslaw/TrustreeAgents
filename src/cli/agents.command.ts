import { Command, CommandRunner } from 'nest-commander';
import { TEAM_AGENTS } from '../agents/agents.constants';
import {
  AGENTS_TABLE_COLUMN_GAP,
  AGENTS_TABLE_NAME_HEADER,
  AGENTS_TABLE_ROLE_HEADER,
  AGENTS_TABLE_RULE_CHARACTER,
} from './cli.constants';

@Command({
  name: 'agents',
  description: 'List the agents of the team',
})
export class AgentsCommand extends CommandRunner {
  async run(): Promise<void> {
    const nameWidth = Math.max(
      AGENTS_TABLE_NAME_HEADER.length,
      ...TEAM_AGENTS.map((agent) => agent.name.length),
    );
    const roleWidth = Math.max(
      AGENTS_TABLE_ROLE_HEADER.length,
      ...TEAM_AGENTS.map((agent) => agent.role.length),
    );

    console.log(
      `${AGENTS_TABLE_NAME_HEADER.padEnd(nameWidth)}${AGENTS_TABLE_COLUMN_GAP}${AGENTS_TABLE_ROLE_HEADER}`,
    );
    console.log(
      `${AGENTS_TABLE_RULE_CHARACTER.repeat(nameWidth)}${AGENTS_TABLE_COLUMN_GAP}${AGENTS_TABLE_RULE_CHARACTER.repeat(roleWidth)}`,
    );
    for (const agent of TEAM_AGENTS) {
      console.log(`${agent.name.padEnd(nameWidth)}${AGENTS_TABLE_COLUMN_GAP}${agent.role}`);
    }
  }
}
