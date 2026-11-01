import { Inject, Injectable } from '@nestjs/common';
import { ModelPriceRepository } from '../repositories/model-price.repository';
import { MODEL_PRICE_SEED } from './model-price.constants';

const EMPTY = 0;

// The seed runs on an empty price table, so a fresh database can price a run right away.
@Injectable()
export class ModelPriceSeeder {
  constructor(@Inject(ModelPriceRepository) private readonly prices: ModelPriceRepository) {}

  async seed(): Promise<number> {
    for (const price of MODEL_PRICE_SEED) {
      await this.prices.upsert(price);
    }
    return MODEL_PRICE_SEED.length;
  }

  async seedWhenEmpty(): Promise<number> {
    return (await this.prices.count()) === EMPTY ? this.seed() : EMPTY;
  }
}
