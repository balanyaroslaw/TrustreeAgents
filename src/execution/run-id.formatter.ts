import {
  REPORT_DIRECTORY_NAME,
  REPORT_FILE_EXTENSION,
  REPORT_FILE_PREFIX,
  RUN_BRANCH_PREFIX,
  SHORT_RUN_ID_LENGTH,
} from './execution.constants';

const PATH_SEPARATOR = '/';
const START = 0;

export class RunIdFormatter {
  static short(runId: string): string {
    return runId.slice(START, SHORT_RUN_ID_LENGTH);
  }

  static branch(runId: string): string {
    return `${RUN_BRANCH_PREFIX}${RunIdFormatter.short(runId)}`;
  }

  static reportPath(runId: string): string {
    return [
      REPORT_DIRECTORY_NAME,
      `${REPORT_FILE_PREFIX}${RunIdFormatter.short(runId)}${REPORT_FILE_EXTENSION}`,
    ].join(PATH_SEPARATOR);
  }
}
