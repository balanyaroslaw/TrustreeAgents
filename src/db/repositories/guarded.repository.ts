import { Logger } from '@nestjs/common';
import { ErrorInspector } from '../../workspace/utils/error.inspector';
import { DatabaseMessages } from '../db.messages';
import type { GuardedWrite } from '../db.types';

// A database write must never lose agent work: everything except the run row itself is guarded,
// logged and turned into a warning instead of an exception.
export abstract class GuardedRepository {
  protected readonly logger = new Logger(this.constructor.name);

  protected async guard<TValue>(
    operation: string,
    write: () => Promise<TValue>,
  ): Promise<GuardedWrite<TValue>> {
    try {
      return { value: await write(), warning: null };
    } catch (error) {
      const warning = DatabaseMessages.writeFailed(operation, ErrorInspector.message(error));
      this.logger.warn(warning);
      return { value: null, warning };
    }
  }

  protected async guardWrite(
    operation: string,
    write: () => Promise<unknown>,
  ): Promise<string | null> {
    return (await this.guard(operation, write)).warning;
  }
}
