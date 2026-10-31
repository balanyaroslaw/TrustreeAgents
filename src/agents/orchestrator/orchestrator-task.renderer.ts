import type { OrchestratorTaskDefinition } from './orchestrator-task-definition.types';
import {
  FINAL_ANSWER_HEADER,
  INPUT_HEADER,
  ORCHESTRATOR_HEADER,
  ORCHESTRATOR_MISSION,
  RULES_HEADER,
  STEPS_HEADER,
  TASK_HEADER,
} from './orchestrator.constants';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const FIRST_STEP = 1;
const EMPTY = 0;

export class OrchestratorTaskRenderer {
  static instructions(definition: OrchestratorTaskDefinition): string {
    const sections = [
      `${ORCHESTRATOR_HEADER} ${ORCHESTRATOR_MISSION}`,
      [`${TASK_HEADER} ${definition.purpose}`, `${INPUT_HEADER} ${definition.inputSummary}`].join(
        LINE_SEPARATOR,
      ),
    ];

    if (definition.steps.length > EMPTY) {
      sections.push(
        OrchestratorTaskRenderer.section(
          STEPS_HEADER,
          definition.steps.map((step, index) => `${index + FIRST_STEP}. ${step}`),
        ),
      );
    }
    if (definition.rules.length > EMPTY) {
      sections.push(OrchestratorTaskRenderer.bulleted(RULES_HEADER, definition.rules));
    }
    if (definition.outputFormat.length > EMPTY) {
      sections.push(
        OrchestratorTaskRenderer.bulleted(FINAL_ANSWER_HEADER, definition.outputFormat),
      );
    }

    return sections.join(SECTION_SEPARATOR);
  }

  private static bulleted(header: string, items: readonly string[]): string {
    return OrchestratorTaskRenderer.section(
      header,
      items.map((item) => `${BULLET}${item}`),
    );
  }

  private static section(header: string, lines: readonly string[]): string {
    return [header, ...lines].join(LINE_SEPARATOR);
  }
}
