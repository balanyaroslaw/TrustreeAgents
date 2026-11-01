import { Module } from '@nestjs/common';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AgentFactory } from './agent.factory';
import { SdkBootstrap } from './sdk.bootstrap';
import { SdkInvokerFactory } from './sdk-invoker.factory';

// The only module that touches @openai/agents. Everything else talks to agents through the
// AgentInvoker port.
@Module({
  imports: [WorkspaceModule],
  providers: [AgentFactory, SdkBootstrap, SdkInvokerFactory],
  exports: [SdkInvokerFactory, SdkBootstrap],
})
export class SdkModule {}
