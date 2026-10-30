import { Injectable } from '@nestjs/common';

@Injectable()
export class CommandLock {
  private queue: Promise<unknown> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const current = this.queue.then(operation, operation);
    this.queue = current.catch(() => undefined);
    return current;
  }
}
