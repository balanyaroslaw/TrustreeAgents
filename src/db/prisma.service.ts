import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// The generated Prisma client as a Nest provider. Only the repositories in src/db/repositories
// inject it; everything else goes through them.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    // A command that does not need the database must still start, so an unreachable database is
    // not an error here: DatabaseBootstrap reports it with the message that says what to do.
    try {
      await this.$connect();
    } catch {
      return;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
