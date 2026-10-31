import { Injectable } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { GitError } from '../errors/git.error';
import { WorkspaceService } from '../workspace.service';
import { SKIPPED_NAMES } from '../workspace.constants';
import {
  CHANGED_FILE_STATUS_BY_CODE,
  COPY_STATUS_CODE,
  DEV_NULL_PATH,
  GIT_ANY_DIRECTORY_GLOB,
  GIT_EXCLUDE_GLOB_PATHSPEC_PREFIX,
  GIT_GLOB_PATHSPEC_PREFIX,
  GIT_BASE_ARGS,
  GIT_BINARY,
  GIT_EXCLUDE_PATHSPEC_PREFIX,
  GIT_MAX_BUFFER_BYTES,
  GIT_NUL_SEPARATOR,
  GIT_PATH_TERMINATOR,
  GIT_REF_PATTERN,
  GIT_TIMEOUT_MS,
  MAX_GIT_REF_LENGTH,
  NUMSTAT_BINARY_MARKER,
  NUMSTAT_FIELD_SEPARATOR,
  RENAME_STATUS_CODE,
} from './git.constants';
import { SEARCH_TIMEOUT_MS } from '../tools/file-tool.constants';
import { ChangedFileStatus } from './changed-file-status.enum';
import type { ChangedFile, LineCounts } from './changed-file.types';
import type { GitCommandResult, GitGrepRequest, GitStatusEntry } from './git.types';

const SUCCESS_EXIT_CODE = 0;
const DIFFERENCES_EXIT_CODE = 1;
const NO_MATCH_EXIT_CODE = 1;
const FATAL_EXIT_CODE = 128;
const INSIDE_WORK_TREE_OUTPUT = 'true';
const STATUS_INDEX_INDEX = 0;
const STATUS_WORKTREE_INDEX = 1;
const STATUS_PATH_OFFSET = 3;
const SUBCOMMAND_INDEX = 0;
const NUMSTAT_ADDED_INDEX = 0;
const NUMSTAT_REMOVED_INDEX = 1;
const NUMSTAT_PATH_INDEX = 2;
const NUMSTAT_FIELD_COUNT = 3;
const NO_LINES = 0;
const RENAME_SOURCE_FIELDS = 1;
const STATUS_CODE_INDEX = 0;

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

  async grep(request: GitGrepRequest): Promise<string> {
    const { pattern, literal, caseSensitive, contextLines } = request;

    const args = ['grep', '--no-color', '-n', '-I', '--untracked', '--null'];
    if (!caseSensitive) {
      args.push('-i');
    }
    args.push(literal ? '-F' : '-E');
    if (contextLines > 0) {
      args.push('-C', String(contextLines));
    }
    args.push('-e', pattern, GIT_PATH_TERMINATOR, ...GitService.grepPathspecs(request));

    const result = await this.run(args, [NO_MATCH_EXIT_CODE], SEARCH_TIMEOUT_MS);
    return result.stdout;
  }

  async changedFiles(baseRef: string): Promise<ChangedFile[]> {
    GitService.assertRef(baseRef);

    const counts = await this.diffNumstat(baseRef);
    const tracked = (await this.diffNameStatus(baseRef)).map((entry) => ({
      ...entry,
      ...(counts.get(entry.path) ?? { added: NO_LINES, removed: NO_LINES }),
    }));
    const untracked = await this.untrackedChangedFiles();

    return [...tracked, ...untracked].sort((left, right) => left.path.localeCompare(right.path));
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
    timeoutMs: number = GIT_TIMEOUT_MS,
  ): Promise<GitCommandResult> {
    const result = await this.execute(args, timeoutMs);
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

  private execute(args: readonly string[], timeoutMs: number): Promise<GitCommandResult> {
    return new Promise((resolve) => {
      execFile(
        GIT_BINARY,
        [...GIT_BASE_ARGS, ...args],
        {
          cwd: this.workspace.root,
          timeout: timeoutMs,
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

  private async diffNameStatus(
    baseRef: string,
  ): Promise<{ path: string; status: ChangedFileStatus }[]> {
    const result = await this.run([
      'diff',
      '--name-status',
      '--no-color',
      '--no-ext-diff',
      '-M',
      '-z',
      baseRef,
      GIT_PATH_TERMINATOR,
    ]);
    const fields = GitService.splitNulList(result.stdout);
    const entries: { path: string; status: ChangedFileStatus }[] = [];

    for (let index = 0; index + RENAME_SOURCE_FIELDS < fields.length; index += 1) {
      const code = fields[index][STATUS_CODE_INDEX];
      const status = CHANGED_FILE_STATUS_BY_CODE[code] ?? ChangedFileStatus.Modified;
      index += 1;
      if (status === ChangedFileStatus.Renamed && index + RENAME_SOURCE_FIELDS < fields.length) {
        index += 1;
      }
      entries.push({ path: fields[index], status });
    }

    return entries;
  }

  private async diffNumstat(baseRef: string): Promise<Map<string, LineCounts>> {
    const result = await this.run([
      'diff',
      '--numstat',
      '--no-color',
      '--no-ext-diff',
      '-M',
      '-z',
      baseRef,
      GIT_PATH_TERMINATOR,
    ]);
    return GitService.parseNumstat(result.stdout);
  }

  private async untrackedChangedFiles(): Promise<ChangedFile[]> {
    const files: ChangedFile[] = [];

    for (const path of await this.untrackedFiles()) {
      const counts = await this.newFileCounts(path);
      if (counts === null) {
        continue;
      }
      files.push({
        path,
        status: ChangedFileStatus.Added,
        added: counts.added,
        removed: counts.removed,
      });
    }

    return files;
  }

  private async newFileCounts(relativePath: string): Promise<LineCounts | null> {
    const result = await this.run(
      [
        'diff',
        '--numstat',
        '--no-color',
        '--no-ext-diff',
        '--no-index',
        '-z',
        GIT_PATH_TERMINATOR,
        DEV_NULL_PATH,
        relativePath,
      ],
      [DIFFERENCES_EXIT_CODE],
    );
    return GitService.parseNumstat(result.stdout).get(relativePath) ?? null;
  }

  private static parseNumstat(stdout: string): Map<string, LineCounts> {
    const counts = new Map<string, LineCounts>();
    const fields = GitService.splitNulList(stdout);

    for (let index = 0; index < fields.length; index += 1) {
      const parts = fields[index].split(NUMSTAT_FIELD_SEPARATOR);
      if (parts.length < NUMSTAT_FIELD_COUNT) {
        continue;
      }
      let path = parts[NUMSTAT_PATH_INDEX];
      if (path === '' && index + RENAME_SOURCE_FIELDS < fields.length) {
        index += RENAME_SOURCE_FIELDS + RENAME_SOURCE_FIELDS;
        path = index < fields.length ? fields[index] : '';
      }
      if (path === '') {
        continue;
      }
      const added = GitService.lineCount(parts[NUMSTAT_ADDED_INDEX]);
      const removed = GitService.lineCount(parts[NUMSTAT_REMOVED_INDEX]);
      if (added === null || removed === null) {
        continue;
      }
      counts.set(path, { added, removed });
    }

    return counts;
  }

  private static lineCount(field: string): number | null {
    if (field === NUMSTAT_BINARY_MARKER) {
      return null;
    }
    const value = Number.parseInt(field, 10);
    return Number.isNaN(value) ? NO_LINES : value;
  }

  private static assertRef(ref: string): void {
    if (ref.length > MAX_GIT_REF_LENGTH || !GIT_REF_PATTERN.test(ref)) {
      throw GitError.invalidRef(ref);
    }
  }

  private static childEnvironment(): NodeJS.ProcessEnv {
    return {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? '',
      LC_ALL: 'C',
      GIT_TERMINAL_PROMPT: '0',
    };
  }

  private static grepPathspecs(request: GitGrepRequest): string[] {
    const { relativePath, glob } = request;
    const specs: string[] = [];

    if (glob !== undefined) {
      const prefix = relativePath === undefined ? '' : `${relativePath}/`;
      specs.push(`${GIT_GLOB_PATHSPEC_PREFIX}${prefix}${GIT_ANY_DIRECTORY_GLOB}/${glob}`);
    } else if (relativePath !== undefined) {
      specs.push(relativePath);
    }

    for (const name of SKIPPED_NAMES) {
      specs.push(
        `${GIT_EXCLUDE_GLOB_PATHSPEC_PREFIX}${GIT_ANY_DIRECTORY_GLOB}/${name}/` +
          GIT_ANY_DIRECTORY_GLOB,
      );
    }

    return specs;
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
