import { GitErrorReason } from '../enums/git-error-reason.enum';
import {
  GIT_TIMEOUT_MESSAGE,
  GIT_UNAVAILABLE_MESSAGE,
  NOT_A_GIT_REPOSITORY_MESSAGE,
  NOT_A_REPOSITORY_STDERR_MARKER,
} from '../git/git.constants';

const FIRST_LINE_INDEX = 0;

export class GitError extends Error {
  readonly reason: GitErrorReason;

  constructor(message: string, reason: GitErrorReason) {
    super(message);
    this.name = 'GitError';
    this.reason = reason;
  }

  static notARepository(): GitError {
    return new GitError(NOT_A_GIT_REPOSITORY_MESSAGE, GitErrorReason.NotARepository);
  }

  static unavailable(): GitError {
    return new GitError(GIT_UNAVAILABLE_MESSAGE, GitErrorReason.Unavailable);
  }

  static timedOut(): GitError {
    return new GitError(GIT_TIMEOUT_MESSAGE, GitErrorReason.CommandFailed);
  }

  static fromStderr(subcommand: string, stderr: string): GitError {
    if (stderr.toLowerCase().includes(NOT_A_REPOSITORY_STDERR_MARKER)) {
      return GitError.notARepository();
    }
    return new GitError(
      `git ${subcommand} failed: ${GitError.firstLine(stderr)}`,
      GitErrorReason.CommandFailed,
    );
  }

  private static firstLine(stderr: string): string {
    const trimmed = stderr.trim();
    if (trimmed === '') {
      return 'no output';
    }
    return trimmed.split('\n')[FIRST_LINE_INDEX].trim();
  }
}
