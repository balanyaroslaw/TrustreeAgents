import type { AgentDefinition } from './agent-definition.types';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const BULLET = '- ';
const WORKFLOW_HEADER = 'Workflow:';
const RULES_HEADER = 'Rules:';
const FINAL_ANSWER_HEADER = 'Final answer:';
const FIRST_STEP = 1;

export class AgentDefinitionRenderer {
  static instructions(definition: AgentDefinition): string {
    const sections = [`You are the ${definition.role}. ${definition.mission}`];

    if (definition.workflow.length > 0) {
      sections.push(
        AgentDefinitionRenderer.section(
          WORKFLOW_HEADER,
          definition.workflow.map((step, index) => `${index + FIRST_STEP}. ${step}`),
        ),
      );
    }
    if (definition.rules.length > 0) {
      sections.push(AgentDefinitionRenderer.bulleted(RULES_HEADER, definition.rules));
    }
    if (definition.outputFormat.length > 0) {
      sections.push(AgentDefinitionRenderer.bulleted(FINAL_ANSWER_HEADER, definition.outputFormat));
    }

    return sections.join(SECTION_SEPARATOR);
  }

  static toolDescription(definition: AgentDefinition): string {
    return definition.toolDescription;
  }

  private static bulleted(header: string, items: readonly string[]): string {
    return AgentDefinitionRenderer.section(
      header,
      items.map((item) => `${BULLET}${item}`),
    );
  }

  private static section(header: string, lines: readonly string[]): string {
    return [header, ...lines].join(LINE_SEPARATOR);
  }
}
