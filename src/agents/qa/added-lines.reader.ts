import {
  ADDED_FILE_HEADER_PREFIX,
  ADDED_LINE_PREFIX,
  DIFF_FILE_HEADER_PATTERN,
} from './qa.constants';

const LINE_SEPARATOR = '\n';
const PATH_GROUP_INDEX = 1;

// Reads a unified diff and returns, per file, the lines the diff adds (without the leading "+").
export class AddedLinesReader {
  static read(diffText: string): Map<string, string[]> {
    const added = new Map<string, string[]>();
    let path: string | null = null;

    for (const line of diffText.split(LINE_SEPARATOR)) {
      const header = DIFF_FILE_HEADER_PATTERN.exec(line);
      if (header !== null) {
        path = header[PATH_GROUP_INDEX];
        added.set(path, []);
        continue;
      }
      if (path === null || !AddedLinesReader.isAddedLine(line)) {
        continue;
      }
      added.get(path)?.push(line.slice(ADDED_LINE_PREFIX.length));
    }

    return added;
  }

  private static isAddedLine(line: string): boolean {
    return line.startsWith(ADDED_LINE_PREFIX) && !line.startsWith(ADDED_FILE_HEADER_PREFIX);
  }
}
