import { tool } from '@openai/agents';
import type { FunctionTool } from '@openai/agents';
import type { AgentTool } from '../agents/agent-tool.types';
import { ErrorInspector } from '../workspace/utils/error.inspector';
import type { AgentCallContext } from './agent-call.context';
import type { CallEventEmitter } from './call-event.emitter';
import { INTERNAL_TOOL_FAILURE_PREFIX } from './sdk.constants';

// Wraps one of our tools as an SDK tool. The name, the description and the parameter schema are
// the ones the tools already publish, and the string the tool returns is passed through
// unchanged.
//
// requiresApproval is deliberately not mapped to the SDK approval mechanism here: run_command
// asks its own ApprovalGate, and delete_file keeps its flag for the later interactive flow.
export class AgentToolAdapter {
  static toSdkTool(
    agentTool: AgentTool,
    context: AgentCallContext,
    emitter: CallEventEmitter | null,
  ): FunctionTool {
    return tool({
      name: agentTool.name,
      description: agentTool.description,
      parameters: agentTool.schema as never,
      // Our tools never throw: they return "Error: ..." with a hint. An unexpected exception is
      // caught here and handed to the model as text, so one bad call cannot lose the run.
      execute: async (input: unknown): Promise<string> => {
        context.countToolCall();
        emitter?.toolCalled(agentTool.name, AgentToolAdapter.summaryOf(input));
        try {
          return await agentTool.execute(input);
        } catch (error) {
          return `${INTERNAL_TOOL_FAILURE_PREFIX}${ErrorInspector.message(error)}`;
        }
      },
    }) as FunctionTool;
  }

  private static summaryOf(input: unknown): string {
    if (typeof input !== 'object' || input === null) {
      return '';
    }
    const values = Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([name, value]) => `${name}=${String(value)}`);

    return values.join(' ');
  }
}
