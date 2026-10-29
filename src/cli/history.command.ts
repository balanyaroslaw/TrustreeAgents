import { Command, CommandRunner, Option } from 'nest-commander';
import {
  DEFAULT_HISTORY_LIMIT,
  HISTORY_NOT_IMPLEMENTED_MESSAGE,
  INVALID_ARGUMENT_EXIT_CODE,
  INVALID_LIMIT_MESSAGE,
} from './cli.constants';
import type { HistoryCommandOptions } from './command-options.types';

@Command({
  name: 'history',
  description: 'Show the history of previous runs (stub)',
})
export class HistoryCommand extends CommandRunner {
  async run(_inputs: string[], options: HistoryCommandOptions): Promise<void> {
    const { limit } = options;
    if (!Number.isInteger(limit) || limit <= 0) {
      console.error(INVALID_LIMIT_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }

    console.log(HISTORY_NOT_IMPLEMENTED_MESSAGE);
  }

  @Option({
    flags: '--limit <n>',
    description: 'maximum number of entries to show (positive integer)',
    defaultValue: DEFAULT_HISTORY_LIMIT,
  })
  parseLimit(value: string): number {
    return Number(value);
  }
}
