import { Inject, Injectable } from '@nestjs/common';
import { AgentCallRepository } from '../db/repositories/agent-call.repository';
import { EventBus } from '../events/event-bus';
import type {
  AgentInvokerFactory,
  InvokerScope,
} from '../execution/agents/agent-invoker-factory.port.types';
import { AgentCallStore } from '../workspace/activity/agent-call.store';
import { AgentFactory } from './agent.factory';
import type { CallScope, InvokerOptions } from './call-scope.types';
import { SdkAgentInvoker } from './sdk-agent-invoker';
import { SdkBootstrap } from './sdk.bootstrap';

// One invoker per unit of work: `team agent` creates one for its single call, the executor one
// per attempt. The scope it is created with is what every call of that unit is recorded under.
@Injectable()
export class SdkInvokerFactory implements AgentInvokerFactory {
  constructor(
    @Inject(AgentFactory) private readonly agents: AgentFactory,
    @Inject(SdkBootstrap) private readonly bootstrap: SdkBootstrap,
    @Inject(AgentCallStore) private readonly store: AgentCallStore,
    @Inject(AgentCallRepository) private readonly calls: AgentCallRepository,
    @Inject(EventBus) private readonly events: EventBus,
  ) {}

  // The AgentInvokerFactory port: the executor asks for an invoker bound to one scope and takes
  // the default options.
  forScope(scope: InvokerScope): SdkAgentInvoker {
    return this.create(scope, { lifecycleEvents: false });
  }

  create(scope: CallScope, options: InvokerOptions = {}): SdkAgentInvoker {
    return new SdkAgentInvoker(
      this.agents,
      this.bootstrap,
      this.store,
      this.calls,
      this.events,
      scope,
      options,
    );
  }
}
