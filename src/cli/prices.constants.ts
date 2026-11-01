import type { TableColumn } from './table.types';

export const PRICE_COLUMNS: readonly TableColumn[] = [
  { header: 'MODEL' },
  { header: 'INPUT / 1M', numeric: true },
  { header: 'CACHED / 1M', numeric: true },
  { header: 'OUTPUT / 1M', numeric: true },
  { header: 'UPDATED' },
];

export const NO_PRICES_MESSAGE = 'no prices are set. Run: npm run db:seed';
export const PRICE_FRACTION_DIGITS = 3;
