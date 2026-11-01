import type { ModelEnvironment } from '../config/env.types';
import { MODEL_VARIABLE_BY_ROLE } from '../config/env.constants';
import { AgentRole } from './agent-role.enum';
import { DEFAULT_MODEL_BY_ROLE } from './model.constants';

const ENTRY_SEPARATOR = ', ';

// Which model each role runs on, after the environment overrides are applied.
export class AgentsConfig {
  static models(environment: ModelEnvironment): Readonly<Record<AgentRole, string>> {
    const resolved = {} as Record<AgentRole, string>;
    for (const role of Object.values(AgentRole)) {
      const variable = MODEL_VARIABLE_BY_ROLE[role];
      const override = environment[variable as keyof ModelEnvironment];
      resolved[role] = override ?? DEFAULT_MODEL_BY_ROLE[role];
    }
    return resolved;
  }

  static describe(models: Readonly<Record<AgentRole, string>>): string {
    return Object.entries(models)
      .map(([role, model]) => `${role}: ${model}`)
      .join(ENTRY_SEPARATOR);
  }
}
