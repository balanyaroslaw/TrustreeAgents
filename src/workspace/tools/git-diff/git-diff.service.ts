import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DIFF_FILE_HEADER_PREFIX,
  GIT_DIFF_EXCLUDED_PATHS,
  MAX_DIFF_CHARACTERS,
} from '../../git/git.constants';
import { GitService } from '../../git/git.service';
import { BinaryDetector } from '../../security/binary.detector';
import { TextContent } from '../../utils/text-content';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { GitDiffMode } from './git-diff-mode.enum';
import type { TruncatedDiff, UntrackedDiffSections, ValidatedDiffRequest } from './git-diff.types';

const LINE_BREAK = '\n';
const EMPTY_TEXT = '';
const LAST_INDEX_OFFSET = 1;

@Injectable()
export class GitDiffService {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly git: GitService,
  ) {}

  async diff(request: ValidatedDiffRequest): Promise<string> {
    return request.mode === GitDiffMode.Full ? this.full(request) : this.stat(request);
  }

  private async stat(request: ValidatedDiffRequest): Promise<string> {
    const { baseRef, relativePath } = request;

    const summary = (await this.git.diffStat(baseRef, relativePath)).trimEnd();
    const untracked = await this.git.untrackedFiles(relativePath);
    if (summary === EMPTY_TEXT && untracked.length === 0) {
      return WorkspaceMessages.diffNoChanges(baseRef);
    }

    const lines: string[] = [];
    if (summary !== EMPTY_TEXT) {
      lines.push(summary);
    }
    for (const path of untracked) {
      lines.push(await this.untrackedSummaryLine(path));
    }
    lines.push(WorkspaceMessages.diffStatHint());

    return lines.join(LINE_BREAK);
  }

  private async full(request: ValidatedDiffRequest): Promise<string> {
    const { baseRef, relativePath } = request;

    const excluded = await this.excludedNames(baseRef, relativePath);
    const patch = await this.git.diffFull(baseRef, relativePath, GIT_DIFF_EXCLUDED_PATHS);
    const untracked = await this.untrackedSections(relativePath);

    const sections = [...GitDiffService.splitPatch(patch), ...untracked.sections];
    if (
      sections.length === 0 &&
      excluded.length === 0 &&
      untracked.skippedBinaryPaths.length === 0
    ) {
      return WorkspaceMessages.diffNoChanges(baseRef);
    }

    const notes: string[] = [];
    if (excluded.length > 0) {
      notes.push(WorkspaceMessages.diffExcluded(excluded));
    }
    for (const path of untracked.skippedBinaryPaths) {
      notes.push(WorkspaceMessages.diffBinarySkipped(path));
    }

    const header = notes.length === 0 ? EMPTY_TEXT : notes.join(LINE_BREAK) + LINE_BREAK;
    const truncated = GitDiffService.truncate(sections, MAX_DIFF_CHARACTERS - header.length);

    const output = [header, truncated.text];
    if (truncated.remainingCharacters > 0) {
      output.push(WorkspaceMessages.diffTruncated(truncated.remainingCharacters));
    }

    return output.join(EMPTY_TEXT).trimEnd();
  }

  private async excludedNames(baseRef: string, relativePath?: string): Promise<string[]> {
    const all = await this.git.diffNames(baseRef, relativePath);
    if (all.length === 0) {
      return [];
    }
    const kept = new Set(await this.git.diffNames(baseRef, relativePath, GIT_DIFF_EXCLUDED_PATHS));
    return all.filter((name) => !kept.has(name));
  }

  private async untrackedSections(relativePath?: string): Promise<UntrackedDiffSections> {
    const paths = await this.git.untrackedFiles(relativePath, GIT_DIFF_EXCLUDED_PATHS);
    const sections: string[] = [];
    const skippedBinaryPaths: string[] = [];

    for (const path of paths) {
      const bytes = await this.readBytes(path);
      if (bytes === null || BinaryDetector.isBinary(path, bytes)) {
        skippedBinaryPaths.push(path);
        continue;
      }
      const section = await this.git.newFileDiff(path);
      if (section.trim() !== EMPTY_TEXT) {
        sections.push(GitDiffService.withTrailingBreak(section));
      }
    }

    return { sections, skippedBinaryPaths };
  }

  private async untrackedSummaryLine(path: string): Promise<string> {
    const bytes = await this.readBytes(path);
    if (bytes === null || BinaryDetector.isBinary(path, bytes)) {
      return WorkspaceMessages.diffUntrackedBinaryEntry(path);
    }
    return WorkspaceMessages.diffUntrackedEntry(path, TextContent.countLines(bytes.toString()));
  }

  private async readBytes(relativePath: string): Promise<Buffer | null> {
    return readFile(join(this.workspace.root, relativePath)).catch(() => null);
  }

  private static splitPatch(patch: string): string[] {
    if (patch.trim() === EMPTY_TEXT) {
      return [];
    }

    const lines = patch.split(LINE_BREAK);
    if (lines[lines.length - LAST_INDEX_OFFSET] === EMPTY_TEXT) {
      lines.pop();
    }

    const sections: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (line.startsWith(DIFF_FILE_HEADER_PREFIX) && current.length > 0) {
        sections.push(GitDiffService.joinSection(current));
        current = [];
      }
      current.push(line);
    }
    if (current.length > 0) {
      sections.push(GitDiffService.joinSection(current));
    }

    return sections;
  }

  private static joinSection(lines: readonly string[]): string {
    return lines.join(LINE_BREAK) + LINE_BREAK;
  }

  private static withTrailingBreak(section: string): string {
    return section.endsWith(LINE_BREAK) ? section : section + LINE_BREAK;
  }

  private static truncate(sections: readonly string[], limit: number): TruncatedDiff {
    const total = sections.reduce((sum, section) => sum + section.length, 0);
    const kept: string[] = [];
    let used = 0;

    for (const section of sections) {
      if (used + section.length <= limit) {
        kept.push(section);
        used += section.length;
        continue;
      }
      if (kept.length === 0 && limit > 0) {
        const slice = section.slice(0, limit);
        kept.push(slice);
        used += slice.length;
      }
      break;
    }

    return { text: kept.join(EMPTY_TEXT), remainingCharacters: total - used };
  }
}
