import { Command, CommandRunner, Option } from 'nest-commander';

export interface UsageCommandOptions {
  run?: string;
}

@Command({
  name: 'usage',
  description: 'Show token and cost usage (stub)',
})
export class UsageCommand extends CommandRunner {
  async run(_inputs: string[], _options: UsageCommandOptions): Promise<void> {
    console.log('usage: not implemented yet');
  }

  @Option({
    flags: '--run <id>',
    description: 'show the usage of a single run instead of all runs',
  })
  parseRun(value: string): string {
    return value;
  }
}
