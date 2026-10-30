import type { z } from 'zod';
import type { searchCodeSchema } from './search-code.schema';

export type SearchCodeInput = z.infer<typeof searchCodeSchema>;

export interface ValidatedSearchRequest {
  readonly pattern: string;
  readonly relativePath?: string;
  readonly glob?: string;
  readonly literal: boolean;
  readonly caseSensitive: boolean;
  readonly contextLines: number;
}

export interface GrepLine {
  readonly path: string;
  readonly lineNumber: number;
  readonly text: string;
}
