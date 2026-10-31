import { ChangedFileStatus } from './changed-file-status.enum';
import { GitChangeKind } from './git-change-kind.enum';

export const GIT_BINARY = 'git';

export const GIT_BASE_ARGS: readonly string[] = [
  '-c',
  'core.quotepath=false',
  '-c',
  'core.pager=cat',
];

export const GIT_TIMEOUT_MS = 30_000;
export const GIT_MAX_BUFFER_BYTES = 10 * 1024 * 1024;

export const GIT_PATH_TERMINATOR = '--';
export const GIT_NUL_SEPARATOR = '\0';
export const GIT_EXCLUDE_PATHSPEC_PREFIX = ':(exclude)';
export const GIT_EXCLUDE_GLOB_PATHSPEC_PREFIX = ':(exclude,glob)';
export const GIT_GLOB_PATHSPEC_PREFIX = ':(glob)';
export const GIT_ANY_DIRECTORY_GLOB = '**';
export const DEV_NULL_PATH = '/dev/null';

export const GIT_DEFAULT_BASE_REF = 'HEAD';
export const GIT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/~^@{}-]*$/;
export const MAX_GIT_REF_LENGTH = 100;

export const GIT_DIFF_EXCLUDED_PATHS: readonly string[] = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '*.min.js',
  'dist/**',
];

export const GIT_STATUS_GROUP_ORDER: readonly GitChangeKind[] = [
  GitChangeKind.Modified,
  GitChangeKind.Added,
  GitChangeKind.Deleted,
  GitChangeKind.Renamed,
  GitChangeKind.Untracked,
];

export const CHANGED_FILE_STATUS_BY_CODE: Readonly<Record<string, ChangedFileStatus>> = {
  A: ChangedFileStatus.Added,
  C: ChangedFileStatus.Added,
  M: ChangedFileStatus.Modified,
  T: ChangedFileStatus.Modified,
  D: ChangedFileStatus.Deleted,
  R: ChangedFileStatus.Renamed,
};

export const NUMSTAT_FIELD_SEPARATOR = '\t';
export const NUMSTAT_BINARY_MARKER = '-';

export const MAX_STATUS_ENTRIES = 200;
export const MAX_DIFF_CHARACTERS = 30_000;

export const DIFF_FILE_HEADER_PREFIX = 'diff --git ';
export const UNTRACKED_STATUS_CODE = '?';
export const RENAME_STATUS_CODE = 'R';
export const COPY_STATUS_CODE = 'C';
export const ADDED_STATUS_CODE = 'A';
export const DELETED_STATUS_CODE = 'D';

export const DETACHED_HEAD_LABEL = 'detached HEAD';

export const NOT_A_GIT_REPOSITORY_MESSAGE =
  'workspace is not a git repository. Use list_files and read_file to inspect the workspace';
export const GIT_UNAVAILABLE_MESSAGE =
  'git could not be run in the workspace. Check that git is installed';
export const NOT_A_REPOSITORY_STDERR_MARKER = 'not a git repository';
export const INVALID_PATTERN_STDERR_MARKERS: readonly string[] = [
  'invalid regular expression',
  'unmatched',
  'trailing backslash',
  'brackets',
  'repetition-operator',
];
export const INVALID_PATTERN_MESSAGE =
  'invalid regular expression. Fix the pattern or set literal to true';
export const INVALID_GIT_REF_MESSAGE =
  'invalid git ref. Pass a branch name, a tag or a commit that exists';
export const GIT_TIMEOUT_MESSAGE =
  'git took too long or produced too much output and was stopped. Request a specific path';
