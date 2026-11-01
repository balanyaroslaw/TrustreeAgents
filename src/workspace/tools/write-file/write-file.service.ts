import { Inject, Injectable } from '@nestjs/common';
import { AgentCallStore } from '../../activity/agent-call.store';
import { ChangeAction } from '../../activity/change-action.enum';
import { AtomicFileWriter } from '../../io/atomic-file.writer';
import { TextContent } from '../../utils/text-content';
import { WorkspaceMessages } from '../../workspace.messages';
import { WriteOutcome } from './write-outcome.enum';
import type { ValidatedWriteFileRequest } from './write-file.types';

@Injectable()
export class WriteFileService {
  constructor(@Inject(AgentCallStore) private readonly calls: AgentCallStore) {}

  async write(request: ValidatedWriteFileRequest): Promise<string> {
    const { absolutePath, relativePath, content, sizeBytes, existingTarget, existingMode } =
      request;

    await AtomicFileWriter.replace(absolutePath, content, existingMode);

    const outcome = existingTarget === null ? WriteOutcome.Created : WriteOutcome.Overwritten;
    this.calls
      .current()
      ?.changes.record(
        relativePath,
        outcome === WriteOutcome.Created ? ChangeAction.Created : ChangeAction.Modified,
      );

    return WorkspaceMessages.writeResult(
      outcome,
      relativePath,
      sizeBytes,
      TextContent.countLines(content),
    );
  }
}
