import type { ChangeAction } from './change-action.enum';
import type { DeveloperResult } from './developer-result.types';

export interface TrackedChange {
  readonly path: string;
  readonly action: ChangeAction;
  readonly sequence: number;
}

export interface AgentRunUsage {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
}

export interface TokenMetrics {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly total: number;
}

export interface DeveloperMetrics {
  readonly filesChanged: number;
  readonly filesCreated: number;
  readonly filesModified: number;
  readonly filesDeleted: number;
  readonly tokens: TokenMetrics;
  readonly toolCalls: number;
  readonly durationMs: number;
}

export interface DeveloperDiscrepancies {
  readonly unreportedChanges: readonly string[];
  readonly claimedButNotChanged: readonly string[];
}

export interface DeveloperReport {
  readonly result: DeveloperResult;
  readonly metrics: DeveloperMetrics;
  readonly discrepancies: DeveloperDiscrepancies;
}
