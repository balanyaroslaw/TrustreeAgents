import type { FileToolName } from '../../workspace/enums/file-tool-name.enum';
import type { OrchestratorTask } from './orchestrator-task.enum';

export interface OrchestratorTaskDefinition {
  readonly task: OrchestratorTask;
  readonly purpose: string;
  readonly inputSummary: string;
  readonly steps: readonly string[];
  readonly rules: readonly string[];
  readonly outputFormat: readonly string[];
  readonly tools: readonly FileToolName[];
  readonly maxTurns: number;
}
