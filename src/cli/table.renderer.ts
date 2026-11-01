import { TABLE_COLUMN_GAP, TABLE_RULE_CHARACTER } from './cli.constants';
import type { TableColumn } from './table.types';

const LINE_SEPARATOR = '\n';
const EMPTY_CELL = '';

// One plain-text table for every command, so the output of usage, history and prices reads the
// same in a terminal and in a copied report.
export class TableRenderer {
  static render(columns: readonly TableColumn[], rows: readonly (readonly string[])[]): string {
    const widths = columns.map((column, index) =>
      Math.max(column.header.length, ...rows.map((row) => (row[index] ?? EMPTY_CELL).length)),
    );
    const lines = [
      TableRenderer.line(
        columns.map((column) => column.header),
        columns,
        widths,
      ),
      columns
        .map((_column, index) => TABLE_RULE_CHARACTER.repeat(widths[index]))
        .join(TABLE_COLUMN_GAP),
      ...rows.map((row) => TableRenderer.line(row, columns, widths)),
    ];

    return lines.join(LINE_SEPARATOR);
  }

  private static line(
    cells: readonly string[],
    columns: readonly TableColumn[],
    widths: readonly number[],
  ): string {
    return columns
      .map((column, index) => {
        const cell = cells[index] ?? EMPTY_CELL;
        return column.numeric === true ? cell.padStart(widths[index]) : cell.padEnd(widths[index]);
      })
      .join(TABLE_COLUMN_GAP)
      .trimEnd();
  }
}
