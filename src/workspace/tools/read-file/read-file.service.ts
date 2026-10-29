import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { BinaryDetector } from '../../security/binary.detector';
import { TextContent } from '../../utils/text-content';
import { BINARY_READ_DENIED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { MAX_READ_CHARACTERS, MAX_READ_LINES } from '../file-tool.constants';
import { ReadTruncation } from './read-truncation.enum';
import type { ValidatedReadFileRequest } from './read-file.types';

@Injectable()
export class ReadFileService {
  async read(request: ValidatedReadFileRequest): Promise<string> {
    const { absolutePath, relativePath, sizeBytes, startLine, endLine } = request;

    if (sizeBytes === 0) {
      return WorkspaceMessages.empty(relativePath);
    }

    const bytes = await readFile(absolutePath);
    if (BinaryDetector.isBinary(relativePath, bytes)) {
      throw new Error(BINARY_READ_DENIED_MESSAGE);
    }

    let content: string;
    try {
      content = TextContent.decodeUtf8(bytes);
    } catch {
      throw new Error(WorkspaceMessages.invalidUtf8(relativePath));
    }

    const lines = TextContent.splitLines(content);
    const totalLines = lines.length;
    if (startLine > totalLines) {
      throw new Error(WorkspaceMessages.startLinePastEnd(startLine, relativePath, totalLines));
    }

    return this.render(relativePath, lines, totalLines, startLine, endLine ?? totalLines);
  }

  private render(
    relativePath: string,
    lines: readonly string[],
    totalLines: number,
    startLine: number,
    requestedEndLine: number,
  ): string {
    const requestedEnd = Math.min(requestedEndLine, totalLines);
    let shownEnd = Math.min(requestedEnd, startLine + MAX_READ_LINES - 1);
    let truncation = shownEnd < requestedEnd ? ReadTruncation.Lines : ReadTruncation.None;

    const body: string[] = [];
    let characters = 0;
    for (let lineNumber = startLine; lineNumber <= shownEnd; lineNumber += 1) {
      const rendered = WorkspaceMessages.readLine(lineNumber, lines[lineNumber - 1]);
      if (body.length > 0 && characters + rendered.length + 1 > MAX_READ_CHARACTERS) {
        shownEnd = lineNumber - 1;
        truncation = ReadTruncation.Characters;
        break;
      }
      characters += rendered.length + 1;
      body.push(rendered);
    }

    const output = [
      WorkspaceMessages.readHeader(relativePath, startLine, shownEnd, totalLines),
      ...body,
    ];
    const remaining = totalLines - shownEnd;
    if (remaining > 0 || truncation !== ReadTruncation.None) {
      output.push(WorkspaceMessages.readFooter(startLine, shownEnd, remaining, truncation));
    }

    return output.join('\n');
  }
}
