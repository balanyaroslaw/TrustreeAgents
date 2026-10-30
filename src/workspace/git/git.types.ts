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
