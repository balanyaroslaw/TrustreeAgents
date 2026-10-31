import type { ChangedFileStatus } from './changed-file-status.enum';

export interface ChangedFile {
  readonly path: string;
  readonly status: ChangedFileStatus;
  readonly added: number;
  readonly removed: number;
}

export interface LineCounts {
  readonly added: number;
  readonly removed: number;
}
