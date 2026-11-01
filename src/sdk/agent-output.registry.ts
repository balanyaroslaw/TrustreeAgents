import type { z } from 'zod';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import { AgentRole } from '../agents/agent-role.enum';
import { qaBriefSchema } from '../agents/context/qa-brief.schema';
import { developerResultSchema } from '../agents/developer/developer-result.schema';
import { stepDecisionSchema } from '../agents/orchestrator/decide/step-decision.schema';
import { OrchestratorTask } from '../agents/orchestrator/orchestrator-task.enum';
import { runPlanSchema } from '../agents/orchestrator/plan/run-plan.schema';
import { runSummarySchema } from '../agents/orchestrator/summarize/run-summary.schema';
import { qaResultSchema } from '../agents/qa/qa-result.schema';
import { reviewResultSchema } from '../agents/reviewer/review-result.schema';

// The one place that says which structured answer each producer must return. The SDK validates
// the model output against it, so a broken answer never reaches the report builders.
export class AgentOutputRegistry {
  private static readonly byRole: Readonly<Record<DefinedAgentRole, z.ZodObject>> = {
    [AgentRole.Developer]: developerResultSchema,
    [AgentRole.Qa]: qaResultSchema,
    [AgentRole.Reviewer]: reviewResultSchema,
  };

  private static readonly byTask: Readonly<Record<OrchestratorTask, z.ZodObject>> = {
    [OrchestratorTask.Plan]: runPlanSchema,
    [OrchestratorTask.Brief]: qaBriefSchema,
    [OrchestratorTask.Decide]: stepDecisionSchema,
    [OrchestratorTask.Summarize]: runSummarySchema,
  };

  static forRole(role: DefinedAgentRole): z.ZodObject {
    return AgentOutputRegistry.byRole[role];
  }

  static forTask(task: OrchestratorTask): z.ZodObject {
    return AgentOutputRegistry.byTask[task];
  }
}
