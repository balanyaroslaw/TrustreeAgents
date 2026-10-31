import { z } from 'zod';
import { CoverageLevel } from './coverage-level.enum';
import {
  DEFECT_SEVERITIES,
  MIN_QA_SENTENCE_CHARACTERS,
  MIN_QA_SUMMARY_CHARACTERS,
} from './qa.constants';

export const qaResultSchema = z.object({
  summary: z
    .string()
    .min(MIN_QA_SUMMARY_CHARACTERS)
    .describe(
      '2-4 sentences: what you verified, whether the Developer notes matched the code, and the ' +
        'overall picture. Example: "Covered both refund criteria with 6 tests against the real ' +
        'database; the notes match the diff except for the currency check, which is missing."',
    ),
  coverage: z
    .array(
      z.object({
        criterion: z.string().describe('The acceptance criterion text, as you received it.'),
        level: z
          .enum(CoverageLevel)
          .describe(
            'covered = fully verified by tests, partial = only part of it is verified, none = ' +
              'not verified at all.',
          ),
        tests: z
          .array(z.string())
          .describe('Names of the tests that check this criterion, as they appear in the test.'),
        note: z
          .string()
          .optional()
          .describe('Why the level is not "covered", or anything important about it.'),
      }),
    )
    .describe('One entry per acceptance criterion, in the order you received them.'),
  fileCoverage: z
    .array(
      z.object({
        path: z.string().describe('Path of a changed SOURCE file, relative to the workspace root.'),
        level: z
          .enum(CoverageLevel)
          .describe('How well the changed code of this file is exercised by tests.'),
        tests: z.array(z.string()).describe('Names of the tests that exercise this file.'),
      }),
    )
    .describe('One entry per changed source file you received under "Changed code".'),
  testFiles: z
    .array(
      z.object({
        path: z.string().describe('Path of the test file you created or changed.'),
        description: z
          .string()
          .min(MIN_QA_SENTENCE_CHARACTERS)
          .describe('One sentence: what this test file covers.'),
      }),
    )
    .describe('Every test file you created or changed.'),
  defects: z
    .array(
      z.object({
        severity: z
          .enum(DEFECT_SEVERITIES)
          .describe(
            'blocker = the feature does not work or data can be corrupted, major = an ' +
              'acceptance criterion is broken, minor = a small wrong behaviour.',
          ),
        title: z.string().describe('Short title of the defect, naming the wrong behaviour.'),
        testName: z.string().optional().describe('Name of the failing test that proves it.'),
        expected: z.string().describe('What should happen, according to the criteria.'),
        actual: z.string().describe('What happens instead, as observed in the test run.'),
        suspectedLocation: z
          .string()
          .optional()
          .describe('File, class or function you suspect, for example "PaymentService.refund".'),
        reproduction: z.string().describe('How to reproduce it: the steps or the test to run.'),
      }),
    )
    .describe('Product bugs in the changed code. Empty if none. Never fix production code.'),
  notTested: z
    .array(
      z.object({
        what: z.string().describe('The behaviour or file you could not test.'),
        reason: z.string().describe('Why it could not be tested.'),
      }),
    )
    .describe(
      'What you could not test and why. A changed source file with coverage level "none" must ' +
        'appear here. Empty if none.',
    ),
  outOfScope: z
    .array(z.string())
    .describe(
      'Problems or risks you noticed in code that was NOT changed in this step. Empty if none.',
    ),
  flakyTests: z
    .array(z.string())
    .describe('Names of tests with unstable results across reruns. Empty if none.'),
  blockedReason: z
    .string()
    .optional()
    .describe(
      'Only if you could not continue, for example the test database is unavailable. Omit ' +
        'otherwise.',
    ),
});
