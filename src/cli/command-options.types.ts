export interface RunCommandOptions {
  workspace: string;
  tui: boolean;
}

export interface UsageCommandOptions {
  run?: string;
}

export interface HistoryCommandOptions {
  limit: number;
}
