import { UsageReader } from './usage.reader';

const NO_TOKENS = 0;

// The token ceiling of one model call. The SDK updates the usage of a streamed run while it
// runs, so the invoker hands the running stream to `check` after every event: the first request
// that takes the call past the cap aborts it, instead of the run paying for the whole call and
// finding out afterwards.
//
// The abort goes through a controller of its own, combined with the signal of the run: the run
// is never cancelled by a call that overspends, and the invoker can tell its own abort from a
// cancelled run by asking `exceeded`.
export class CallTokenCap {
  // The signal every call runs with: aborted when the run is cancelled or when the cap is hit.
  readonly signal: AbortSignal;

  private readonly controller = new AbortController();
  private exceededCap = false;
  private spentTokens = NO_TOKENS;

  constructor(
    private readonly cap: number,
    runSignal: AbortSignal,
  ) {
    this.signal = AbortSignal.any([runSignal, this.controller.signal]);
  }

  // Reads what the call has spent so far and aborts it once that is past the cap. Called often,
  // so it only ever reads the usage the SDK already keeps.
  check(result: unknown): void {
    this.spentTokens = UsageReader.read(result).total;
    if (this.exceededCap || this.spentTokens <= this.cap) {
      return;
    }
    this.exceededCap = true;
    this.controller.abort();
  }

  // Called once the call has returned: the SDK may finish the turn it is in before the abort
  // lands, and a call that is over its cap must never pass as an answer the agent completed.
  throwIfAborted(): void {
    this.signal.throwIfAborted();
  }

  exceeded(): boolean {
    return this.exceededCap;
  }

  spent(): number {
    return this.spentTokens;
  }

  limit(): number {
    return this.cap;
  }
}
