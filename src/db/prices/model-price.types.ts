import type { Prisma } from '@prisma/client';

// The exact price as it is stored: Decimal, never float.
export interface ModelPriceRow {
  readonly model: string;
  readonly inputPerM: Prisma.Decimal;
  readonly cachedInputPerM: Prisma.Decimal;
  readonly outputPerM: Prisma.Decimal;
}

// The same price converted for display at the edge.
export interface ModelPriceView {
  readonly model: string;
  readonly inputPerM: number;
  readonly cachedInputPerM: number;
  readonly outputPerM: number;
  readonly updatedAt: Date;
}

export interface ModelPriceInput {
  readonly model: string;
  readonly inputPerM: number;
  readonly cachedInputPerM: number;
  readonly outputPerM: number;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
}

export interface CostResult {
  readonly costUsd: Prisma.Decimal;
  readonly priceKnown: boolean;
}
