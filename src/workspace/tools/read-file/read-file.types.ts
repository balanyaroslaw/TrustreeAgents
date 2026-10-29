import type { z } from 'zod';
import type { readFileSchema } from './read-file.schema';

export type ReadFileInput = z.infer<typeof readFileSchema>;

export interface ValidatedReadFileRequest {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly sizeBytes: number;
  readonly startLine: number;
  readonly endLine?: number;
}
