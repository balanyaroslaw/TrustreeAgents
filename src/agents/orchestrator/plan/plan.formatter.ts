import {
  PLAN_ASSUMPTIONS_TITLE,
  PLAN_CHECKBOX,
  PLAN_GENERATED_LABEL,
  PLAN_TITLE,
} from './plan-input.constants';
import type { RunPlan, RunPlanStep } from './run-plan.types';

const LINE_SEPARATOR = '\n';
const SECTION_SEPARATOR = '\n\n';
const BULLET = '- ';
const STEP_INDENT = '  ';
const CRITERION_INDENT = '    ';
const FIRST_ITEM = 1;
const EMPTY = 0;

export class PlanFormatter {
  static terminal(plan: RunPlan): string {
    if (plan.clarifyingQuestions.length > EMPTY) {
      return [
        'Questions before planning:',
        ...plan.clarifyingQuestions.map(
          (question, index) => `${STEP_INDENT}${index + FIRST_ITEM}. ${question}`,
        ),
      ].join(LINE_SEPARATOR);
    }

    const lines = [`Plan (${plan.steps.length} steps): ${plan.summary}`];

    plan.steps.forEach((step, index) => {
      lines.push(`Step ${index + FIRST_ITEM}: ${step.title}`);
      lines.push(`${STEP_INDENT}${step.description}`);
      lines.push(
        ...step.acceptanceCriteria.map((criterion) => `${CRITERION_INDENT}${BULLET}${criterion}`),
      );
    });
    if (plan.assumptions.length > EMPTY) {
      lines.push('Assumptions:');
      lines.push(...plan.assumptions.map((assumption) => `${STEP_INDENT}${BULLET}${assumption}`));
    }

    return lines.join(LINE_SEPARATOR);
  }

  static markdown(plan: RunPlan, generatedAt: Date): string {
    const sections = [PLAN_TITLE, plan.summary];

    plan.steps.forEach((step, index) => {
      sections.push(PlanFormatter.markdownStep(step, index + FIRST_ITEM));
    });
    if (plan.assumptions.length > EMPTY) {
      sections.push(
        [
          PLAN_ASSUMPTIONS_TITLE,
          '',
          ...plan.assumptions.map((assumption) => `${BULLET}${assumption}`),
        ].join(LINE_SEPARATOR),
      );
    }
    sections.push(`_${PLAN_GENERATED_LABEL} ${PlanFormatter.day(generatedAt)}_`);

    return sections.join(SECTION_SEPARATOR) + LINE_SEPARATOR;
  }

  private static markdownStep(step: RunPlanStep, position: number): string {
    return [
      `## ${position}. ${step.title}`,
      '',
      step.description,
      '',
      ...step.acceptanceCriteria.map((criterion) => `${PLAN_CHECKBOX}${criterion}`),
    ].join(LINE_SEPARATOR);
  }

  private static day(generatedAt: Date): string {
    return generatedAt.toISOString().split('T')[EMPTY];
  }
}
