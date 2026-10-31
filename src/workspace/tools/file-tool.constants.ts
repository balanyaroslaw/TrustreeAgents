import { ALLOWED_EXECUTABLES } from '../commands/command-policy.constants';
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

export const MAX_SEARCH_MATCHES = 100;
export const MAX_SEARCH_MATCHES_PER_FILE = 20;
export const MAX_SEARCH_LINE_CHARS = 300;
export const SEARCH_TIMEOUT_MS = 15_000;
export const MAX_SEARCH_PATTERN_LENGTH = 200;
export const MIN_SEARCH_CONTEXT_LINES = 0;
export const MAX_SEARCH_CONTEXT_LINES = 3;
export const MAX_GLOB_LENGTH = 100;

export const MIN_COMMAND_TIMEOUT_SECONDS = 1;
export const DEFAULT_COMMAND_TIMEOUT_SECONDS = 120;
export const MAX_COMMAND_TIMEOUT_SECONDS = 600;
export const MAX_COMMAND_LENGTH = 500;
export const MAX_COLLECTED_OUTPUT_BYTES = 1024 * 1024;
export const MAX_OUTPUT_CHARS = 12_000;
export const OUTPUT_HEAD_CHARS = 2_000;
export const OUTPUT_TAIL_CHARS = 10_000;
export const KILL_GRACE_MS = 5_000;

export const FILE_MODE_MASK = 0o7777;

export const ROLE_SCOPED_WRITE_TOOLS: readonly FileToolName[] = [
  FileToolName.WriteFile,
  FileToolName.EditFile,
];

const BYTES_PER_KILOBYTE = 1024;

export const FILE_TOOL_DEFINITIONS: Readonly<Record<FileToolName, ToolDefinition>> = {
  [FileToolName.ReadFile]: {
    name: FileToolName.ReadFile,
    summary: 'Read a text file from the workspace, returned with line numbers.',
    prerequisites: ['if you do not know the path, call list_files first'],
    whenToUse: ['you need to see the contents of a file', 'before changing any existing file'],
    whenNotToUse: [
      {
        situation: 'you only need to find where something is defined',
        useInstead: FileToolName.SearchCode,
      },
    ],
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

  [FileToolName.SearchCode]: {
    name: FileToolName.SearchCode,
    summary:
      'Search file contents in the workspace for a pattern and return matching lines with file ' +
      'path and line number.',
    prerequisites: [],
    whenToUse: [
      'you need to find where a function, class, constant or string is defined or used',
      'you want to know which files are affected before changing something',
    ],
    whenNotToUse: [
      {
        situation: 'you already know the file and need its content',
        useInstead: FileToolName.ReadFile,
      },
      {
        situation: 'you need the project structure or file names',
        useInstead: FileToolName.ListFiles,
      },
    ],
    limits: [
      `at most ${MAX_SEARCH_MATCHES} matches (${MAX_SEARCH_MATCHES_PER_FILE} per file): narrow ` +
        'with path or glob if truncated',
      'pattern is an extended regular expression; set literal to true for plain text',
    ],
    refusals: ['binary files', '.env files', 'ignored files such as node_modules and build output'],
    notes: ['Case-insensitive by default.'],
    requiresApproval: false,
    mutatesWorkspace: false,
    parameters: {
      pattern: {
        description: 'Text or extended regular expression, matched against single lines.',
        example: '"idempotencyKey"',
      },
      path: {
        description: 'File or directory to search in, relative to the workspace root.',
        defaultValue: 'the whole workspace',
      },
      glob: {
        description: 'Only search files whose names match this pattern.',
        example: '"*.ts"',
        defaultValue: 'all text files',
      },
      literal: {
        description:
          'Treat pattern as plain text. Use it when the pattern contains characters like ' +
          '( ) [ ] . *',
        defaultValue: 'false',
      },
      caseSensitive: {
        description: 'Match upper and lower case exactly.',
        defaultValue: 'false',
      },
      contextLines: {
        description:
          `Lines to show around each match, from ${MIN_SEARCH_CONTEXT_LINES} to ` +
          `${MAX_SEARCH_CONTEXT_LINES}.`,
        defaultValue: String(MIN_SEARCH_CONTEXT_LINES),
      },
    },
  },

  [FileToolName.RunCommand]: {
    name: FileToolName.RunCommand,
    summary:
      'Run one project command (for example npm test, npm run build, tsc) in the workspace and ' +
      'return its exit code and output.',
    prerequisites: ['check package.json first to see which npm scripts exist'],
    whenToUse: ['running tests, build, lint or type checks', 'installing dependencies'],
    whenNotToUse: [
      { situation: 'you only need to read or search files', useInstead: FileToolName.ReadFile },
      { situation: 'you need git information', useInstead: FileToolName.GitStatus },
    ],
    limits: [
      'one command per call (no pipes, redirects, && or ;)',
      `killed after ${DEFAULT_COMMAND_TIMEOUT_SECONDS} s by default (max ` +
        `${MAX_COMMAND_TIMEOUT_SECONDS} s), so no servers or watch mode`,
      'long output keeps only the beginning and the end',
    ],
    refusals: [`git and anything outside the allowed list: ${ALLOWED_EXECUTABLES.join(', ')}`],
    notes: [
      'A non-zero exit code is a normal result: read the output and fix the cause.',
      'Installing new packages needs human approval.',
    ],
    requiresApproval: false,
    mutatesWorkspace: true,
    parameters: {
      command: {
        description:
          'The command line, written as in a terminal but a single command: no pipes, ' +
          'redirects, && or ;, no variable expansion.',
        example: '"npm run build"',
      },
      timeoutSeconds: {
        description:
          `Time limit in seconds, from ${MIN_COMMAND_TIMEOUT_SECONDS} to ` +
          `${MAX_COMMAND_TIMEOUT_SECONDS}.`,
        defaultValue: String(DEFAULT_COMMAND_TIMEOUT_SECONDS),
      },
      cwd: {
        description: 'Directory to run in, relative to the workspace root.',
        example: '"packages/api"',
        defaultValue: 'the workspace root',
      },
    },
  },
};
