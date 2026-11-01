import { Inject, Injectable } from '@nestjs/common';
import { readdir } from 'node:fs/promises';
import { PathPolicy } from '../workspace/security/path.policy';
import { WorkspaceService } from '../workspace/workspace.service';
import { PROJECT_DOCUMENT_NAMES } from './execution.constants';
import type { WorkspaceSurvey } from './execution.types';

const EMPTY = 0;

// What the planner is told about the workspace: whether anything is there yet and which project
// documents it can read. Hidden entries and the directories the tools skip do not count.
@Injectable()
export class WorkspaceSurveyor {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async survey(): Promise<WorkspaceSurvey> {
    const entries = await readdir(this.workspace.root, { withFileTypes: true });
    const names = entries
      .map((entry) => entry.name)
      .filter((name) => !PathPolicy.isSkippedName(name) && !name.startsWith('.'));

    return {
      isExistingProject: names.length > EMPTY,
      documents: PROJECT_DOCUMENT_NAMES.filter((document) => names.includes(document)),
    };
  }
}
