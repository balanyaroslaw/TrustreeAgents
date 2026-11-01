import { Agent } from '@openai/agents';
import type { FunctionTool } from '@openai/agents';
import { Inject, Injectable } from '@nestjs/common';
import { AGENT_DEFINITIONS } from '../agents/agent-definitions.constants';
import { AgentRole } from '../agents/agent-role.enum';
import { AgentDefinitionRenderer } from '../agents/agent-definition.renderer';
import type { AgentTool } from '../agents/agent-tool.types';
import { OrchestratorTaskRenderer } from '../agents/orchestrator/orchestrator-task.renderer';
import { ORCHESTRATOR_TASKS } from '../agents/orchestrator/orchestrator-tasks.constants';
import { FileToolRegistry } from '../workspace/tools/file-tool.registry';
import { AgentOutputRegistry } from './agent-output.registry';
import { AgentToolAdapter } from './agent-tool.adapter';
import type {
  AgentBuildRequest,
  BuiltAgent,
  OrchestratorBuildRequest,
  SdkAgent,
} from './built-agent.types';
import type { AgentCallContext } from './agent-call.context';
import type { CallEventEmitter } from './call-event.emitter';
import { AGENT_MODEL_SETTINGS, ORCHESTRATOR_AGENT_NAME_SEPARATOR } from './sdk.constants';

// Builds a fresh Agent for every call: the tools carry that call's recorders, so an agent can
// never be reused between calls. Building is cheap, nothing is cached.
@Injectable()
export class AgentFactory {
  constructor(@Inject(FileToolRegistry) private readonly registry: FileToolRegistry) {}

  buildAgent(request: AgentBuildRequest): BuiltAgent {
    const definition = AGENT_DEFINITIONS[request.role];
    const instructions = AgentDefinitionRenderer.instructions(definition);
    const agent = new Agent({
      name: request.role,
      instructions,
      model: request.model,
      modelSettings: AGENT_MODEL_SETTINGS,
      tools: AgentFactory.adapt(
        this.registry.forRole(request.role),
        request.context,
        request.emitter,
      ),
      outputType: AgentOutputRegistry.forRole(request.role),
    });

    return {
      agent: agent as SdkAgent,
      instructions,
      model: request.model,
      maxTurns: request.maxTurns ?? definition.maxTurns,
    };
  }

  buildOrchestrator(request: OrchestratorBuildRequest): BuiltAgent {
    const definition = ORCHESTRATOR_TASKS[request.task];
    const instructions = OrchestratorTaskRenderer.instructions(definition);
    const agent = new Agent({
      name: `Orchestrator${ORCHESTRATOR_AGENT_NAME_SEPARATOR}${request.task}`,
      instructions,
      model: request.model,
      modelSettings: AGENT_MODEL_SETTINGS,
      // A task with an empty tool list gets no tools at all.
      tools: AgentFactory.adapt(
        this.registry.build(definition.tools),
        request.context,
        request.emitter,
      ),
      outputType: AgentOutputRegistry.forTask(request.task),
    });

    return {
      agent: agent as SdkAgent,
      instructions,
      model: request.model,
      maxTurns: request.maxTurns ?? definition.maxTurns,
    };
  }

  // The role every Orchestrator task is recorded under.
  orchestratorRole(): AgentRole {
    return AgentRole.Orchestrator;
  }

  private static adapt(
    tools: readonly AgentTool[],
    context: AgentCallContext,
    emitter: CallEventEmitter | null,
  ): FunctionTool[] {
    return tools.map((tool) => AgentToolAdapter.toSdkTool(tool, context, emitter));
  }
}
