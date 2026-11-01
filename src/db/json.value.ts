import { Prisma } from '@prisma/client';

// The boundary between our objects and jsonb columns. Reports are stored exactly as the report
// builders produced them, so they are passed through untouched.
export class JsonValue {
  static of(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
    if (value === undefined || value === null) {
      return Prisma.DbNull;
    }
    return value as Prisma.InputJsonValue;
  }

  // For a column that is not nullable, where a value is always present.
  static required(value: unknown): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  static strings(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  static object(value: Prisma.JsonValue | null): unknown {
    return value === null ? null : value;
  }
}
