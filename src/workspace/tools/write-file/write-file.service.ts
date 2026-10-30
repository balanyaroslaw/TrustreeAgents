import { Injectable } from '@nestjs/common';
import { AtomicFileWriter } from '../../io/atomic-file.writer';
import { TextContent } from '../../utils/text-content';
import { WorkspaceMessages } from '../../workspace.messages';
import { WriteOutcome } from './write-outcome.enum';
import type { ValidatedWriteFileRequest } from './write-file.types';

@Injectable()
export class WriteFileService {
  async write(request: ValidatedWriteFileRequest): Promise<string> {
    const { absolutePath, relativePath, content, sizeBytes, existingTarget, existingMode } =
      request;

    await AtomicFileWriter.replace(absolutePath, content, existingMode);

    const outcome = existingTarget === null ? WriteOutcome.Created : WriteOutcome.Overwritten;
    return WorkspaceMessages.writeResult(
      outcome,
      relativePath,
      sizeBytes,
      TextContent.countLines(content),
    );
  }
}
