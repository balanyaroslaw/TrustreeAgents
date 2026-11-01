import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ProjectRecord } from './project.repository.types';

@Injectable()
export class ProjectRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // One row per resolved workspace path, so runs of the same project stay together.
  async ensure(path: string, name: string): Promise<ProjectRecord> {
    const project = await this.prisma.project.upsert({
      where: { path },
      create: { path, name },
      update: { name },
      select: { id: true, path: true, name: true },
    });

    return project;
  }
}
