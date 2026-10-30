import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { GitError } from '../errors/git.error';
import { WorkspaceService } from '../workspace.service';
import {
  COPY_STATUS_CODE,
  DEV_NULL_PATH,
  GIT_BASE_ARGS,
  GIT_BINARY,
  GIT_EXCLUDE_PATHSPEC_PREFIX,
  GIT_MAX_BUFFER_BYTES,
  GIT_NUL_SEPARATOR,
  GIT_PATH_TERMINATOR,
  GIT_TIMEOUT_MS,
  RENAME_STATUS_CODE,
} from './git.constants';
import type { GitCommandResult, GitStatusEntry } from './git.types';

const SUCCESS_EXIT_CODE = 0;
const DIFFERENCES_EXIT_CODE = 1;
const FATAL_EXIT_CODE = 128;
const INSIDE_WORK_TREE_OUTPUT = 'true';
const STATUS_INDEX_INDEX = 0;
const STATUS_WORKTREE_INDEX = 1;
const STATUS_PATH_OFFSET = 3;
const SUBCOMMAND_INDEX = 0;

@Injectable()
export class GitService {
  constructor(private readonly workspace: WorkspaceService) {}

  async isRepository(): Promise<boolean> {
    const result = await this.run(['rev-parse', '--is-inside-work-tree'], [FATAL_EXIT_CODE]);
    return (
      result.exitCode === SUCCESS_EXIT_CODE && result.stdout.trim() === INSIDE_WORK_TREE_OUTPUT
    );
  }

  async currentBranch(): Promise<string | null> {
    const result = await this.run(
      ['symbolic-ref', '--quiet', '--short', 'HEAD'],
      [DIFFERENCES_EXIT_CODE],
    );
    const branch = result.stdout.trim();
    return branch === '' ? null : branch;
  }

  async statusEntries(): Promise<GitStatusEntry[]> {
    const result = await this.run([
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
      '--renames',
    ]);
    return GitService.parseStatus(result.stdout);
  }

  async diffStat(baseRef: string, relativePath?: string): Promise<string> {
    const result = await this.run([
      'diff',
      '--stat',
      '--no-color',
      '--no-ext-diff',
      baseRef,
      GIT_PATH_TERMINATOR,
      ...GitService.pathspecs(relativePath),
    ]);
    return result.stdout;
  }

  async diffFull(
    baseRef: string,
    relativePath?: string,
    excludes: readonly string[] = [],
  ): Promise<string> {
    const result = await this.run([
      'diff',
      '--patch',
      '--no-color',
      '--no-ext-diff',
      baseRef,
      GIT_PATH_TERMINATOR,
      ...GitService.pathspecs(relativePath, excludes),
    ]);
    return result.stdout;
  }

  async diffNames(
    baseRef: string,
    relativePath?: string,
    excludes: readonly string[] = [],
  ): Promise<string[]> {
    const result = await this.run([
      'diff',
      '--name-only',
      '--no-color',
      '--no-ext-diff',
      '-z',
      baseRef,
      GIT_PATH_TERMINATOR,
      ...GitService.pathspecs(relativePath, excludes),
    ]);
    return GitService.splitNulList(result.stdout);
  }

  async newFileDiff(relativePath: string): Promise<string> {
    const result = await this.run(
      [
        'diff',
        '--patch',
        '--no-color',
        '--no-ext-diff',
        '--no-index',
        GIT_PATH_TERMINATOR,
        DEV_NULL_PATH,
        relativePath,
      ],
      [DIFFERENCES_EXIT_CODE],
    );
    return result.stdout;
  }

  async untrackedFiles(relativePath?: string, excludes: readonly string[] = []): Promise<string[]> {
    const result = await this.run([
      'ls-files',
      '--others',
      '--exclude-standard',
      '-z',
      GIT_PATH_TERMINATOR,
      ...GitService.pathspecs(relativePath, excludes),
    ]);
    return GitService.splitNulList(result.stdout);
  }

  async isTracked(relativePath: string): Promise<boolean> {
    const result = await this.run(
      ['ls-files', '--error-unmatch', GIT_PATH_TERMINATOR, relativePath],
      [DIFFERENCES_EXIT_CODE],
    );
    return result.exitCode === SUCCESS_EXIT_CODE;
  }

  async resolveCommit(ref: string): Promise<string | null> {
    const result = await this.run(
      ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
      [DIFFERENCES_EXIT_CODE],
    );
    const commit = result.stdout.trim();
    return commit === '' ? null : commit;
  }

  private async run(
    args: readonly string[],
    allowedExitCodes: readonly number[] = [],
  ): Promise<GitCommandResult> {
    const result = await this.execute(args);
    if (
      result.exitCode === SUCCESS_EXIT_CODE ||
      (result.exitCode !== null && allowedExitCodes.includes(result.exitCode))
    ) {
      return result;
    }
    if (result.exitCode === null) {
      throw result.killed ? GitError.timedOut() : GitError.unavailable();
    }
    throw GitError.fromStderr(args[SUBCOMMAND_INDEX], result.stderr);
  }

  private execute(args: readonly string[]): Promise<GitCommandResult> {
    return new Promise((resolve) => {
      execFile(
        GIT_BINARY,
        [...GIT_BASE_ARGS, ...args],
        {
          cwd: this.workspace.root,
          timeout: GIT_TIMEOUT_MS,
          maxBuffer: GIT_MAX_BUFFER_BYTES,
          encoding: 'utf8',
          env: GitService.childEnvironment(),
        },
        (error, stdout, stderr) => {
          if (error === null) {
            resolve({ exitCode: SUCCESS_EXIT_CODE, stdout, stderr, killed: false });
            return;
          }
          resolve({
            exitCode: typeof error.code === 'number' ? error.code : null,
            stdout,
            stderr,
            killed: error.killed === true,
          });
        },
      );
    });
  }

  private static childEnvironment(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      LC_ALL: 'C',
      GIT_TERMINAL_PROMPT: '0',
    };
  }

  private static pathspecs(relativePath?: string, excludes: readonly string[] = []): string[] {
    const specs: string[] = [];
    if (relativePath !== undefined && relativePath !== '') {
      specs.push(relativePath);
    }
    for (const exclude of excludes) {
      specs.push(`${GIT_EXCLUDE_PATHSPEC_PREFIX}${exclude}`);
    }
    return specs;
  }

  private static splitNulList(stdout: string): string[] {
    return stdout.split(GIT_NUL_SEPARATOR).filter((entry) => entry !== '');
  }

  private static parseStatus(stdout: string): GitStatusEntry[] {
    const fields = GitService.splitNulList(stdout);
    const entries: GitStatusEntry[] = [];

    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      if (field.length <= STATUS_PATH_OFFSET) {
        continue;
      }
      const indexStatus = field[STATUS_INDEX_INDEX];
      const worktreeStatus = field[STATUS_WORKTREE_INDEX];
      let originalPath: string | null = null;
      if (GitService.carriesOriginalPath(indexStatus, worktreeStatus)) {
        index += 1;
        originalPath = index < fields.length ? fields[index] : null;
      }
      entries.push({
        indexStatus,
        worktreeStatus,
        path: field.slice(STATUS_PATH_OFFSET),
        originalPath,
      });
    }

    return entries;
  }

  private static carriesOriginalPath(indexStatus: string, worktreeStatus: string): boolean {
    return [indexStatus, worktreeStatus].some(
      (code) => code === RENAME_STATUS_CODE || code === COPY_STATUS_CODE,
    );
  }
}
