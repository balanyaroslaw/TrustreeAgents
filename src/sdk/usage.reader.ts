import { Logger } from '@nestjs/common';
import type { AgentUsage } from '../execution/agents/agent-invocation.types';

const NO_TOKENS = 0;
const CACHED_TOKEN_KEYS: readonly string[] = ['cached_tokens', 'cachedTokens'];

// Reads the token counts of a finished run. The shape is the SDK's, so every field is read
// defensively: missing numbers count as 0 and the odd shape is logged once, because accounting
// must degrade instead of crashing a run.
export class UsageReader {
  private static readonly logger = new Logger(UsageReader.name);
  private static warned = false;

  static read(result: unknown): AgentUsage {
    const usage = UsageReader.usageOf(result);
    if (usage === null) {
      UsageReader.warnOnce('the run result carried no usage object');
      return { input: NO_TOKENS, cachedInput: NO_TOKENS, output: NO_TOKENS, total: NO_TOKENS };
    }
    const input = UsageReader.numberAt(usage, 'inputTokens');
    const output = UsageReader.numberAt(usage, 'outputTokens');
    const total = UsageReader.numberAt(usage, 'totalTokens');

    return {
      input,
      cachedInput: UsageReader.cachedOf(usage),
      output,
      total: total > NO_TOKENS ? total : input + output,
    };
  }

  private static usageOf(result: unknown): Record<string, unknown> | null {
    const context = UsageReader.objectAt(result, 'runContext');
    const usage = context === null ? null : UsageReader.objectAt(context, 'usage');
    if (usage !== null) {
      return usage;
    }
    // A run that failed before any request has no context yet; the error may carry the state.
    return UsageReader.objectAt(result, 'usage');
  }

  private static cachedOf(usage: Record<string, unknown>): number {
    const details = usage['inputTokensDetails'];
    const entries = Array.isArray(details) ? details : [details];

    return entries.reduce((total: number, entry: unknown) => {
      if (typeof entry !== 'object' || entry === null) {
        return total;
      }
      const values = entry as Record<string, unknown>;
      const key = CACHED_TOKEN_KEYS.find((candidate) => typeof values[candidate] === 'number');

      return key === undefined ? total : total + (values[key] as number);
    }, NO_TOKENS);
  }

  private static objectAt(value: unknown, name: string): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const nested = (value as Record<string, unknown>)[name];
    return typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : null;
  }

  private static numberAt(values: Record<string, unknown>, name: string): number {
    const value = values[name];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      UsageReader.warnOnce(`usage field "${name}" was not a number`);
      return NO_TOKENS;
    }
    return value;
  }

  private static warnOnce(reason: string): void {
    if (UsageReader.warned) {
      return;
    }
    UsageReader.warned = true;
    UsageReader.logger.warn(`${reason}; token counts for this process may be incomplete`);
  }
}
