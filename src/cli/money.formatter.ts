const USD_FRACTION_DIGITS = 4;
const SMALL_FRACTION_DIGITS = 6;
const SMALL_AMOUNT = 0.0001;
const NO_MONEY = 0;

// Money is stored as Decimal and only turned into a number here, at the edge, for display.
export class MoneyFormatter {
  static usd(value: number): string {
    if (value === NO_MONEY) {
      return '$0';
    }
    const digits = Math.abs(value) < SMALL_AMOUNT ? SMALL_FRACTION_DIGITS : USD_FRACTION_DIGITS;

    return `$${value.toFixed(digits)}`;
  }
}
