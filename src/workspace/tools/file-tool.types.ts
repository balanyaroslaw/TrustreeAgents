import type { FileToolName } from '../enums/file-tool-name.enum';

export interface ParameterDefinition {
  readonly description: string;
  readonly example?: string;
  readonly defaultValue?: string;
}

export interface ToolAlternative {
  readonly situation: string;
  readonly useInstead?: FileToolName;
}

export interface ToolDefinition {
  readonly name: FileToolName;
  readonly summary: string;
  readonly prerequisites: readonly string[];
  readonly whenToUse: readonly string[];
  readonly whenNotToUse: readonly ToolAlternative[];
  readonly limits: readonly string[];
  readonly refusals: readonly string[];
  readonly notes: readonly string[];
  readonly requiresApproval: boolean;
  readonly mutatesWorkspace: boolean;
  readonly parameters: Readonly<Record<string, ParameterDefinition>>;
}
