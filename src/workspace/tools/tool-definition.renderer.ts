import type { ParameterDefinition, ToolAlternative, ToolDefinition } from './file-tool.types';

const PART_SEPARATOR = ' ';
const LIST_SEPARATOR = '; ';
const REFUSAL_SEPARATOR = ', ';

export class ToolDefinitionRenderer {
  static description(definition: ToolDefinition): string {
    const parts = [definition.summary];

    if (definition.prerequisites.length > 0) {
      parts.push(`Before using: ${definition.prerequisites.join(LIST_SEPARATOR)}.`);
    }
    if (definition.whenToUse.length > 0) {
      parts.push(`Use it when: ${definition.whenToUse.join(LIST_SEPARATOR)}.`);
    }
    for (const alternative of definition.whenNotToUse) {
      parts.push(ToolDefinitionRenderer.alternative(alternative));
    }
    if (definition.limits.length > 0) {
      parts.push(`Limits: ${definition.limits.join(LIST_SEPARATOR)}.`);
    }
    if (definition.refusals.length > 0) {
      parts.push(`Refuses: ${definition.refusals.join(REFUSAL_SEPARATOR)}.`);
    }
    parts.push(...definition.notes);

    return parts.join(PART_SEPARATOR);
  }

  static parameterHint(definition: ToolDefinition, parameterName: string): string {
    const parameter = definition.parameters[parameterName];
    if (parameter === undefined) {
      throw new Error(
        `tool ${definition.name} has no parameter "${parameterName}" in its definition`,
      );
    }

    return ToolDefinitionRenderer.hint(parameter).join(PART_SEPARATOR);
  }

  private static hint(parameter: ParameterDefinition): string[] {
    const parts = [parameter.description];
    if (parameter.example !== undefined) {
      parts.push(`Example: ${parameter.example}.`);
    }
    if (parameter.defaultValue !== undefined) {
      parts.push(`Default: ${parameter.defaultValue}.`);
    }
    return parts;
  }

  private static alternative(alternative: ToolAlternative): string {
    if (alternative.useInstead === undefined) {
      return `Do NOT use it when ${alternative.situation}.`;
    }
    return `Do NOT use it when ${alternative.situation}: use ${alternative.useInstead} instead.`;
  }
}
