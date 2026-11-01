import { Module } from '@nestjs/common';
import { TestFileDiffCollector } from '../agents/qa/test-file-diff.collector';
import { AttemptRepository } from '../db/repositories/attempt.repository';
import { PlanRepository } from '../db/repositories/plan.repository';
import { SdkModule } from '../sdk/sdk.module';
import { SdkInvokerFactory } from '../sdk/sdk-invoker.factory';
import { WorkspaceModule } from '../workspace/workspace.module';
import { CannedAgentInvoker } from './agents/canned-agent-invoker';
import { StepCheckpoint } from './checkpoint/step-checkpoint';
import {
  AGENT_INVOKER_FACTORY,
  ATTEMPT_REPOSITORY,
  PLAN_REPOSITORY,
  USER_PROMPTER,
} from './execution.constants';
import { ConsoleUserPrompter } from './interaction/console-user-prompter';
import { PlanExecutor } from './plan-executor';
import { StepRunner } from './step-runner';
import { WorkspaceSurveyor } from './workspace.surveyor';

// What a run needs, with the four ports of the executor bound to their implementations. The
// report builder, the commit message builder and the failure policy are static classes, and the
// budget and the signal listener are created per run, so none of them is a provider here.
//
// AGENT_INVOKER_FACTORY is bound to the SDK factory. `team run --dry-run` passes the canned
// invoker to PlanExecutor.execute itself, so the canned path is unreachable without the flag.
@Module({
  imports: [WorkspaceModule, SdkModule],
  providers: [
    PlanExecutor,
    StepRunner,
    StepCheckpoint,
    WorkspaceSurveyor,
    TestFileDiffCollector,
    CannedAgentInvoker,
    { provide: AGENT_INVOKER_FACTORY, useExisting: SdkInvokerFactory },
    { provide: PLAN_REPOSITORY, useExisting: PlanRepository },
    { provide: ATTEMPT_REPOSITORY, useExisting: AttemptRepository },
    // Available only on a TTY: a piped or detached run has nobody to answer, and must not block.
    { provide: USER_PROMPTER, useFactory: () => ConsoleUserPrompter.forTty() },
  ],
  exports: [PlanExecutor, CannedAgentInvoker, WorkspaceSurveyor, TestFileDiffCollector],
})
export class ExecutionModule {}
