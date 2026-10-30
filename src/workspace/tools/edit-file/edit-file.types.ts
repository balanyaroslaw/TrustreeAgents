import type { z } from 'zod';
import type { editFileSchema } from './edit-file.schema';

export type EditFileInput = z.infer<typeof editFileSchema>;

export interface ValidatedEditRequest {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly content: string;
  readonly oldString: string;
  readonly newString: string;
  readonly replaceAll: boolean;
  readonly occurrences: number;
  readonly mode: number;
}

export interface EditFragments {
  readonly oldString: string;
  readonly newString: string;
}
