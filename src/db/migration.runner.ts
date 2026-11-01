import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { MIGRATION_ARGS, MIGRATION_TIMEOUT_MS, PRISMA_CLI_RELATIVE_PATH } from './db.constants';
import type { MigrationResult } from './db.types';

const SUCCESS_EXIT_CODE = 0;

// Applies pending migrations before a command that needs the database runs, by calling the
// Prisma CLI as a child process with an environment that carries no secrets beyond the
// connection string it needs.
@Injectable()
export class MigrationRunner {
  private readonly logger = new Logger(MigrationRunner.name);

  async deploy(): Promise<MigrationResult> {
    const cli = join(process.cwd(), PRISMA_CLI_RELATIVE_PATH);
    if (!existsSync(cli)) {
      this.logger.warn(`the Prisma CLI was not found at ${cli}, migrations were not applied`);
      return { applied: false, output: '' };
    }

    return new Promise((resolve) => {
      execFile(
        process.execPath,
        [cli, ...MIGRATION_ARGS],
        {
          cwd: process.cwd(),
          timeout: MIGRATION_TIMEOUT_MS,
          encoding: 'utf8',
          env: MigrationRunner.childEnvironment(),
        },
        (error, stdout, stderr) => {
          const output = `${stdout}${stderr}`.trim();
          resolve({ applied: error === null, output });
        },
      );
    });
  }

  private static childEnvironment(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      LC_ALL: 'C',
      NO_COLOR: '1',
      CHECKPOINT_DISABLE: String(SUCCESS_EXIT_CODE + 1),
    };
  }
}
