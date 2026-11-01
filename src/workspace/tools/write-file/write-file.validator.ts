import { Inject, Injectable } from '@nestjs/common';
import { lstat } from 'node:fs/promises';
import { ToolValidationError } from '../../errors/tool-validation.error';
import { PathPolicy } from '../../security/path.policy';
import type { WriteTarget } from '../../security/write-target.types';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { FILE_MODE_MASK, MAX_WRITE_CONTENT_BYTES } from '../file-tool.constants';
import { writeFileSchema } from './write-file.schema';
import type { ValidatedWriteFileRequest } from './write-file.types';

@Injectable()
export class WriteFileValidator {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async validate(input: unknown): Promise<ValidatedWriteFileRequest> {
    const parsed = writeFileSchema.safeParse(input);
    if (!parsed.success) {
      throw new ToolValidationError(
        WorkspaceMessages.invalidArguments(parsed.error.issues.map((issue) => issue.message)),
      );
    }
    const { path: inputPath, content } = parsed.data;

    const absolutePath = await this.workspace
      .resolveSafe(inputPath)
      .catch((error: unknown) => Promise.reject(ToolValidationError.from(error)));
    const relativePath = this.workspace.toRelative(absolutePath);

    const denied = PathPolicy.denyWriteReason(relativePath);
    if (denied !== null) {
      throw new ToolValidationError(denied);
    }

    const sizeBytes = Buffer.byteLength(content, 'utf8');
    if (sizeBytes > MAX_WRITE_CONTENT_BYTES) {
      throw new ToolValidationError(
        WorkspaceMessages.contentTooLarge(sizeBytes, MAX_WRITE_CONTENT_BYTES),
      );
    }

    const stats = await lstat(absolutePath).catch((error: unknown) => {
      if (ErrorInspector.isMissingPath(error)) {
        return null;
      }
      throw error;
    });
    const existingTarget: WriteTarget | null =
      stats === null
        ? null
        : {
            isDirectory: stats.isDirectory(),
            isSymbolicLink: stats.isSymbolicLink(),
            isFile: stats.isFile(),
          };

    const targetDenied = PathPolicy.denyWriteTargetReason(relativePath, existingTarget);
    if (targetDenied !== null) {
      throw new ToolValidationError(targetDenied);
    }

    return {
      absolutePath,
      relativePath,
      content,
      sizeBytes,
      existingTarget,
      existingMode: stats === null ? undefined : stats.mode & FILE_MODE_MASK,
    };
  }
}
