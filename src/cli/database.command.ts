import { CommandRunner } from 'nest-commander';
import type { DatabaseBootstrap } from '../db/database.bootstrap';

// Every command that reads or writes the database starts here: migrations are applied and the
// connection is proven before the command does anything.
export abstract class DatabaseCommand extends CommandRunner {
  constructor(private readonly bootstrap: DatabaseBootstrap) {
    super();
  }

  protected async ensureDatabase(): Promise<void> {
    await this.bootstrap.ensureReady();
  }
}
