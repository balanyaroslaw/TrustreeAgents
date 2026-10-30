import type { z } from 'zod';
import type { GitDiffMode } from './git-diff-mode.enum';
import type { gitDiffSchema } from './git-diff.schema';

export type GitDiffInput = z.infer<typeof gitDiffSchema>;

export interface ValidatedDiffRequest {
  readonly mode: GitDiffMode;
  readonly baseRef: string;
  readonly relativePath?: string;
}

export interface TruncatedDiff {
  readonly text: string;
  readonly remainingCharacters: number;
}

export interface UntrackedDiffSections {
  readonly sections: readonly string[];
  readonly skippedBinaryPaths: readonly string[];
}
