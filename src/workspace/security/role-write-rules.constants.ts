import { AgentRole } from '../../agents/agent-role.enum';
import { WritePathRuleKind } from './write-path-rule-kind.enum';
import type { RoleWriteRules, WritePathRule } from './write-path-rule.types';

export const QA_WRITE_RULES: readonly WritePathRule[] = [
  { kind: WritePathRuleKind.Suffix, value: '.spec.ts' },
  { kind: WritePathRuleKind.Suffix, value: '.test.ts' },
  { kind: WritePathRuleKind.Suffix, value: '.e2e-spec.ts' },
  { kind: WritePathRuleKind.Directory, value: 'test' },
  { kind: WritePathRuleKind.Directory, value: 'tests' },
  { kind: WritePathRuleKind.Directory, value: '__tests__' },
  { kind: WritePathRuleKind.Directory, value: 'fixtures' },
  { kind: WritePathRuleKind.NamePrefix, value: 'jest.config.' },
];

export const QA_WRITE_DENIED_MESSAGE =
  'QA can only write test files (*.spec.ts, *.test.ts, *.e2e-spec.ts, files in test/, tests/, ' +
  '__tests__/, fixtures/, jest.config.*). Do not change production code: record the problem as ' +
  'a defect instead';

export const ROLE_WRITE_RULES: Readonly<Partial<Record<AgentRole, RoleWriteRules>>> = {
  [AgentRole.Qa]: {
    role: AgentRole.Qa,
    rules: QA_WRITE_RULES,
    denialMessage: QA_WRITE_DENIED_MESSAGE,
  },
};
