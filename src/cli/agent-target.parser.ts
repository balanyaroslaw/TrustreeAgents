import type { CallTarget } from '../sdk/call-scope.types';
import { AGENT_TARGETS } from './agent-command.constants';

export class AgentTargetParser {
  static parse(value: string): CallTarget | null {
    return AGENT_TARGETS[value.trim().toLowerCase()] ?? null;
  }
}
