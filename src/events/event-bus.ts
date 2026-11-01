import { Injectable } from '@nestjs/common';
import type { AgentEvent, AgentEventListener } from './agent-event.types';

// The only channel from the execution core to the outside: the terminal UI and the database
// logger subscribe, the executor knows none of them. A listener that throws is ignored, so a
// broken subscriber can never fail a run.
@Injectable()
export class EventBus {
  private readonly listeners = new Set<AgentEventListener>();

  subscribe(listener: AgentEventListener): void {
    this.listeners.add(listener);
  }

  unsubscribe(listener: AgentEventListener): void {
    this.listeners.delete(listener);
  }

  emit(event: AgentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener.onEvent(event);
      } catch {
        continue;
      }
    }
  }
}
