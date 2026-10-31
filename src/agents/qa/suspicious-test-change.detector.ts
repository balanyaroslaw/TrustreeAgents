import { AddedLinesReader } from './added-lines.reader';
import { QaReportMessages } from './qa-report.messages';
import { SUSPICIOUS_TEST_MARKERS } from './qa.constants';

export class SuspiciousTestChangeDetector {
  static detect(testFileDiff: string): string[] {
    const warnings: string[] = [];

    for (const [path, lines] of AddedLinesReader.read(testFileDiff)) {
      for (const line of lines) {
        const marker = SUSPICIOUS_TEST_MARKERS.find((candidate) => line.includes(candidate));
        if (marker !== undefined) {
          warnings.push(QaReportMessages.suspiciousTestChange(path, marker, line.trim()));
        }
      }
    }

    return warnings;
  }
}
