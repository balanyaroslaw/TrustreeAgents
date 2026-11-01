import { DurationFormatter } from '../agents/utils/duration.formatter';
import { ALLOWED_EXECUTABLES, GIT_COMMAND_HINT } from './commands/command-policy.constants';
import { ByteSizeFormatter } from './utils/byte-size.formatter';
import type { GitChangeKind } from './git/git-change-kind.enum';
import { ERROR_PREFIX, MAX_READ_CHARACTERS, MAX_READ_LINES } from './tools/file-tool.constants';
import { ReadTruncation } from './tools/read-file/read-truncation.enum';
import { WriteOutcome } from './tools/write-file/write-outcome.enum';

export class WorkspaceMessages {
  static workspaceNotFound(requested: string): string {
    return `error: the workspace path "${requested}" does not exist. Create it or pass an existing path with -w`;
  }

  static error(reason: string): string {
    return `${ERROR_PREFIX}${reason}`;
  }

  static invalidArguments(issues: readonly string[]): string {
    return (
      `invalid arguments: ${issues.join('; ')}. Check the parameter descriptions and call the ` +
      'tool again'
    );
  }

  static fileNotFound(relativePath: string): string {
    return `file not found: ${relativePath}. Use list_files to check the path`;
  }

  static directoryNotFound(relativePath: string): string {
    return (
      `directory not found: ${relativePath}. Use list_files on the workspace root to see what ` +
      'exists'
    );
  }

  static isDirectory(relativePath: string): string {
    return `${relativePath} is a directory. Use list_files to see what is inside`;
  }

  static isNotADirectory(relativePath: string): string {
    return `${relativePath} is not a directory. Use read_file to read a file`;
  }

  static isNotAReadableFile(relativePath: string): string {
    return (
      `${relativePath} is not a regular file and cannot be read. Only regular text files can ` +
      'be read'
    );
  }

  static fileTooLarge(relativePath: string, bytes: number, limit: number): string {
    return (
      `${relativePath} is too large (${ByteSizeFormatter.format(bytes)}, limit ` +
      `${ByteSizeFormatter.format(limit)}). Read a line range with startLine/endLine or use ` +
      'search instead'
    );
  }

  static contentTooLarge(bytes: number, limit: number): string {
    return (
      `content is too large (${ByteSizeFormatter.format(bytes)}, limit ` +
      `${ByteSizeFormatter.format(limit)}). Split the work into several smaller files`
    );
  }

  static invalidUtf8(relativePath: string): string {
    return (
      `${relativePath} is not valid UTF-8 text and cannot be read. Only UTF-8 text files can ` +
      'be read'
    );
  }

  static empty(relativePath: string): string {
    return `${relativePath} is empty`;
  }

  static startLinePastEnd(startLine: number, relativePath: string, totalLines: number): string {
    return (
      `startLine ${startLine} is past the end of ${relativePath} (${totalLines} lines). ` +
      'Use a smaller startLine'
    );
  }

  static symlinkTarget(relativePath: string): string {
    return (
      `${relativePath} is a symlink and symlinks are never written through. Write to the file ` +
      'it points at instead'
    );
  }

  static existingDirectoryTarget(relativePath: string): string {
    return (
      `${relativePath} is an existing directory, not a file. Use list_files to see what is ` +
      'inside and pick a file path'
    );
  }

  static notRegularFileTarget(relativePath: string): string {
    return `${relativePath} is not a regular file. Only regular files can be written`;
  }

  static readHeader(
    relativePath: string,
    startLine: number,
    endLine: number,
    totalLines: number,
  ): string {
    return `${relativePath} (lines ${startLine}-${endLine} of ${totalLines})`;
  }

  static readLine(lineNumber: number, text: string): string {
    return `${lineNumber}  ${text}`;
  }

  static readFooter(
    startLine: number,
    endLine: number,
    remainingLines: number,
    truncation: ReadTruncation,
  ): string {
    const parts = [`[Showing lines ${startLine}-${endLine}.`];
    if (truncation === ReadTruncation.Characters) {
      parts.push(`Truncated at the ${MAX_READ_CHARACTERS}-character limit.`);
    } else if (truncation === ReadTruncation.Lines) {
      parts.push(`Truncated at the ${MAX_READ_LINES}-line limit.`);
    }
    if (remainingLines > 0) {
      parts.push(`${remainingLines} more line${remainingLines === 1 ? '' : 's'}.`);
    }
    parts.push('Use startLine/endLine to read further.]');
    return parts.join(' ');
  }

  static writeResult(
    outcome: WriteOutcome,
    relativePath: string,
    bytes: number,
    lines: number,
  ): string {
    return `${outcome} ${relativePath} (${ByteSizeFormatter.format(bytes)}, ${lines} lines)`;
  }

  static listHeader(relativePath: string, depth: number): string {
    return `${relativePath} (depth ${depth})`;
  }

  static listTruncated(remainingEntries: number, capped: boolean): string {
    return (
      `[Truncated: ${remainingEntries}${capped ? '+' : ''} more entries. ` +
      'Use a deeper path or smaller depth.]'
    );
  }

  static editTargetTooLarge(relativePath: string, bytes: number, limit: number): string {
    return (
      `${relativePath} is too large to edit (${ByteSizeFormatter.format(bytes)}, limit ` +
      `${ByteSizeFormatter.format(limit)}). Change a smaller file or split it first`
    );
  }

  static editResultTooLarge(bytes: number, limit: number): string {
    return (
      `the file would be ${ByteSizeFormatter.format(bytes)} after the edit (limit ` +
      `${ByteSizeFormatter.format(limit)}). Make a smaller change`
    );
  }

  static identicalEditStrings(): string {
    return 'oldString and newString are identical, so there is nothing to change';
  }

  static oldStringNotFound(relativePath: string): string {
    return (
      `oldString not found in ${relativePath}. Read the file again and copy the text exactly ` +
      '(whitespace matters)'
    );
  }

  static oldStringNotUnique(relativePath: string, occurrences: number): string {
    return (
      `oldString appears ${occurrences} times in ${relativePath}. Add more surrounding context ` +
      'to make it unique, or set replaceAll'
    );
  }

  static editResult(
    relativePath: string,
    replacements: number,
    addedLines: number,
    removedLines: number,
  ): string {
    const label = replacements === 1 ? 'replacement' : 'replacements';
    return (
      `Edited ${relativePath} (${replacements} ${label}, ` +
      `+${addedLines} -${removedLines} lines)`
    );
  }

  static isDeletableDirectory(relativePath: string): string {
    return `${relativePath} is a directory. Only files can be deleted`;
  }

  static symlinkDeleteTarget(relativePath: string): string {
    return (
      `${relativePath} is a symlink and symlinks are never deleted. Delete the file it points ` +
      'at if that is what you meant'
    );
  }

  static protectedFile(relativePath: string): string {
    return `${relativePath} is protected and cannot be deleted. Leave it in place`;
  }

  static deleteResult(relativePath: string, tracked: boolean | null): string {
    if (tracked === null) {
      return `Deleted ${relativePath} (workspace is not a git repository, NOT recoverable)`;
    }
    return tracked
      ? `Deleted ${relativePath} (tracked by git, recoverable)`
      : `Deleted ${relativePath} (untracked, NOT recoverable)`;
  }

  static statusHeader(branch: string): string {
    return `Branch: ${branch}`;
  }

  static statusCleanTree(branch: string): string {
    return `Branch ${branch}: working tree clean`;
  }

  static statusGroupHeader(kind: GitChangeKind, count: number): string {
    return `${kind} (${count}):`;
  }

  static statusEntry(path: string): string {
    return `  ${path}`;
  }

  static statusRename(originalPath: string, path: string): string {
    return `${originalPath} -> ${path}`;
  }

  static statusTruncated(remainingEntries: number): string {
    return `[Truncated: ${remainingEntries} more entries]`;
  }

  static unknownGitRef(ref: string): string {
    return (
      `unknown git ref "${ref}". Leave base empty to compare with the start of this run, or ` +
      'pass a branch name that exists'
    );
  }

  static diffNoChanges(baseRef: string): string {
    return `No changes compared to ${baseRef}`;
  }

  static diffStatHint(): string {
    return 'Use mode "full" with a path to see the changes of one file';
  }

  static diffUntrackedEntry(path: string, lines: number): string {
    return `?? ${path} (${lines} lines)`;
  }

  static diffUntrackedBinaryEntry(path: string): string {
    return `?? ${path} (binary)`;
  }

  static diffBinarySkipped(path: string): string {
    return `Binary file skipped: ${path}`;
  }

  static diffExcluded(paths: readonly string[]): string {
    return `Excluded from the diff: ${paths.join(', ')}`;
  }

  static diffTruncated(remainingCharacters: number): string {
    return `[Truncated: ${remainingCharacters} more characters. Request a specific path]`;
  }

  static pathNotFound(relativePath: string): string {
    return `path not found: ${relativePath}. Use list_files to check the path`;
  }

  static invalidGlob(): string {
    return (
      'glob may only contain letters, digits and _ . / * ? { } [ ] , - , must not contain ".." ' +
      'and must not start with "/". Example: "*.ts"'
    );
  }

  static searchHeader(matches: number, files: number, pattern: string): string {
    const matchLabel = matches === 1 ? 'match' : 'matches';
    const fileLabel = files === 1 ? 'file' : 'files';
    return `Found ${matches} ${matchLabel} in ${files} ${fileLabel} for "${pattern}":`;
  }

  static searchMatch(relativePath: string, lineNumber: number, text: string): string {
    return `${relativePath}:${lineNumber}:${text}`;
  }

  static searchContext(relativePath: string, lineNumber: number, text: string): string {
    return `${relativePath}-${lineNumber}-${text}`;
  }

  static searchTruncated(): string {
    return '[Truncated: more matches exist. Narrow the search with path or glob.]';
  }

  static searchNoMatches(pattern: string, scope: string): string {
    return (
      `No matches for "${pattern}" in ${scope}. Try a shorter pattern or a different spelling ` +
      '(search is case-insensitive unless caseSensitive is set)'
    );
  }

  static shellSyntaxNotSupported(found: string): string {
    return `shell syntax is not supported (found "${found}"). Run one command per call`;
  }

  static unbalancedQuote(): string {
    return 'the command has an unbalanced quote. Close the quote or drop it';
  }

  static emptyCommand(): string {
    return 'command must not be empty. Pass one command, for example "npm test"';
  }

  static gitCommandDenied(): string {
    return `git commands are not allowed. ${GIT_COMMAND_HINT}`;
  }

  static executableNotAllowed(executable: string): string {
    return `"${executable}" is not allowed. Allowed: ${ALLOWED_EXECUTABLES.join(', ')}`;
  }

  static deniedCommandFlag(flag: string): string {
    return `the flag ${flag} is not allowed. Run the command without it`;
  }

  static argumentOutsideWorkspace(value: string): string {
    return `"${value}" points outside the workspace. Use a path inside the workspace`;
  }

  static missingSubcommand(executable: string, hint: string): string {
    return `"${executable}" needs a subcommand. ${hint}`;
  }

  static subcommandNotAllowed(executable: string, subcommand: string, hint: string): string {
    return `"${executable} ${subcommand}" is not allowed. ${hint}`;
  }

  static localToolMissing(executable: string, hint: string): string {
    return `"${executable}" is not installed in node_modules/.bin. ${hint}`;
  }

  static commandNotApproved(): string {
    return 'the command was not approved by the user';
  }

  static commandTimedOut(timeoutMs: number, output: string): string {
    return (
      `command timed out after ${DurationFormatter.preciseSeconds(timeoutMs)} and was killed. ` +
      `Output so far: ${output}`
    );
  }

  static couldNotStartCommand(executable: string, reason: string): string {
    return `could not start "${executable}": ${reason}`;
  }

  static commandResult(
    displayCommand: string,
    exitCode: number | null,
    signal: string | null,
    durationMs: number,
    output: string,
  ): string {
    const status = exitCode === null ? `none (killed by ${signal ?? 'a signal'})` : `${exitCode}`;
    return [
      `$ ${displayCommand}`,
      `exit code: ${status}, took ${DurationFormatter.preciseSeconds(durationMs)}`,
      '--- output ---',
      output === '' ? '(no output)' : output,
    ].join('\n');
  }

  static outputCut(limitBytes: number): string {
    return `[Output was cut: it exceeded ${ByteSizeFormatter.format(limitBytes)}]`;
  }

  static outputOmitted(characters: number): string {
    return `[... ${characters} characters omitted ...]`;
  }

  static commandsNotSupportedOnWindows(): string {
    return 'run_command is not supported on native Windows. Use WSL';
  }
}
