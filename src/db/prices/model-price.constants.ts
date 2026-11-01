import type { ModelPriceInput } from './model-price.types';

export const COST_SCALE = 6;
export const TOKENS_PER_MILLION = 1_000_000;

// Placeholder prices in USD per million tokens, taken on 2026-10-31.
// VERIFY against https://developers.openai.com/api/docs/pricing
// They can be corrected without a migration: team prices --set <model> --input <n> --cached <n> --output <n>
export const MODEL_PRICE_SEED: readonly ModelPriceInput[] = [
  { model: 'gpt-5', inputPerM: 1.25, cachedInputPerM: 0.125, outputPerM: 10 },
  { model: 'gpt-5-mini', inputPerM: 0.25, cachedInputPerM: 0.025, outputPerM: 2 },
  { model: 'gpt-5-nano', inputPerM: 0.05, cachedInputPerM: 0.005, outputPerM: 0.4 },
];
