export interface GitCommandResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly killed: boolean;
}

export interface GitStatusEntry {
  readonly indexStatus: string;
  readonly worktreeStatus: string;
  readonly path: string;
  readonly originalPath: string | null;
}

export interface GitGrepRequest {
  readonly pattern: string;
  readonly literal: boolean;
  readonly caseSensitive: boolean;
  readonly contextLines: number;
  readonly relativePath?: string;
  readonly glob?: string;
}
