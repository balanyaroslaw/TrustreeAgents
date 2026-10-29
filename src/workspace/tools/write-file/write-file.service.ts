import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { TextContent } from '../../utils/text-content';
import { WorkspaceMessages } from '../../workspace.messages';
import { TEMPORARY_SUFFIX_BYTES, WRITE_FILE_MODE } from '../file-tool.constants';
import { WriteOutcome } from './write-outcome.enum';
import type { ValidatedWriteFileRequest } from './write-file.types';

@Injectable()
export class WriteFileService {
  async write(request: ValidatedWriteFileRequest): Promise<string> {
    const { absolutePath, relativePath, content, sizeBytes, existingTarget, existingMode } =
      request;

    await this.replaceAtomically(absolutePath, content, existingMode);

    const outcome = existingTarget === null ? WriteOutcome.Created : WriteOutcome.Overwritten;
    return WorkspaceMessages.writeResult(
      outcome,
      relativePath,
      sizeBytes,
      TextContent.countLines(content),
    );
  }

  private async replaceAtomically(
    absolutePath: string,
    content: string,
    existingMode?: number,
  ): Promise<void> {
    const directory = dirname(absolutePath);
    await mkdir(directory, { recursive: true });

    const suffix = randomBytes(TEMPORARY_SUFFIX_BYTES).toString('hex');
    const temporary = join(directory, `.${basename(absolutePath)}.${suffix}.tmp`);
    try {
      await writeFile(temporary, content, { encoding: 'utf8', mode: WRITE_FILE_MODE });
      if (existingMode !== undefined) {
        await chmod(temporary, existingMode);
      }
      await rename(temporary, absolutePath);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }
}
