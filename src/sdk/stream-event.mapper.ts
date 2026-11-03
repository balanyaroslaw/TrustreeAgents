import type { RunStreamEvent } from '@openai/agents';
import { FileToolName } from '../workspace/enums/file-tool-name.enum';
import type { CallEventEmitter } from './call-event.emitter';
import { UNKNOWN_TOOL_NAME } from './sdk.constants';

const TOOL_CALLED_EVENT = 'tool_called';
const RUN_ITEM_EVENT = 'run_item_stream_event';
const RAW_ITEM_KEY = 'rawItem';
const TOOL_NAME_KEY = 'name';
const TOOL_ARGUMENTS_KEY = 'arguments';
const COMMAND_ARGUMENT = 'command';
const NO_SUMMARY = '';

// Forwards the stream of the SDK as our own events. Only status is forwarded: the name of the tool
// being used and, for run_command, the command it was asked to run - never the text the model
// generates.
export class StreamEventMapper {
  static forward(event: RunStreamEvent, emitter: CallEventEmitter): void {
    if (event.type !== RUN_ITEM_EVENT || event.name !== TOOL_CALLED_EVENT) {
      return;
    }
    const raw = StreamEventMapper.at(event.item, RAW_ITEM_KEY);
    const tool = StreamEventMapper.toolNameOf(raw);

    emitter.toolCalled(tool, StreamEventMapper.summaryOf(tool, raw));
  }

  private static toolNameOf(raw: Record<string, unknown> | null): string {
    const name = raw === null ? undefined : raw[TOOL_NAME_KEY];

    return typeof name === 'string' && name !== '' ? name : UNKNOWN_TOOL_NAME;
  }

  // run_command is the one tool whose name alone says nothing about what it is about to do, so the
  // command is shown with it. The emitter caps the length; an argument list the model malformed is
  // worth no line at all, and never an exception on the event path of a running stream.
  private static summaryOf(tool: string, raw: Record<string, unknown> | null): string {
    if (tool !== FileToolName.RunCommand || raw === null) {
      return NO_SUMMARY;
    }
    const command = StreamEventMapper.argumentsOf(raw)?.[COMMAND_ARGUMENT];

    return typeof command === 'string' ? command.trim() : NO_SUMMARY;
  }

  // The SDK carries the arguments of a function call as the JSON string the model produced, and
  // hands an already-parsed object in some shapes, so both are read.
  private static argumentsOf(raw: Record<string, unknown>): Record<string, unknown> | null {
    const args = raw[TOOL_ARGUMENTS_KEY];
    if (typeof args !== 'string') {
      return StreamEventMapper.at(raw, TOOL_ARGUMENTS_KEY);
    }
    try {
      const parsed: unknown = JSON.parse(args);

      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
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
