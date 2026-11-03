import { IssueSeverity } from '../common/issue-severity.enum';

export const QA_MAX_TURNS = 22;
// The hard limits of one QA step, told to QA and counted by it. They exist because a failure it
// cannot classify used to turn into an edit-and-rerun loop that spent the whole run budget: at
// the limit QA stops and reports what is left as defects.
export const QA_MAX_FULL_SUITE_RUNS = 4;
export const QA_MAX_TEST_FIX_ATTEMPTS = 3;
export const QA_FLAKY_RERUNS = 3;
export const QA_MAX_LISTED_FILES = 30;

export const MIN_QA_SUMMARY_CHARACTERS = 40;
export const MIN_QA_SENTENCE_CHARACTERS = 10;

export const DEFECT_SEVERITIES = [
  IssueSeverity.Blocker,
  IssueSeverity.Major,
  IssueSeverity.Minor,
] as const;

export const SEVERE_DEFECT_SEVERITIES: readonly IssueSeverity[] = [
  IssueSeverity.Blocker,
  IssueSeverity.Major,
];

export const SOURCE_FILE_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

export const GENERATED_DIRECTORIES: readonly string[] = ['dist', 'build', 'coverage'];
export const END_TO_END_DIRECTORIES: readonly string[] = ['test', 'tests'];

export const TEST_NAME_SUFFIXES: readonly string[] = ['.spec', '.test', '.e2e-spec'];

export const SUSPICIOUS_TEST_MARKERS: readonly string[] = [
  '.skip(',
  '.only(',
  'xit(',
  'xdescribe(',
  'xtest(',
  'it.todo(',
];

// How much of a criterion a notTested entry must name before it counts as referring to it: a
// two-word "what" would otherwise justify every criterion in the step.
export const MIN_CRITERION_REFERENCE_CHARACTERS = 12;

export const WHITESPACE_PATTERN = /\s+/g;

export const DIFF_FILE_HEADER_PATTERN = /^diff --git a\/(?:.+) b\/(.+)$/;
export const ADDED_LINE_PREFIX = '+';
export const ADDED_FILE_HEADER_PREFIX = '+++';
export const IMPORT_SPECIFIER_PATTERN = /(?:from|require\()\s*['"]([^'"]+)['"]/g;
