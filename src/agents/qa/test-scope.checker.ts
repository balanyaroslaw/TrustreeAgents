import { PathPolicy } from '../../workspace/security/path.policy';
import { AddedLinesReader } from './added-lines.reader';
import { QaReportMessages } from './qa-report.messages';
import {
  END_TO_END_DIRECTORIES,
  IMPORT_SPECIFIER_PATTERN,
  SOURCE_FILE_EXTENSIONS,
  TEST_NAME_SUFFIXES,
} from './qa.constants';

const LAST_SEGMENT_OFFSET = 1;
const SPECIFIER_GROUP_INDEX = 1;
const FIRST_SEGMENT = 0;
const LINE_SEPARATOR = '\n';
const NAME_PART_SEPARATOR = '.';

// Heuristic: a test is assumed to cover the changed code when its name stem matches a changed
// source file or when it imports one. End-to-end tests are never flagged, because they go through
// the application and name no module. A warning therefore means "worth a look", not "wrong".
export class TestScopeChecker {
  static check(
    testPaths: readonly string[],
    changedSourcePaths: readonly string[],
    testFileDiff: string,
  ): string[] {
    const sourceStems = changedSourcePaths.map(TestScopeChecker.stemOf);
    const addedLines = AddedLinesReader.read(testFileDiff);

    return testPaths
      .filter((path) => !TestScopeChecker.coversChangedCode(path, sourceStems, addedLines))
      .map((path) => QaReportMessages.testOutOfScope(path));
  }

  private static coversChangedCode(
    testPath: string,
    sourceStems: readonly string[],
    addedLines: ReadonlyMap<string, readonly string[]>,
  ): boolean {
    if (TestScopeChecker.isEndToEnd(testPath)) {
      return true;
    }
    if (TestScopeChecker.isKnownStem(TestScopeChecker.stemOf(testPath), sourceStems)) {
      return true;
    }
    return TestScopeChecker.importsChangedCode(addedLines.get(testPath) ?? [], sourceStems);
  }

  private static importsChangedCode(
    lines: readonly string[],
    sourceStems: readonly string[],
  ): boolean {
    const pattern = new RegExp(IMPORT_SPECIFIER_PATTERN);
    const text = lines.join(LINE_SEPARATOR);

    for (;;) {
      const match = pattern.exec(text);
      if (match === null) {
        return false;
      }
      const stem = TestScopeChecker.stemOf(match[SPECIFIER_GROUP_INDEX]);
      if (TestScopeChecker.isKnownStem(stem, sourceStems)) {
        return true;
      }
    }
  }

  // "payment.service" also counts as a match for "payment.service.spec" or "payment".
  private static isKnownStem(stem: string, sourceStems: readonly string[]): boolean {
    return sourceStems.some(
      (candidate) =>
        candidate === stem ||
        candidate.startsWith(`${stem}${NAME_PART_SEPARATOR}`) ||
        stem.startsWith(`${candidate}${NAME_PART_SEPARATOR}`),
    );
  }

  private static isEndToEnd(relativePath: string): boolean {
    const segments = PathPolicy.segments(relativePath).map((segment) => segment.toLowerCase());
    return segments
      .slice(FIRST_SEGMENT, segments.length - LAST_SEGMENT_OFFSET)
      .some((segment) => END_TO_END_DIRECTORIES.includes(segment));
  }

  private static stemOf(path: string): string {
    const segments = PathPolicy.segments(path);
    const name = segments[segments.length - LAST_SEGMENT_OFFSET] ?? path;
    const withoutExtension = TestScopeChecker.withoutSourceExtension(name);
    const stem = TEST_NAME_SUFFIXES.reduce(
      (current, suffix) => (current.endsWith(suffix) ? current.slice(0, -suffix.length) : current),
      withoutExtension,
    );
    return stem.toLowerCase();
  }

  private static withoutSourceExtension(name: string): string {
    const extension = SOURCE_FILE_EXTENSIONS.find((candidate) => name.endsWith(candidate));
    return extension === undefined ? name : name.slice(FIRST_SEGMENT, -extension.length);
  }
}
