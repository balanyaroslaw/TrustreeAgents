import { Injectable } from '@nestjs/common';
import { GitChangeKind } from '../../git/git-change-kind.enum';
import {
  ADDED_STATUS_CODE,
  COPY_STATUS_CODE,
  DELETED_STATUS_CODE,
  DETACHED_HEAD_LABEL,
  GIT_STATUS_GROUP_ORDER,
  MAX_STATUS_ENTRIES,
  RENAME_STATUS_CODE,
  UNTRACKED_STATUS_CODE,
} from '../../git/git.constants';
import { GitService } from '../../git/git.service';
import type { GitStatusEntry } from '../../git/git.types';
import { WorkspaceMessages } from '../../workspace.messages';
import type { GitStatusGroups } from './git-status.types';

const LINE_BREAK = '\n';

@Injectable()
export class GitStatusService {
  constructor(private readonly git: GitService) {}

  async status(): Promise<string> {
    const branch = (await this.git.currentBranch()) ?? DETACHED_HEAD_LABEL;
    const entries = await this.git.statusEntries();
    if (entries.length === 0) {
      return WorkspaceMessages.statusCleanTree(branch);
    }

    return GitStatusService.render(branch, GitStatusService.group(entries), entries.length);
  }

  private static render(branch: string, groups: GitStatusGroups, total: number): string {
    const lines = [WorkspaceMessages.statusHeader(branch)];
    let shown = 0;

    for (const kind of GIT_STATUS_GROUP_ORDER) {
      const paths = groups.get(kind);
      if (paths === undefined || paths.length === 0 || shown >= MAX_STATUS_ENTRIES) {
        continue;
      }
      lines.push(WorkspaceMessages.statusGroupHeader(kind, paths.length));
      for (const path of paths) {
        if (shown >= MAX_STATUS_ENTRIES) {
          break;
        }
        lines.push(WorkspaceMessages.statusEntry(path));
        shown += 1;
      }
    }

    const remaining = total - shown;
    if (remaining > 0) {
      lines.push(WorkspaceMessages.statusTruncated(remaining));
    }

    return lines.join(LINE_BREAK);
  }

  private static group(entries: readonly GitStatusEntry[]): GitStatusGroups {
    const groups: GitStatusGroups = new Map();

    for (const entry of entries) {
      const kind = GitStatusService.kindOf(entry);
      const label =
        kind === GitChangeKind.Renamed && entry.originalPath !== null
          ? WorkspaceMessages.statusRename(entry.originalPath, entry.path)
          : entry.path;
      const paths = groups.get(kind) ?? [];
      paths.push(label);
      groups.set(kind, paths);
    }

    for (const paths of groups.values()) {
      paths.sort();
    }

    return groups;
  }

  private static kindOf(entry: GitStatusEntry): GitChangeKind {
    const { indexStatus, worktreeStatus } = entry;
    const codes = [indexStatus, worktreeStatus];

    if (indexStatus === UNTRACKED_STATUS_CODE) {
      return GitChangeKind.Untracked;
    }
    if (codes.some((code) => code === RENAME_STATUS_CODE || code === COPY_STATUS_CODE)) {
      return GitChangeKind.Renamed;
    }
    if (indexStatus === ADDED_STATUS_CODE) {
      return GitChangeKind.Added;
    }
    if (codes.some((code) => code === DELETED_STATUS_CODE)) {
      return GitChangeKind.Deleted;
    }
    return GitChangeKind.Modified;
  }
}
