import { FileToolName } from '../enums/file-tool-name.enum';
import { SKIPPED_NAMES } from '../workspace.constants';
import type { ToolDefinition } from './file-tool.types';

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

export const FILE_MODE_MASK = 0o7777;

const BYTES_PER_KILOBYTE = 1024;

export const FILE_TOOL_DEFINITIONS: Readonly<Record<FileToolName, ToolDefinition>> = {
  [FileToolName.ReadFile]: {
    name: FileToolName.ReadFile,
    summary: 'Read a text file from the workspace, returned with line numbers.',
    prerequisites: ['if you do not know the path, call list_files first'],
    whenToUse: ['you need to see the contents of a file', 'before changing any existing file'],
    whenNotToUse: [],
    limits: [`at most ${MAX_READ_LINES} lines per call, use startLine/endLine to continue`],
    refusals: ['binary files', '.env files', 'directories'],
    notes: [],
    requiresApproval: false,
    mutatesWorkspace: false,
    parameters: {
      path: { description: 'Path relative to the workspace root.', example: '"src/app.ts"' },
      startLine: {
        description: 'First line to read (1-based).',
        defaultValue: 'the first line',
      },
      endLine: {
        description: 'Last line to read (inclusive).',
        defaultValue: 'the per-call limit',
      },
    },
  },

  [FileToolName.ListFiles]: {
    name: FileToolName.ListFiles,
    summary: 'List files and directories of the workspace as a tree.',
    prerequisites: [],
    whenToUse: [
      'you start working on a task and need the project structure',
      'you need to find a file before reading it',
    ],
    whenNotToUse: [],
    limits: [
      `at most ${MAX_LIST_ENTRIES} entries per call`,
      'for big projects pass a subdirectory path or a smaller depth',
    ],
    refusals: [`skips ${SKIPPED_NAMES.join(', ')}`],
    notes: [],
    requiresApproval: false,
    mutatesWorkspace: false,
    parameters: {
      path: {
        description: 'Directory relative to the workspace root.',
        example: '"src"',
        defaultValue: 'the workspace root',
      },
      depth: {
        description:
          `How many levels to show, from ${MIN_LIST_DEPTH} to ${MAX_LIST_DEPTH}. ` +
          'Use a larger depth only for a small subdirectory.',
        defaultValue: String(DEFAULT_LIST_DEPTH),
      },
    },
  },

  [FileToolName.WriteFile]: {
    name: FileToolName.WriteFile,
    summary:
      'Create a NEW text file in the workspace; missing parent directories are created ' +
      'automatically.',
    prerequisites: [],
    whenToUse: ['you need a file that does not exist yet'],
    whenNotToUse: [{ situation: 'the file already exists', useInstead: FileToolName.EditFile }],
    limits: [`content up to ${MAX_WRITE_CONTENT_BYTES / BYTES_PER_KILOBYTE} KB per call`],
    refusals: ['.git', '.env', 'node_modules', 'directories'],
    notes: ['Pass the complete contents: the whole file is replaced.', 'Does not commit to git.'],
    requiresApproval: false,
    mutatesWorkspace: true,
    parameters: {
      path: {
        description: 'Path of the new file, relative to the workspace root.',
        example: '"src/payments/refund.service.ts"',
      },
      content: {
        description: 'The complete contents of the file. The file is replaced, not appended to.',
      },
    },
  },

  [FileToolName.EditFile]: {
    name: FileToolName.EditFile,
    summary: 'Replace an exact fragment in an existing file.',
    prerequisites: ['read the file first so oldString matches exactly, including whitespace'],
    whenToUse: ['ANY change to an existing file'],
    whenNotToUse: [
      { situation: 'the file does not exist yet', useInstead: FileToolName.WriteFile },
    ],
    limits: [
      'oldString must appear exactly once unless replaceAll is true; otherwise add more ' +
        'surrounding context',
    ],
    refusals: ['.git', '.env', 'binary files', 'directories'],
    notes: ['Do NOT rewrite a whole existing file with write_file.'],
    requiresApproval: false,
    mutatesWorkspace: true,
    parameters: {
      path: { description: 'Path of the existing file, relative to the workspace root.' },
      oldString: {
        description:
          'The exact text to replace. Copy it from read_file output, without the line numbers.',
      },
      newString: {
        description: 'The replacement text. Use an empty string to delete the fragment.',
      },
      replaceAll: {
        description: 'Replace every occurrence of oldString.',
        defaultValue: 'false',
      },
    },
  },

  [FileToolName.DeleteFile]: {
    name: FileToolName.DeleteFile,
    summary: 'Delete a single file that is no longer needed.',
    prerequisites: ['make sure nothing else in the project still imports or uses the file'],
    whenToUse: ['a file became obsolete because of your change'],
    whenNotToUse: [
      { situation: 'you only want to change the file contents', useInstead: FileToolName.EditFile },
    ],
    limits: [],
    refusals: ['directories', 'protected project files', '.env', 'anything inside .git'],
    notes: [
      'Requires human approval.',
      'The result tells whether the file was tracked by git (recoverable) or not.',
    ],
    requiresApproval: true,
    mutatesWorkspace: true,
    parameters: {
      path: { description: 'Path of the file to delete, relative to the workspace root.' },
    },
  },

  [FileToolName.GitStatus]: {
    name: FileToolName.GitStatus,
    summary:
      'Show the current git branch and which files are modified, added, deleted, renamed or ' +
      'untracked.',
    prerequisites: [],
    whenToUse: ['you want to see what has changed so far in this run'],
    whenNotToUse: [
      { situation: 'you need the content of the changes', useInstead: FileToolName.GitDiff },
    ],
    limits: ['read-only'],
    refusals: [],
    notes: [],
    requiresApproval: false,
    mutatesWorkspace: false,
    parameters: {},
  },

  [FileToolName.GitDiff]: {
    name: FileToolName.GitDiff,
    summary: 'Show the changes made in this run compared to its start.',
    prerequisites: [
      'start with mode "stat" for an overview, then request mode "full" for specific paths',
    ],
    whenToUse: ['you need to review or verify what was actually changed'],
    whenNotToUse: [
      { situation: 'you only need the list of changed files', useInstead: FileToolName.GitStatus },
    ],
    limits: ['read-only', 'large output is truncated: narrow it with path'],
    refusals: [],
    notes: [],
    requiresApproval: false,
    mutatesWorkspace: false,
    parameters: {
      path: {
        description: 'Limit the diff to this file or directory, relative to the workspace root.',
        defaultValue: 'all changes',
      },
      mode: {
        description: '"stat" lists changed files with line counts, "full" shows the complete diff.',
        defaultValue: '"stat"',
      },
      base: { description: 'Git ref to compare against.', defaultValue: 'the start of this run' },
    },
  },
};
