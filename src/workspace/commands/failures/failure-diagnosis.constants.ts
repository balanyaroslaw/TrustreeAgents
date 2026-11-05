import type { FailureRule, NormalisationRule } from './test-failure.types';

// How many causes a summary or a diagnosis shows, and how much of one failure it quotes. These
// bound what every failing test run adds to an agent's input: raising them raises the cost of
// every failing run of every attempt.
export const MAX_FAILURE_GROUPS = 5;
export const MAX_SAMPLE_LINES = 15;
export const MAX_SAMPLE_TESTS = 3;
export const MAX_SUMMARY_CHARS = 1_500;
export const MAX_DIAGNOSIS_CHARS = 4_000;
export const MAX_DIAGNOSIS_GROUPS = 3;
export const MAX_SIGNATURE_CHARACTERS = 200;

// A tool call made this often with the same arguments inside one agent call is a loop, not work.
export const REPEATED_CALL_THRESHOLD = 3;
export const MAX_REPEATED_CALLS_REPORTED = 5;
export const MAX_REPEATED_ARGUMENTS_CHARACTERS = 120;

// When the largest cause covers at least this share of the failures, the summary says so: one
// cause fixed once is a different task from thirty unrelated ones.
export const DOMINANT_CAUSE_SHARE = 0.8;

// Not the workspace's fault and not fixable by editing it: the suite cannot run on this machine
// as it is. Each carries the one thing a person has to do, which is also what the run stops with.
export const HOST_BLOCKING_PATTERNS: readonly FailureRule[] = [
  {
    pattern: /port is already allocated/i,
    advice:
      'a host port the workspace publishes is held by another container. List them with ' +
      '"docker ps", remove the one holding the port with "docker rm -f <name>", and run again',
  },
  {
    pattern: /\bEADDRINUSE\b/,
    advice:
      'a port the suite needs is already in use on this machine. Stop whatever listens on it ' +
      '("docker ps", or "ss -ltnp" for a local process) and run again',
  },
  {
    pattern: /Cannot connect to the Docker daemon/i,
    advice:
      'Docker is not running on this machine, so the suite cannot start its database. Start ' +
      'Docker and run again',
  },
  {
    pattern: /Conflict\. The container name .* is already in use/i,
    advice:
      'a container of an earlier run is still there. Remove it with "docker rm -f <name>" and ' +
      'run again',
  },
];

// Problems outside the code under test: something the run needs is missing, unreachable or
// misconfigured. Editing the tests or the product code cannot fix any of these.
export const ENVIRONMENT_PATTERNS: readonly FailureRule[] = [
  {
    pattern: /\bis required\b/i,
    advice:
      'something the suite requires is not set. Set it where the suite reads it (an env file, ' +
      'the compose file, the test setup) once, and do not change the tests or the product code ' +
      'to work around it',
  },
  {
    pattern: /\bECONNREFUSED\b/,
    advice:
      'the suite cannot reach a service it needs. Start that service, or point the suite at a ' +
      'running one, before running the suite again',
  },
  {
    pattern: /password authentication failed/i,
    advice:
      'the database credentials the suite uses are wrong. Correct them in the configuration the ' +
      'suite reads, not in the tests',
  },
  {
    pattern: /database "[^"]*" does not exist/i,
    advice:
      'the database the suite connects to has not been created. Create it, or run the ' +
      'migrations, before running the suite again',
  },
  {
    pattern: /command not found/i,
    advice:
      'a command the suite needs is not installed. Install it, or use a command this workspace ' +
      'already has, instead of changing the tests',
  },
  {
    pattern: /Cannot find module/i,
    advice:
      'a module cannot be resolved. Install the dependency or fix the import path once: every ' +
      'test that loads it fails for this one reason',
  },
  {
    pattern: /\bENOTFOUND\b/,
    advice:
      'a host name the suite uses cannot be resolved. Point the suite at a reachable host ' +
      'before running it again',
  },
];

export const ASSERTION_PATTERNS: readonly RegExp[] = [
  /\bAssertionError\b/,
  /\bexpected\b/i,
  /\bactual\b/i,
  /\bto (?:equal|be|deepEqual|match)\b/i,
];

// The parts of an error line that differ between two failures of the same cause. They are
// replaced before failures are grouped, so one cause is one group.
export const SIGNATURE_NOISE_PATTERNS: readonly NormalisationRule[] = [
  { pattern: /\(\d+(?:\.\d+)?\s*(?:ms|s|m)\)/g, replacement: '' },
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    replacement: '<id>',
  },
  { pattern: /\b[0-9a-f]{8,}\b/gi, replacement: '<id>' },
  { pattern: /(?:\/[\w.@+-]+)+\/?/g, replacement: '<path>' },
  { pattern: /\d+/g, replacement: '<n>' },
  { pattern: /\s+/g, replacement: ' ' },
];

// The leading error class of a line, dropped from the signature so the cause reads as a
// sentence: "AssertionError [ERR_ASSERTION]: ..." and "Error: ..." both become the cause itself.
export const ERROR_CLASS_PREFIX_PATTERN =
  /^(?:[A-Z][\w.]*)?(?:Error|Exception)(?:\s*\[[^\]]+\])?:\s*/;

// node --test, in its spec reporter and in TAP: a failing test line, the block that repeats them
// at the end, and the counters the runner prints for the whole run.
export const NODE_FAILURE_LINE_PATTERN = /^\s*(?:✖|not ok \d+ -)\s+(.*)$/;
export const NODE_FAILING_TESTS_HEADER = 'failing tests:';
export const NODE_TESTS_COUNT_PATTERN = /^\s*(?:ℹ|#)\s*tests\s+(\d+)\s*$/;
export const NODE_FAIL_COUNT_PATTERN = /^\s*(?:ℹ|#)\s*fail\s+(\d+)\s*$/;
export const NODE_ENTRY_END_PATTERN = /^\s*(?:✔|✖|ℹ|ok \d+|not ok \d+|#)/;
export const TEST_DURATION_SUFFIX_PATTERN = /\s*\(\d+(?:\.\d+)?\s*(?:ms|s|m)\)\s*$/;

// The first line of a failure that names its cause. The generic fallback groups by exactly these
// openings, which is why they are one list used by both parsers.
export const ERROR_LINE_PATTERN =
  /^\s*(?:(?:[A-Z][\w.]*)?(?:Error|Exception)(?:\s*\[[^\]]+\])?:|Cannot\b|error:)/;
export const STACK_LINE_PATTERN = /^\s*at\s+/;
