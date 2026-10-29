import { Command, CommandRunner, Option } from 'nest-commander';

export interface HistoryCommandOptions {
  limit: number;
}

@Command({
  name: 'history',
  description: 'Show the history of previous runs (stub)',
})
export class HistoryCommand extends CommandRunner {
  async run(_inputs: string[], options: HistoryCommandOptions): Promise<void> {
    const { limit } = options;
    if (!Number.isInteger(limit) || limit <= 0) {
      console.error('error: --limit must be a positive integer');
      process.exit(1);
    }

    console.log('history: not implemented yet');
  }

  @Option({
    flags: '--limit <n>',
    description: 'maximum number of entries to show (positive integer)',
    defaultValue: 10,
  })
  parseLimit(value: string): number {
    return Number(value);
  }
}
