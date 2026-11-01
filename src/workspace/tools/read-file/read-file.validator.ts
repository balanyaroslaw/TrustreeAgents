import { Inject, Injectable } from '@nestjs/common';
import { stat } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { BinaryDetector } from '../../security/binary.detector';
import { PathPolicy } from '../../security/path.policy';
import { ErrorInspector } from '../../utils/error.inspector';
import { BINARY_READ_DENIED_MESSAGE } from '../../workspace.constants';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { FIRST_LINE, MAX_READ_FILE_BYTES } from '../file-tool.constants';
import { readFileSchema } from './read-file.schema';
import type { ValidatedReadFileRequest } from './read-file.types';

@Injectable()
export class ReadFileValidator {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedReadFileRequest> {
    const parsed = readFileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const { path: inputPath, startLine = FIRST_LINE, endLine } = parsed.data;

    const absolutePath = await this.workspace
      .resolveSafe(inputPath)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    const denied = PathPolicy.denyReadReason(relativePath);
    if (denied !== null) {
      throw new ToolValidationError(denied);
    }

    const stats = await stat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    if (stats === null) {
      throw new ToolValidationError(WorkspaceMessages.fileNotFound(relativePath));
    }
    if (stats.isDirectory()) {
      throw new ToolValidationError(WorkspaceMessages.isDirectory(relativePath));
    }
    if (!stats.isFile()) {
      throw new ToolValidationError(WorkspaceMessages.isNotAReadableFile(relativePath));
    }
    if (stats.size > MAX_READ_FILE_BYTES) {
      throw new ToolValidationError(
        WorkspaceMessages.fileTooLarge(relativePath, stats.size, MAX_READ_FILE_BYTES),
      );
    }
    if (BinaryDetector.hasBinaryExtension(relativePath)) {
      throw new ToolValidationError(BINARY_READ_DENIED_MESSAGE);
    }

    return { absolutePath, relativePath, sizeBytes: stats.size, startLine, endLine };
  }
}
