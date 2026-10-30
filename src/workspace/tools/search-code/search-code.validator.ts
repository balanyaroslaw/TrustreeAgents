import { Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { CURRENT_DIRECTORY_SEGMENT, GIT_PROTECTED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { MAX_GLOB_LENGTH } from '../file-tool.constants';
import { searchCodeSchema } from './search-code.schema';
import type { ValidatedSearchRequest } from './search-code.types';

const GLOB_PATTERN = /^[A-Za-z0-9_./*?{}[\],-]+$/;
const PARENT_SEGMENT = '..';
const ABSOLUTE_PREFIX = '/';

@Injectable()
export class SearchCodeValidator {
  constructor(private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedSearchRequest> {
    const parsed = searchCodeSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const {
      pattern,
      path: inputPath,
      glob,
      literal = false,
      caseSensitive = false,
      contextLines = 0,
    } = parsed.data;

    const relativePath = inputPath === undefined ? undefined : await this.relativePathOf(inputPath);
    if (glob !== undefined) {
      SearchCodeValidator.assertValidGlob(glob);
    }

    return { pattern, relativePath, glob, literal, caseSensitive, contextLines };
  }

  private async relativePathOf(inputPath: string): Promise<string | undefined> {
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
      throw new ToolValidationError(WorkspaceMessages.pathNotFound(relativePath));
    }

    return relativePath === CURRENT_DIRECTORY_SEGMENT ? undefined : relativePath;
  }

  private static assertValidGlob(glob: string): void {
    if (
      glob.length > MAX_GLOB_LENGTH ||
      !GLOB_PATTERN.test(glob) ||
      glob.includes(PARENT_SEGMENT) ||
      glob.startsWith(ABSOLUTE_PREFIX)
    ) {
      throw new ToolValidationError(WorkspaceMessages.invalidGlob());
    }
  }
}
