const BYTES_PER_KILOBYTE = 1024;
const KILOBYTE_FRACTION_DIGITS = 1;

export class ByteSizeFormatter {
  static format(bytes: number): string {
    if (bytes < BYTES_PER_KILOBYTE) {
      return `${bytes} B`;
    }
    return `${(bytes / BYTES_PER_KILOBYTE).toFixed(KILOBYTE_FRACTION_DIGITS)} KB`;
  }
}
