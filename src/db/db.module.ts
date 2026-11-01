import { Global, Module } from '@nestjs/common';
import { DatabaseBootstrap } from './database.bootstrap';
import { MigrationRunner } from './migration.runner';
import { ModelPriceSeeder } from './prices/model-price.seeder';
import { PrismaService } from './prisma.service';
import { AgentCallRepository } from './repositories/agent-call.repository';
import { AttemptRepository } from './repositories/attempt.repository';
import { ModelPriceRepository } from './repositories/model-price.repository';
import { PlanRepository } from './repositories/plan.repository';
import { ProjectRepository } from './repositories/project.repository';
import { RunRepository } from './repositories/run.repository';

// PrismaService is provided here and exported nowhere: only the repositories of this module
// touch it.
@Global()
@Module({
  providers: [
    PrismaService,
    MigrationRunner,
    ProjectRepository,
    RunRepository,
    PlanRepository,
    AttemptRepository,
    AgentCallRepository,
    ModelPriceRepository,
    ModelPriceSeeder,
    DatabaseBootstrap,
  ],
  exports: [
    ProjectRepository,
    RunRepository,
    PlanRepository,
    AttemptRepository,
    AgentCallRepository,
    ModelPriceRepository,
    DatabaseBootstrap,
  ],
})
export class DbModule {}
