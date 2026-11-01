export interface RunCommandOptions {
  workspace: string;
  tui: boolean;
}

export interface UsageCommandOptions {
  run?: string;
  last?: boolean;
  by?: string;
  json?: boolean;
}

export interface HistoryCommandOptions {
  limit: number;
  json?: boolean;
}

export interface AgentCommandOptions {
  workspace?: string;
  // commander sets this to false when --no-stream is passed
  stream?: boolean;
  maxTurns?: number;
}

export interface PricesCommandOptions {
  set?: string;
  input?: number;
  cached?: number;
  output?: number;
}

export interface PruneCommandOptions {
  olderThan?: number;
  run?: string;
  yes?: boolean;
}
