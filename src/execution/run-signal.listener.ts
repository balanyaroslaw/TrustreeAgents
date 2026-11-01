import { IMMEDIATE_EXIT_CODE } from './execution.constants';

const INTERRUPT_SIGNAL = 'SIGINT';

// Ctrl+C aborts the run so the current agent call unwinds, the state is persisted and the report
// is written. A second Ctrl+C gives up on that and leaves immediately.
export class RunSignalListener {
  private controller: AbortController | null = null;
  private interrupted = false;

  attach(controller: AbortController): void {
    this.controller = controller;
    process.on(INTERRUPT_SIGNAL, this.handler);
  }

  detach(): void {
    process.removeListener(INTERRUPT_SIGNAL, this.handler);
    this.controller = null;
  }

  wasInterrupted(): boolean {
    return this.interrupted;
  }

  private readonly handler = (): void => {
    if (this.interrupted) {
      process.exit(IMMEDIATE_EXIT_CODE);
    }
    this.interrupted = true;
    this.controller?.abort();
  };
}
