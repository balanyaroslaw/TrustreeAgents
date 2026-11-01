import { Prisma } from '@prisma/client';
import { COST_SCALE, TOKENS_PER_MILLION } from './model-price.constants';
import type { CostResult, ModelPriceRow, TokenUsage } from './model-price.types';

const ZERO = new Prisma.Decimal(0);
const PER_MILLION = new Prisma.Decimal(TOKENS_PER_MILLION);

// The one place a cost is computed. Cached input tokens are a subset of the input tokens, so they
// are charged at the cached rate and subtracted from the uncached ones. An unknown model costs 0
// and is reported as unknown instead of failing the run.
export class CostCalculator {
  static calculate(usage: TokenUsage, price: ModelPriceRow | null): CostResult {
    if (price === null) {
      return { costUsd: ZERO, priceKnown: false };
    }
    const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
    const uncached = usage.inputTokens - cached;
    const cost = new Prisma.Decimal(uncached)
      .mul(price.inputPerM)
      .add(new Prisma.Decimal(cached).mul(price.cachedInputPerM))
      .add(new Prisma.Decimal(usage.outputTokens).mul(price.outputPerM))
      .div(PER_MILLION);

    return { costUsd: cost.toDecimalPlaces(COST_SCALE), priceKnown: true };
  }
}
