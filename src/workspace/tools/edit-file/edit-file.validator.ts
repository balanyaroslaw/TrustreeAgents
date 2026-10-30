import { Injectable } from '@nestjs/common';
import { lstat, readFile } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { BinaryDetector } from '../../security/binary.detector';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { TextContent } from '../../utils/text-content';
import { BINARY_READ_DENIED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { FILE_MODE_MASK } from '../file-tool.constants';
import {
  CARRIAGE_RETURN_LINE_FEED,
  LINE_FEED_PATTERN,
  MAX_EDIT_FILE_BYTES,
} from './edit-file.constants';
import { editFileSchema } from './edit-file.schema';
import type { EditFragments, ValidatedEditRequest } from './edit-file.types';

const UTF8_ENCODING = 'utf8';
const NOT_FOUND_INDEX = -1;

@Injectable()
export class EditFileValidator {
  constructor(private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedEditRequest> {
    const parsed = editFileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const { path: inputPath, replaceAll = false } = parsed.data;

    const absolutePath = await this.workspace
      .resolveSafe(inputPath)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    const denied = PathPolicy.denyWriteReason(relativePath);
    if (denied !== null) {
      throw new ToolValidationError(denied);
    }

    const stats = await lstat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    if (stats === null) {
      throw new ToolValidationError(WorkspaceMessages.fileNotFound(relativePath));
    }
    const targetDenied = PathPolicy.denyWriteTargetReason(relativePath, {
      isDirectory: stats.isDirectory(),
      isSymbolicLink: stats.isSymbolicLink(),
      isFile: stats.isFile(),
    });
    if (targetDenied !== null) {
      throw new ToolValidationError(targetDenied);
    }
    if (stats.size > MAX_EDIT_FILE_BYTES) {
      throw new ToolValidationError(
        WorkspaceMessages.editTargetTooLarge(relativePath, stats.size, MAX_EDIT_FILE_BYTES),
      );
    }
    if (BinaryDetector.hasBinaryExtension(relativePath)) {
      throw new ToolValidationError(BINARY_READ_DENIED_MESSAGE);
    }

    const content = await this.readText(absolutePath, relativePath);
    const { oldString, newString } = EditFileValidator.alignLineEndings(content, parsed.data);
    if (oldString === newString) {
      throw new ToolValidationError(WorkspaceMessages.identicalEditStrings());
    }

    const occurrences = EditFileValidator.countOccurrences(content, oldString);
    if (occurrences === 0) {
      throw new ToolValidationError(WorkspaceMessages.oldStringNotFound(relativePath));
    }
    if (occurrences > 1 && !replaceAll) {
      throw new ToolValidationError(
        WorkspaceMessages.oldStringNotUnique(relativePath, occurrences),
      );
    }

    const replacements = replaceAll ? occurrences : 1;
    const resultBytes =
      Buffer.byteLength(content, UTF8_ENCODING) +
      replacements *
        (Buffer.byteLength(newString, UTF8_ENCODING) - Buffer.byteLength(oldString, UTF8_ENCODING));
    if (resultBytes > MAX_EDIT_FILE_BYTES) {
      throw new ToolValidationError(
        WorkspaceMessages.editResultTooLarge(resultBytes, MAX_EDIT_FILE_BYTES),
      );
    }

    return {
      absolutePath,
      relativePath,
      content,
      oldString,
      newString,
      replaceAll,
      occurrences,
      mode: stats.mode & FILE_MODE_MASK,
    };
  }

  private async readText(absolutePath: string, relativePath: string): Promise<string> {
    const bytes = await readFile(absolutePath);
    if (BinaryDetector.containsNullByte(bytes)) {
      throw new ToolValidationError(BINARY_READ_DENIED_MESSAGE);
    }
    try {
      return TextContent.decodeUtf8(bytes);
    } catch {
      throw new ToolValidationError(WorkspaceMessages.invalidUtf8(relativePath));
    }
  }

  private static alignLineEndings(content: string, fragments: EditFragments): EditFragments {
    if (!content.includes(CARRIAGE_RETURN_LINE_FEED)) {
      return { oldString: fragments.oldString, newString: fragments.newString };
    }
    return {
      oldString: EditFileValidator.toCarriageReturnLineFeed(fragments.oldString),
      newString: EditFileValidator.toCarriageReturnLineFeed(fragments.newString),
    };
  }

  private static toCarriageReturnLineFeed(text: string): string {
    return text.replace(LINE_FEED_PATTERN, CARRIAGE_RETURN_LINE_FEED);
  }

  private static countOccurrences(content: string, oldString: string): number {
    let count = 0;
    let from = 0;
    for (;;) {
      const index = content.indexOf(oldString, from);
      if (index === NOT_FOUND_INDEX) {
        return count;
      }
      count += 1;
      from = index + oldString.length;
    }
  }
}
