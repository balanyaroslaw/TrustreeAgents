export const MAX_OUTPUT_TAIL_CHARACTERS = 3_000;

export const NPM_EXECUTABLE = 'npm';
export const NPX_EXECUTABLE = 'npx';
export const NPM_TEST_SUBCOMMAND = 'test';
export const NPM_RUN_SUBCOMMAND = 'run';
export const NPM_TEST_SCRIPT_PATTERN = /^test(:.+)?$/;
export const TEST_RUNNERS: readonly string[] = ['jest'];
export const ARGUMENT_SEPARATOR = '--';
export const FLAG_PREFIX = '-';

export const TEST_FILTER_FLAGS: readonly string[] = [
  '-t',
  '--testNamePattern',
  '--testPathPattern',
  '--testPathPatterns',
  '--findRelatedTests',
  '--onlyChanged',
  '-o',
];

export const JEST_SUMMARY_LINE_PATTERN = /^[^\S\n]*Tests:[^\S\n]*(.+)$/gm;
export const JEST_TOTAL_PATTERN = /(\d+)\s+total/;
export const JEST_PASSED_PATTERN = /(\d+)\s+passed/;
export const JEST_FAILED_PATTERN = /(\d+)\s+failed/;
export const JEST_SKIPPED_PATTERN = /(\d+)\s+skipped/;
