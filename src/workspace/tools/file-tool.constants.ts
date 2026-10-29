import { SKIPPED_NAMES } from '../workspace.constants';

export const ERROR_PREFIX = 'Error: ';

export const FIRST_LINE = 1;
export const MAX_READ_LINES = 400;
export const MAX_READ_CHARACTERS = 40_000;
export const MAX_READ_FILE_BYTES = 1024 * 1024;

export const MAX_WRITE_CONTENT_BYTES = 200 * 1024;
export const WRITE_FILE_MODE = 0o644;
export const TEMPORARY_SUFFIX_BYTES = 6;

export const MAX_LIST_ENTRIES = 200;
export const MAX_SCANNED_ENTRIES = 5_000;
export const DEFAULT_LIST_DEPTH = 2;
export const MIN_LIST_DEPTH = 1;
export const MAX_LIST_DEPTH = 4;
export const TREE_INDENT = '  ';
export const DIRECTORY_SUFFIX = '/';
export const SYMLINK_SUFFIX = '@';

export const READ_FILE_DESCRIPTION =
  'Read a text file from the workspace with line numbers. Use startLine/endLine for large files. ' +
  `At most ${MAX_READ_LINES} lines are returned per call.`;

export const WRITE_FILE_DESCRIPTION =
  'Write a text file in the workspace, creating parent directories as needed. Replaces the whole ' +
  'file, so pass the complete contents. Does not commit anything to git.';

export const LIST_FILES_DESCRIPTION =
  'List the files and directories of the workspace as a tree, to explore the project structure. ' +
  `Skips ${SKIPPED_NAMES.join(', ')}. Shows at most ${MAX_LIST_ENTRIES} entries per call.`;

export const FILE_MODE_MASK = 0o7777;
