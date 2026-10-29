import { ByteSizeFormatter } from './utils/byte-size.formatter';
import { ERROR_PREFIX, MAX_READ_CHARACTERS, MAX_READ_LINES } from './tools/file-tool.constants';
import { ReadTruncation } from './tools/read-file/read-truncation.enum';
import { WriteOutcome } from './tools/write-file/write-outcome.enum';

export class WorkspaceMessages {
  static error(reason: string): string {
    return `${ERROR_PREFIX}${reason}`;
  }

  static invalidArguments(issues: readonly string[]): string {
    return `invalid arguments: ${issues.join('; ')}`;
  }

  static fileNotFound(relativePath: string): string {
    return `file not found: ${relativePath}. Try listing the directory first`;
  }

  static directoryNotFound(relativePath: string): string {
    return `directory not found: ${relativePath}. Try listing the workspace root first`;
  }

  static isDirectory(relativePath: string): string {
    return `${relativePath} is a directory. Use list_files to see what is inside`;
  }

  static isNotADirectory(relativePath: string): string {
    return `${relativePath} is not a directory. Use read_file to read a file`;
  }

  static isNotAReadableFile(relativePath: string): string {
    return `${relativePath} is not a regular file and cannot be read`;
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
    return `${relativePath} is not valid UTF-8 text and cannot be read`;
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
    return `${relativePath} is a symlink and symlinks are never written through`;
  }

  static existingDirectoryTarget(relativePath: string): string {
    return `${relativePath} is an existing directory, not a file`;
  }

  static notRegularFileTarget(relativePath: string): string {
    return `${relativePath} is not a regular file`;
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
}
