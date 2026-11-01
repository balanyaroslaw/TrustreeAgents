import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { COST_SCALE } from '../prices/model-price.constants';
import type { ModelPriceInput, ModelPriceRow, ModelPriceView } from '../prices/model-price.types';
import { PrismaService } from '../prisma.service';

const NO_ROWS = 0;

@Injectable()
export class ModelPriceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async count(): Promise<number> {
    return this.prisma.modelPrice.count();
  }

  async all(): Promise<ModelPriceView[]> {
    const rows = await this.prisma.modelPrice.findMany({ orderBy: { model: 'asc' } });

    return rows.map((row) => ({
      model: row.model,
      inputPerM: row.inputPerM.toNumber(),
      cachedInputPerM: row.cachedInputPerM.toNumber(),
      outputPerM: row.outputPerM.toNumber(),
      updatedAt: row.updatedAt,
    }));
  }

  // The exact prices the CostCalculator works with, by model.
  async byModels(models: readonly string[]): Promise<Map<string, ModelPriceRow>> {
    if (models.length === NO_ROWS) {
      return new Map();
    }
    const rows = await this.prisma.modelPrice.findMany({
      where: { model: { in: [...new Set(models)] } },
    });

    return new Map(rows.map((row) => [row.model, row]));
  }

  async missing(models: readonly string[]): Promise<string[]> {
    const known = await this.byModels(models);

    return [...new Set(models)].filter((model) => !known.has(model)).sort();
  }

  async upsert(price: ModelPriceInput): Promise<void> {
    const values = {
      inputPerM: ModelPriceRepository.decimal(price.inputPerM),
      cachedInputPerM: ModelPriceRepository.decimal(price.cachedInputPerM),
      outputPerM: ModelPriceRepository.decimal(price.outputPerM),
    };
    await this.prisma.modelPrice.upsert({
      where: { model: price.model },
      create: { model: price.model, ...values },
      update: values,
    });
  }

  private static decimal(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value).toDecimalPlaces(COST_SCALE);
  }
}
