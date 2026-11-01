import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { CallRecorders } from './call-recorders.types';

// Carries the recorders of the agent call that is running to the tool services, which are
// singletons and cannot take per-call constructor arguments. Each call runs inside its own
// storage frame, so two calls never see each other's recorders, and a tool used outside a call
// simply records nothing.
@Injectable()
export class AgentCallStore {
  private readonly storage = new AsyncLocalStorage<CallRecorders>();

  async run<TResult>(recorders: CallRecorders, operation: () => Promise<TResult>): Promise<TResult> {
    return this.storage.run(recorders, operation);
  }

  current(): CallRecorders | undefined {
    return this.storage.getStore();
  }
}
