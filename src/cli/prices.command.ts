import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { DatabaseMessages } from '../db/db.messages';
import { ModelPriceRepository } from '../db/repositories/model-price.repository';
import type { ModelPriceInput } from '../db/prices/model-price.types';
import { INVALID_ARGUMENT_EXIT_CODE, INVALID_PRICE_MESSAGE } from './cli.constants';
import type { PricesCommandOptions } from './command-options.types';
import { DatabaseCommand } from './database.command';
import { PricesFormatter } from './prices.formatter';

const NO_PRICE = 0;

@Command({
  name: 'prices',
  description: 'Show the model prices, or set one',
})
export class PricesCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(ModelPriceRepository) private readonly prices: ModelPriceRepository,
  ) {
    super(bootstrap);
  }

  async run(_inputs: string[], options: PricesCommandOptions): Promise<void> {
    const price = PricesCommand.priceOf(options);
    if (options.set !== undefined && price === null) {
      console.error(INVALID_PRICE_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }
    await this.ensureDatabase();

    if (price !== null) {
      await this.prices.upsert(price);
      console.log(DatabaseMessages.priceUpdated(price.model));
    }
    console.log(PricesFormatter.table(await this.prices.all()));
  }

  @Option({
    flags: '--set <model>',
    description: 'set the price of one model, with --input, --cached and --output',
  })
  parseSet(value: string): string {
    return value;
  }

  @Option({
    flags: '--input <usdPerMillion>',
    description: 'price of one million input tokens in USD',
  })
  parseInput(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--cached <usdPerMillion>',
    description: 'price of one million cached input tokens in USD',
  })
  parseCached(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--output <usdPerMillion>',
    description: 'price of one million output tokens in USD',
  })
  parseOutput(value: string): number {
    return Number(value);
  }

  private static priceOf(options: PricesCommandOptions): ModelPriceInput | null {
    const { set, input, cached, output } = options;
    if (set === undefined || set.trim() === '') {
      return null;
    }
    const amounts = [input, cached, output];
    if (amounts.some((amount) => !PricesCommand.isAmount(amount))) {
      return null;
    }

    return {
      model: set.trim(),
      inputPerM: input as number,
      cachedInputPerM: cached as number,
      outputPerM: output as number,
    };
  }

  private static isAmount(value?: number): boolean {
    return value !== undefined && Number.isFinite(value) && value >= NO_PRICE;
  }
}
