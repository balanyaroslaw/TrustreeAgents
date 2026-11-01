import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { DatabaseMessages } from '../db/db.messages';
import { RunRepository } from '../db/repositories/run.repository';
import {
  DEFAULT_HISTORY_LIMIT,
  INVALID_ARGUMENT_EXIT_CODE,
  INVALID_LIMIT_MESSAGE,
} from './cli.constants';
import type { HistoryCommandOptions } from './command-options.types';
import { DatabaseCommand } from './database.command';
import { HistoryFormatter } from './history.formatter';

const JSON_INDENT = 2;
const FIRST_INPUT = 0;
const NO_RUNS = 0;

@Command({
  name: 'history',
  description: 'Show previous runs, or one run in detail',
  arguments: '[runId]',
  argsDescription: {
    runId: 'id of a single run (full or short form)',
  },
})
export class HistoryCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(RunRepository) private readonly runs: RunRepository,
  ) {
    super(bootstrap);
  }

  async run(inputs: string[], options: HistoryCommandOptions): Promise<void> {
    const { limit } = options;
    if (!Number.isInteger(limit) || limit <= NO_RUNS) {
      console.error(INVALID_LIMIT_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }
    await this.ensureDatabase();

    const requested = inputs[FIRST_INPUT];
    if (requested !== undefined) {
      await this.showOne(requested, options);
      return;
    }
    const rows = await this.runs.recent(limit);
    if (options.json === true) {
      console.log(JSON.stringify(rows, null, JSON_INDENT));
      return;
    }
    console.log(rows.length === NO_RUNS ? DatabaseMessages.noRuns() : HistoryFormatter.list(rows));
  }

  @Option({
    flags: '--limit <n>',
    description: 'maximum number of entries to show (positive integer)',
    defaultValue: DEFAULT_HISTORY_LIMIT,
  })
  parseLimit(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--json',
    description: 'print machine-readable output',
  })
  parseJson(): boolean {
    return true;
  }

  private async showOne(idOrPrefix: string, options: HistoryCommandOptions): Promise<void> {
    const run = await this.runs.byIdOrPrefix(idOrPrefix);
    if (run === null) {
      console.log(DatabaseMessages.runNotFound(idOrPrefix));
      return;
    }
    console.log(
      options.json === true ? JSON.stringify(run, null, JSON_INDENT) : HistoryFormatter.detail(run),
    );
  }
}
