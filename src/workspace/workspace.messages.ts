import { ByteSizeFormatter } from './utils/byte-size.formatter';
import type { GitChangeKind } from './git/git-change-kind.enum';
import { ERROR_PREFIX, MAX_READ_CHARACTERS, MAX_READ_LINES } from './tools/file-tool.constants';
import { ReadTruncation } from './tools/read-file/read-truncation.enum';
import { WriteOutcome } from './tools/write-file/write-outcome.enum';

export class WorkspaceMessages {
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
}
