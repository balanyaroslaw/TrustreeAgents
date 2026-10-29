import { Injectable } from '@nestjs/common';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PathPolicy } from '../../security/path.policy';
import { WorkspaceMessages } from '../../workspace.messages';
import {
  DIRECTORY_SUFFIX,
  MAX_LIST_ENTRIES,
  MAX_SCANNED_ENTRIES,
  SYMLINK_SUFFIX,
  TREE_INDENT,
} from '../file-tool.constants';
import type {
  DirectoryEntry,
  DirectoryScanState,
  ValidatedListFilesRequest,
} from './list-files.types';

@Injectable()
export class ListFilesService {
  async list(request: ValidatedListFilesRequest): Promise<string> {
    const { absolutePath, relativePath, depth } = request;

    const state: DirectoryScanState = { lines: [], scanned: 0, capped: false };
    await this.scan(absolutePath, 0, depth, state);

    if (state.lines.length === 0) {
      return WorkspaceMessages.empty(relativePath);
    }

    const shown = state.lines.slice(0, MAX_LIST_ENTRIES);
    const output = [WorkspaceMessages.listHeader(relativePath, depth), ...shown];

    const remaining = state.lines.length - shown.length;
    if (remaining > 0 || state.capped) {
      output.push(WorkspaceMessages.listTruncated(remaining, state.capped));
    }

    return output.join('\n');
  }

  private async scan(
    directory: string,
    level: number,
    maxDepth: number,
    state: DirectoryScanState,
  ): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    const visible = entries
      .filter((entry) => !PathPolicy.isSkippedName(entry.name))
      .map<DirectoryEntry>((entry) => ({
        name: entry.name,
        isSymbolicLink: entry.isSymbolicLink(),
        isDirectory: entry.isDirectory() && !entry.isSymbolicLink(),
      }))
      .sort(ListFilesService.compare);

    const indent = TREE_INDENT.repeat(level);
    for (const entry of visible) {
      if (state.scanned >= MAX_SCANNED_ENTRIES) {
        state.capped = true;
        return;
      }
      state.scanned += 1;

      if (entry.isSymbolicLink) {
        state.lines.push(`${indent}${entry.name}${SYMLINK_SUFFIX}`);
        continue;
      }
      if (!entry.isDirectory) {
        state.lines.push(`${indent}${entry.name}`);
        continue;
      }

      state.lines.push(`${indent}${entry.name}${DIRECTORY_SUFFIX}`);
      if (level + 1 < maxDepth) {
        await this.scan(join(directory, entry.name), level + 1, maxDepth, state);
      }
    }
  }

  private static compare(a: DirectoryEntry, b: DirectoryEntry): number {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name, 'en');
  }
}
