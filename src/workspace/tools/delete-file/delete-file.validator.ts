import { Inject, Injectable } from '@nestjs/common';
import { lstat } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { GitService } from '../../git/git.service';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { deleteFileSchema } from './delete-file.schema';
import { PROTECTED_ROOT_FILES } from './delete-file.constants';
import type { ValidatedDeleteRequest } from './delete-file.types';

const ROOT_LEVEL_SEGMENTS = 1;
const FIRST_SEGMENT_INDEX = 0;

@Injectable()
export class DeleteFileValidator {
  private static readonly protectedNames = new Set(PROTECTED_ROOT_FILES);

  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(GitService) private readonly git: GitService,
  ) {}

  async validate(input: unknown): Promise<ValidatedDeleteRequest> {
    const parsed = deleteFileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }

    const absolutePath = await this.workspace
      .resolveSafe(parsed.data.path)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    const denied = PathPolicy.denyWriteReason(relativePath);
    if (denied !== null) {
      throw new ToolValidationError(denied);
    }

    const stats = await lstat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    if (stats === null) {
      throw new ToolValidationError(WorkspaceMessages.fileNotFound(relativePath));
    }
    const targetDenied = PathPolicy.denyDeleteTargetReason(relativePath, {
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      isFile: stats.isFile(),
    });
    if (targetDenied !== null) {
      throw new ToolValidationError(targetDenied);
    }

    if (DeleteFileValidator.isProtected(relativePath)) {
      throw new ToolValidationError(WorkspaceMessages.protectedFile(relativePath));
    }

    return { absolutePath, relativePath, tracked: await this.trackedState(relativePath) };
  }

  private async trackedState(relativePath: string): Promise<boolean | null> {
    if (!(await this.git.isRepository())) {
      return null;
    }
    return this.git.isTracked(relativePath);
  }

  private static isProtected(relativePath: string): boolean {
    const segments = PathPolicy.segments(relativePath);
    if (segments.length !== ROOT_LEVEL_SEGMENTS) {
      return false;
    }
    return DeleteFileValidator.protectedNames.has(segments[FIRST_SEGMENT_INDEX]);
  }
}
