import { Command, CommandRunner } from 'nest-commander';
import { AGENTS } from '../agents/agents.config';

@Command({
  name: 'agents',
  description: 'List the agents of the team',
})
export class AgentsCommand extends CommandRunner {
  async run(): Promise<void> {
    const nameWidth = Math.max('NAME'.length, ...AGENTS.map((agent) => agent.name.length));
    const roleWidth = Math.max('ROLE'.length, ...AGENTS.map((agent) => agent.role.length));

    console.log(`${'NAME'.padEnd(nameWidth)}  ROLE`);
    console.log(`${'-'.repeat(nameWidth)}  ${'-'.repeat(roleWidth)}`);
    for (const agent of AGENTS) {
      console.log(`${agent.name.padEnd(nameWidth)}  ${agent.role}`);
    }
  }
}
