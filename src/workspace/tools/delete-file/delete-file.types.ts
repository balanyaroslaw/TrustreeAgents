import type { z } from 'zod';
import type { deleteFileSchema } from './delete-file.schema';

export type DeleteFileInput = z.infer<typeof deleteFileSchema>;

export interface ValidatedDeleteRequest {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly tracked: boolean | null;
}
