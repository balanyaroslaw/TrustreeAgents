import { Module } from '@nestjs/common';
import { AgentsCommand } from './agents.command';
import { HistoryCommand } from './history.command';
import { RunCommand } from './run.command';
import { UsageCommand } from './usage.command';

@Module({
  providers: [RunCommand, AgentsCommand, UsageCommand, HistoryCommand],
})
export class CliModule {}
