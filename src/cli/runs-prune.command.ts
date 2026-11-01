import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { DEFAULT_PRUNE_DAYS } from '../db/db.constants';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { DatabaseMessages } from '../db/db.messages';
import { RunRepository } from '../db/repositories/run.repository';
import { ConsoleUserPrompter } from '../execution/interaction/console-user-prompter';
import {
  CONFIRMATION_ANSWER,
  INVALID_ARGUMENT_EXIT_CODE,
  INVALID_DAYS_MESSAGE,
  PRUNE_CANCELLED_MESSAGE,
  PRUNE_NEEDS_CONFIRMATION_MESSAGE,
} from './cli.constants';
import type { PruneCommandOptions } from './command-options.types';
import { DatabaseCommand } from './database.command';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;
const NO_RUNS = 0;
const FIRST_ANSWER = 0;
const SINGLE = 1;

@Command({
  name: 'runs:prune',
  description: 'Delete old runs with their steps, attempts and calls',
})
export class RunsPruneCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(RunRepository) private readonly runs: RunRepository,
  ) {
    super(bootstrap);
  }

  async run(_inputs: string[], options: PruneCommandOptions): Promise<void> {
    const days = options.olderThan ?? DEFAULT_PRUNE_DAYS;
    if (!Number.isInteger(days) || days <= NO_RUNS) {
      console.error(INVALID_DAYS_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }
    await this.ensureDatabase();

    const cutoff = new Date(Date.now() - days * MILLISECONDS_PER_DAY);
    const target = options.run;
    const count =
      target === undefined
        ? await this.runs.countOlderThan(cutoff)
        : await RunsPruneCommand.countOf(await this.runs.byIdOrPrefix(target));
    if (count === NO_RUNS) {
      console.log(DatabaseMessages.nothingToPrune());
      return;
    }
    if (!(await RunsPruneCommand.confirmed(count, options.yes === true))) {
      return;
    }
    const deleted =
      target === undefined
        ? await this.runs.deleteOlderThan(cutoff)
        : await this.runs.deleteById((await this.runs.byIdOrPrefix(target))?.id ?? target);

    console.log(DatabaseMessages.pruned(deleted));
  }

  @Option({
    flags: '--older-than <days>',
    description: `delete runs started more than this many days ago (default ${DEFAULT_PRUNE_DAYS})`,
  })
  parseOlderThan(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--run <id>',
    description: 'delete one run instead (full id or its short form)',
  })
  parseRun(value: string): string {
    return value;
  }

  @Option({
    flags: '--yes',
    description: 'do not ask for confirmation',
  })
  parseYes(): boolean {
    return true;
  }

  // Attempt reports are large and deleting them cannot be undone, so a terminal is asked first.
  private static async confirmed(count: number, skipQuestion: boolean): Promise<boolean> {
    if (skipQuestion) {
      return true;
    }
    const prompter = ConsoleUserPrompter.forTty();
    if (prompter === null) {
      console.error(PRUNE_NEEDS_CONFIRMATION_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }
    const answers = await prompter.ask([
      `delete ${count} run${count === SINGLE ? '' : 's'} with all their attempts? ` +
        `type "${CONFIRMATION_ANSWER}" to confirm:`,
    ]);
    if (answers[FIRST_ANSWER]?.trim().toLowerCase() !== CONFIRMATION_ANSWER) {
      console.log(PRUNE_CANCELLED_MESSAGE);
      return false;
    }

    return true;
  }

  private static async countOf(run: { id: string } | null): Promise<number> {
    return run === null ? NO_RUNS : SINGLE;
  }
}
