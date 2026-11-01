const NAME_SEPARATOR = ', ';
const SINGLE = 1;

export class DatabaseMessages {
  static unknownPrice(model: string): string {
    return `price for model ${model} is unknown: run "team prices --set ${model} --input <n> --cached <n> --output <n>"`;
  }

  static writeFailed(operation: string, reason: string): string {
    return `the database write "${operation}" failed and was skipped: ${reason}`;
  }

  static missingPrices(models: readonly string[]): string {
    const subject = models.length === SINGLE ? 'that model' : 'those models';
    return (
      `no price is set for ${models.join(NAME_SEPARATOR)}: the calls of ${subject} count as $0. ` +
      'Set it with "team prices --set <model> --input <n> --cached <n> --output <n>"'
    );
  }

  static runNotFound(runId: string): string {
    return `no run found with id ${runId}`;
  }

  static noRuns(): string {
    return 'no runs recorded yet. Start one with "team run \\"<prompt>\\""';
  }

  static pruned(runs: number): string {
    const belonging = runs === SINGLE ? 'run with its' : 'runs with their';
    return `deleted ${runs} ${belonging} steps, attempts and calls`;
  }

  static nothingToPrune(): string {
    return 'no run matched, nothing was deleted';
  }

  static priceUpdated(model: string): string {
    return `price for ${model} updated`;
  }
}
