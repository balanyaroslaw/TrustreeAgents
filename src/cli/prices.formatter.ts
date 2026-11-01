import type { ModelPriceView } from '../db/prices/model-price.types';
import { DateFormatter } from './date.formatter';
import { NO_PRICES_MESSAGE, PRICE_COLUMNS, PRICE_FRACTION_DIGITS } from './prices.constants';
import { TableRenderer } from './table.renderer';

const EMPTY = 0;

export class PricesFormatter {
  static table(prices: readonly ModelPriceView[]): string {
    if (prices.length === EMPTY) {
      return NO_PRICES_MESSAGE;
    }
    const body = prices.map((price) => [
      price.model,
      PricesFormatter.amount(price.inputPerM),
      PricesFormatter.amount(price.cachedInputPerM),
      PricesFormatter.amount(price.outputPerM),
      DateFormatter.short(price.updatedAt),
    ]);

    return TableRenderer.render(PRICE_COLUMNS, body);
  }

  private static amount(value: number): string {
    return `$${value.toFixed(PRICE_FRACTION_DIGITS)}`;
  }
}
