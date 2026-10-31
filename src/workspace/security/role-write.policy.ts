import type { AgentRole } from '../../agents/agent-role.enum';
import { PathPolicy } from './path.policy';
import { ROLE_WRITE_RULES } from './role-write-rules.constants';
import { WritePathRuleKind } from './write-path-rule-kind.enum';
import type { WritePathRule } from './write-path-rule.types';

const LAST_SEGMENT_OFFSET = 1;

export class RoleWritePolicy {
  static check(role: AgentRole, relativePath: string): string | null {
    const scoped = ROLE_WRITE_RULES[role];
    if (scoped === undefined) {
      return null;
    }
    return RoleWritePolicy.matches(scoped.rules, relativePath) ? null : scoped.denialMessage;
  }

  static hasRules(role: AgentRole): boolean {
    return ROLE_WRITE_RULES[role] !== undefined;
  }

  static matches(rules: readonly WritePathRule[], relativePath: string): boolean {
    const segments = PathPolicy.segments(relativePath).map((segment) => segment.toLowerCase());
    if (segments.length === 0) {
      return false;
    }
    const name = segments[segments.length - LAST_SEGMENT_OFFSET];
    const directories = segments.slice(0, segments.length - LAST_SEGMENT_OFFSET);

    return rules.some((rule) => RoleWritePolicy.matchesRule(rule, name, directories));
  }

  private static matchesRule(
    rule: WritePathRule,
    name: string,
    directories: readonly string[],
  ): boolean {
    const value = rule.value.toLowerCase();
    if (rule.kind === WritePathRuleKind.Suffix) {
      return name.endsWith(value);
    }
    if (rule.kind === WritePathRuleKind.Directory) {
      return directories.includes(value);
    }
    return name.startsWith(value);
  }
}
