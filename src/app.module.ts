import { Module } from '@nestjs/common';
import { CliModule } from './cli/cli.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [CliModule, WorkspaceModule],
})
export class AppModule {}
