import type { AgentRole } from '../../agents/agent-role.enum';
import type { WritePathRuleKind } from './write-path-rule-kind.enum';

export interface WritePathRule {
  readonly kind: WritePathRuleKind;
  readonly value: string;
}

export interface RoleWriteRules {
  readonly role: AgentRole;
  readonly rules: readonly WritePathRule[];
  readonly denialMessage: string;
}
