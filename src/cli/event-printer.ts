import { AgentEventKind } from '../events/agent-event-kind.enum';
import type { AgentEvent, AgentEventListener } from '../events/agent-event.types';
import { CompactNumberFormatter } from '../agents/utils/compact-number.formatter';
import { DurationFormatter } from '../agents/utils/duration.formatter';
import {
  EVENT_PREFIX,
  FAILED_LABEL,
  FINISHED_LABEL,
  STARTED_LABEL,
  TOKENS_LABEL,
  TOOL_LABEL,
} from './event-printer.constants';

const FIELD_SEPARATOR = ' | ';

// Prints what the agents are doing while they work: status only, never generated text.
export class EventPrinter implements AgentEventListener {
  onEvent(event: AgentEvent): void {
    const line = EventPrinter.lineOf(event);
    if (line !== null) {
      console.log(`${EVENT_PREFIX}${line}`);
    }
  }

  private static lineOf(event: AgentEvent): string | null {
    if (event.kind === AgentEventKind.AgentStarted) {
      return `${EventPrinter.who(event.origin.role, event.origin.task)} ${STARTED_LABEL}`;
    }
    if (event.kind === AgentEventKind.ToolCalled) {
      const summary = event.summary === '' ? '' : ` ${event.summary}`;
      return `${TOOL_LABEL} ${event.tool}${summary}`;
    }
    if (event.kind === AgentEventKind.TokensUsed) {
      return (
        `${TOKENS_LABEL} ${CompactNumberFormatter.format(event.input)} in ` +
        `(${CompactNumberFormatter.format(event.cachedInput)} cached) / ` +
        `${CompactNumberFormatter.format(event.output)} out`
      );
    }
    if (event.kind === AgentEventKind.AgentFinished) {
      const outcome = event.failure === null ? FINISHED_LABEL : `${FAILED_LABEL} ${event.failure}`;
      return (
        `${EventPrinter.who(event.origin.role, event.origin.task)} ${outcome}` +
        `${FIELD_SEPARATOR}${event.toolCalls} tool calls` +
        `${FIELD_SEPARATOR}${DurationFormatter.format(event.durationMs)}`
      );
    }
    return null;
  }

  private static who(role: string, task: string | null): string {
    return task === null ? role : `${role} (${task})`;
  }
}
