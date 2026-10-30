import { WorkspaceMessages } from '../workspace.messages';
import {
  MAX_OUTPUT_CHARS,
  OUTPUT_HEAD_CHARS,
  OUTPUT_TAIL_CHARS,
} from '../tools/file-tool.constants';

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\)|[@-Z\\-_])/g;
const LINE_BREAK = '\n';

export class OutputTruncator {
  static truncate(output: string): string {
    const cleaned = output.replace(ANSI_PATTERN, '').trimEnd();
    if (cleaned.length <= MAX_OUTPUT_CHARS) {
      return cleaned;
    }

    const head = cleaned.slice(0, OUTPUT_HEAD_CHARS);
    const tail = cleaned.slice(cleaned.length - OUTPUT_TAIL_CHARS);
    const omitted = cleaned.length - head.length - tail.length;

    return [head, WorkspaceMessages.outputOmitted(omitted), tail].join(LINE_BREAK);
  }
}
