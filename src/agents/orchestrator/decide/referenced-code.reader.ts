import { Inject, Injectable } from '@nestjs/common';
import { readFile, stat } from 'node:fs/promises';
import { BinaryDetector } from '../../../workspace/security/binary.detector';
import { MAX_READ_FILE_BYTES } from '../../../workspace/tools/file-tool.constants';
import { TextContent } from '../../../workspace/utils/text-content';
import { WorkspaceMessages } from '../../../workspace/workspace.messages';
import { WorkspaceService } from '../../../workspace/workspace.service';
import type { CodeExcerpt, ExcerptRange } from './rework-brief.types';

const LINE_SEPARATOR = '\n';
const FIRST_LINE = 1;

// Reads the planned ranges from disk, through the same workspace service the file tools use, so a
// path the Reviewer named cannot reach outside the workspace. Nothing here trusts the model: the
// paths come from the Reviewer's structured issues and the contents come from the file.
//
// A file that no longer exists, is binary, is not valid UTF-8, is too large to read or whose range
// starts past its end is skipped silently: the brief is an optimisation, and a missing excerpt
// only means the Developer reads that file itself.
@Injectable()
export class ReferencedCodeReader {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async read(ranges: readonly ExcerptRange[]): Promise<CodeExcerpt[]> {
    const excerpts: CodeExcerpt[] = [];

    for (const range of ranges) {
      const excerpt = await this.excerptOf(range);
      if (excerpt !== null) {
        excerpts.push(excerpt);
      }
    }

    return excerpts;
  }

  private async excerptOf(range: ExcerptRange): Promise<CodeExcerpt | null> {
    try {
      const absolutePath = await this.workspace.resolveSafe(range.path);
      const stats = await stat(absolutePath);
      if (!stats.isFile() || stats.size === 0 || stats.size > MAX_READ_FILE_BYTES) {
        return null;
      }
      const bytes = await readFile(absolutePath);
      if (BinaryDetector.isBinary(range.path, bytes)) {
        return null;
      }

      return ReferencedCodeReader.slice(
        range,
        TextContent.splitLines(TextContent.decodeUtf8(bytes)),
      );
    } catch {
      return null;
    }
  }

  private static slice(range: ExcerptRange, lines: readonly string[]): CodeExcerpt | null {
    const totalLines = lines.length;
    if (range.startLine > totalLines) {
      return null;
    }
    const startLine = Math.max(FIRST_LINE, range.startLine);
    const endLine = Math.min(range.endLine, totalLines);
    const body: string[] = [];

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      body.push(WorkspaceMessages.readLine(lineNumber, lines[lineNumber - FIRST_LINE]));
    }

    return { path: range.path, startLine, endLine, code: body.join(LINE_SEPARATOR) };
  }
}
