import { Inject, Injectable, Logger } from '@nestjs/common';
import { ErrorInspector } from '../workspace/utils/error.inspector';
import { DATABASE_EXIT_CODE, DATABASE_UNREACHABLE_MESSAGE } from './db.constants';
import { MigrationRunner } from './migration.runner';
import { ModelPriceSeeder } from './prices/model-price.seeder';
import { ModelPriceRepository } from './repositories/model-price.repository';

// What every command that reads or writes the database does first: apply pending migrations,
// prove the connection works, and seed the prices when the table is still empty. A database that
// cannot be reached ends the command with the one line that says how to start it.
@Injectable()
export class DatabaseBootstrap {
  private readonly logger = new Logger(DatabaseBootstrap.name);

  constructor(
    @Inject(MigrationRunner) private readonly migrations: MigrationRunner,
    @Inject(ModelPriceRepository) private readonly prices: ModelPriceRepository,
    @Inject(ModelPriceSeeder) private readonly seeder: ModelPriceSeeder,
  ) {}

  async ensureReady(): Promise<void> {
    const migration = await this.migrations.deploy();
    if (!migration.applied) {
      this.fail(migration.output);
    }
    try {
      await this.prices.count();
    } catch (error) {
      this.fail(ErrorInspector.message(error));
    }
    await this.seeder.seedWhenEmpty();
  }

  private fail(detail: string): never {
    console.error(DATABASE_UNREACHABLE_MESSAGE);
    if (detail !== '') {
      this.logger.debug(detail);
    }
    process.exit(DATABASE_EXIT_CODE);
  }
}
