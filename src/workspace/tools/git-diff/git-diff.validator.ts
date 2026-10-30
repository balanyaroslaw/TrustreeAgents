import { Injectable } from '@nestjs/common';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { GIT_DEFAULT_BASE_REF, GIT_REF_PATTERN, MAX_GIT_REF_LENGTH } from '../../git/git.constants';
import { GitService } from '../../git/git.service';
import { PathPolicy } from '../../security/path.policy';
import { CURRENT_DIRECTORY_SEGMENT, GIT_PROTECTED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { GitDiffMode } from './git-diff-mode.enum';
import { gitDiffSchema } from './git-diff.schema';
import type { ValidatedDiffRequest } from './git-diff.types';

@Injectable()
export class GitDiffValidator {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly git: GitService,
  ) {}

  async validate(input: unknown): Promise<ValidatedDiffRequest> {
    const parsed = gitDiffSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const { path: inputPath, mode = GitDiffMode.Stat, base } = parsed.data;

    const relativePath = inputPath === undefined ? undefined : await this.relativePathOf(inputPath);
    const baseRef = base === undefined ? this.defaultBaseRef() : await this.verifiedBaseRef(base);

    return { mode, baseRef, relativePath };
  }

  private async relativePathOf(inputPath: string): Promise<string | undefined> {
    const absolutePath = await this.workspace
      .resolveSafe(inputPath)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    if (PathPolicy.isGitPath(relativePath)) {
      throw new ToolValidationError(GIT_PROTECTED_MESSAGE);
    }

    return relativePath === CURRENT_DIRECTORY_SEGMENT ? undefined : relativePath;
  }

  private defaultBaseRef(): string {
    return this.workspace.runBaseRef ?? GIT_DEFAULT_BASE_REF;
  }

  private async verifiedBaseRef(base: string): Promise<string> {
    if (base.length > MAX_GIT_REF_LENGTH || !GIT_REF_PATTERN.test(base)) {
      throw new ToolValidationError(WorkspaceMessages.unknownGitRef(base));
    }
    if ((await this.git.resolveCommit(base)) === null) {
      throw new ToolValidationError(WorkspaceMessages.unknownGitRef(base));
    }
    return base;
  }
}
