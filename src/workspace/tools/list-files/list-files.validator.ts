import { Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { CURRENT_DIRECTORY_SEGMENT, GIT_PROTECTED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { DEFAULT_LIST_DEPTH } from '../file-tool.constants';
import { listFilesSchema } from './list-files.schema';
import type { ValidatedListFilesRequest } from './list-files.types';

@Injectable()
export class ListFilesValidator {
  constructor(private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedListFilesRequest> {
    const parsed = listFilesSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const { path: inputPath = CURRENT_DIRECTORY_SEGMENT, depth = DEFAULT_LIST_DEPTH } = parsed.data;

    const absolutePath = await this.workspace
      .resolveSafe(inputPath)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    if (PathPolicy.isGitPath(relativePath)) {
      throw new ToolValidationError(GIT_PROTECTED_MESSAGE);
    }

    const stats = await stat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    if (stats === null) {
      throw new ToolValidationError(WorkspaceMessages.directoryNotFound(relativePath));
    }
    if (!stats.isDirectory()) {
      throw new ToolValidationError(WorkspaceMessages.isNotADirectory(relativePath));
    }

    return { absolutePath, relativePath, depth };
  }
}
