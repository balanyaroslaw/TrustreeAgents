import type { z } from 'zod';
import type { listFilesSchema } from './list-files.schema';

export type ListFilesInput = z.infer<typeof listFilesSchema>;

export interface ValidatedListFilesRequest {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly depth: number;
}

export interface DirectoryScanState {
  readonly lines: string[];
  scanned: number;
  capped: boolean;
}

export interface DirectoryEntry {
  readonly name: string;
  readonly isSymbolicLink: boolean;
  readonly isDirectory: boolean;
}
