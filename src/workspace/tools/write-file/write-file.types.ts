import type { z } from 'zod';
import type { WriteTarget } from '../../security/write-target.types';
import type { writeFileSchema } from './write-file.schema';

export type WriteFileInput = z.infer<typeof writeFileSchema>;

export interface ValidatedWriteFileRequest {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
  readonly sizeBytes: number;
  readonly existingTarget: WriteTarget | null;
  readonly existingMode?: number;
}
