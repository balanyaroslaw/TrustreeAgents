// Seeds the model prices. Run with: npm run db:seed
// The prices are placeholders taken on 2026-10-31.
// VERIFY against https://developers.openai.com/api/docs/pricing
import { Prisma, PrismaClient } from '@prisma/client';
import { COST_SCALE, MODEL_PRICE_SEED } from '../src/db/prices/model-price.constants';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  for (const price of MODEL_PRICE_SEED) {
    const values = {
      inputPerM: new Prisma.Decimal(price.inputPerM).toDecimalPlaces(COST_SCALE),
      cachedInputPerM: new Prisma.Decimal(price.cachedInputPerM).toDecimalPlaces(COST_SCALE),
      outputPerM: new Prisma.Decimal(price.outputPerM).toDecimalPlaces(COST_SCALE),
    };
    await prisma.modelPrice.upsert({
      where: { model: price.model },
      create: { model: price.model, ...values },
      update: values,
    });
    console.log(`seeded price for ${price.model}`);
  }
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
