import { Command, CommandRunner, Option } from 'nest-commander';
import { USAGE_NOT_IMPLEMENTED_MESSAGE } from './cli.constants';
import type { UsageCommandOptions } from './command-options.types';

@Command({
  name: 'usage',
  description: 'Show token and cost usage (stub)',
})
export class UsageCommand extends CommandRunner {
  async run(_inputs: string[], _options: UsageCommandOptions): Promise<void> {
    console.log(USAGE_NOT_IMPLEMENTED_MESSAGE);
  }

  @Option({
    flags: '--run <id>',
    description: 'show the usage of a single run instead of all runs',
  })
  parseRun(value: string): string {
    return value;
  }
}
