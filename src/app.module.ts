import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { DbModule } from './db/db.module';
import { EventsModule } from './events/events.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [DbModule, EventsModule, CliModule, WorkspaceModule],
})
export class AppModule {}
