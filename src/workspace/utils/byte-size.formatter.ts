const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = 1024 * 1024;
const FRACTION_DIGITS = 1;

export class ByteSizeFormatter {
  static format(bytes: number): string {
    if (bytes < BYTES_PER_KILOBYTE) {
      return `${bytes} B`;
    }
    if (bytes < BYTES_PER_MEGABYTE) {
      return `${(bytes / BYTES_PER_KILOBYTE).toFixed(FRACTION_DIGITS)} KB`;
    }
    return `${(bytes / BYTES_PER_MEGABYTE).toFixed(FRACTION_DIGITS)} MB`;
  }
}
