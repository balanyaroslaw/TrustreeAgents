import type { z } from 'zod';
import type { GitChangeKind } from '../../git/git-change-kind.enum';
import type { gitStatusSchema } from './git-status.schema';

export type GitStatusInput = z.infer<typeof gitStatusSchema>;

export type GitStatusGroups = Map<GitChangeKind, string[]>;
