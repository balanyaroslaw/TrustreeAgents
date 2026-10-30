const THOUSAND = 1_000;
const MILLION = 1_000_000;
const FRACTION_DIGITS = 1;

export class CompactNumberFormatter {
  static format(value: number): string {
    if (value < THOUSAND) {
      return String(value);
    }
    if (value < MILLION) {
      return `${CompactNumberFormatter.scaled(value, THOUSAND)}k`;
    }
    return `${CompactNumberFormatter.scaled(value, MILLION)}M`;
  }

  private static scaled(value: number, unit: number): string {
    return (value / unit).toFixed(FRACTION_DIGITS);
  }
}
