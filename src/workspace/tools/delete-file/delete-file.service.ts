import { Inject, Injectable } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { AgentCallStore } from '../../activity/agent-call.store';
import { ChangeAction } from '../../activity/change-action.enum';
import { WorkspaceMessages } from '../../workspace.messages';
import type { ValidatedDeleteRequest } from './delete-file.types';

@Injectable()
export class DeleteFileService {
  constructor(@Inject(AgentCallStore) private readonly calls: AgentCallStore) {}

  async delete(request: ValidatedDeleteRequest): Promise<string> {
    const { absolutePath, relativePath, tracked } = request;

    await unlink(absolutePath);
    this.calls.current()?.changes.record(relativePath, ChangeAction.Deleted);

    return WorkspaceMessages.deleteResult(relativePath, tracked);
  }
}
