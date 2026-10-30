import { Injectable } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { WorkspaceMessages } from '../../workspace.messages';
import type { ValidatedDeleteRequest } from './delete-file.types';

@Injectable()
export class DeleteFileService {
  async delete(request: ValidatedDeleteRequest): Promise<string> {
    const { absolutePath, relativePath, tracked } = request;

    await unlink(absolutePath);

    return WorkspaceMessages.deleteResult(relativePath, tracked);
  }
}
