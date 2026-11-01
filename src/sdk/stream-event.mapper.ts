import type { RunStreamEvent } from '@openai/agents';
import type { CallEventEmitter } from './call-event.emitter';
import { UNKNOWN_TOOL_NAME } from './sdk.constants';

const TOOL_CALLED_EVENT = 'tool_called';
const RUN_ITEM_EVENT = 'run_item_stream_event';

// Forwards the stream of the SDK as our own events. Only status is forwarded: the name of the
// tool being used, never the text the model generates.
export class StreamEventMapper {
  static forward(event: RunStreamEvent, emitter: CallEventEmitter): void {
    if (event.type !== RUN_ITEM_EVENT || event.name !== TOOL_CALLED_EVENT) {
      return;
    }
    emitter.toolCalled(StreamEventMapper.toolNameOf(event.item), '');
  }

  private static toolNameOf(item: unknown): string {
    const raw = StreamEventMapper.at(item, 'rawItem');
    const name = raw === null ? undefined : raw['name'];

    return typeof name === 'string' && name !== '' ? name : UNKNOWN_TOOL_NAME;
  }

  private static at(value: unknown, key: string): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const nested = (value as Record<string, unknown>)[key];
    return typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : null;
  }
}
