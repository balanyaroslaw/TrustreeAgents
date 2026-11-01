import { Module } from '@nestjs/common';
import { TestFileDiffCollector } from '../agents/qa/test-file-diff.collector';
import { WorkspaceSurveyor } from '../execution/workspace.surveyor';
import { SdkModule } from '../sdk/sdk.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { AgentCommand } from './agent.command';
import { AgentInputBuilder } from './agent-input.builder';
import { AgentReportPrinter } from './agent-report.printer';
import { AgentsCommand } from './agents.command';
import { ToolsCommand } from './tools.command';
import { PricesCommand } from './prices.command';
import { RunsPruneCommand } from './runs-prune.command';
import { HistoryCommand } from './history.command';
import { RunCommand } from './run.command';
import { UsageCommand } from './usage.command';

@Module({
  imports: [WorkspaceModule, SdkModule],
  providers: [
    WorkspaceSurveyor,
    TestFileDiffCollector,
    AgentInputBuilder,
    AgentReportPrinter,
    RunCommand,
    AgentCommand,
    ToolsCommand,
    AgentsCommand,
    UsageCommand,
    HistoryCommand,
    PricesCommand,
    RunsPruneCommand,
  ],
})
export class CliModule {}
