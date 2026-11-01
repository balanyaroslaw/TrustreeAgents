import { Inject } from '@nestjs/common';
import { Command, Option } from 'nest-commander';
import { DatabaseBootstrap } from '../db/database.bootstrap';
import { DatabaseMessages } from '../db/db.messages';
import { AgentCallRepository } from '../db/repositories/agent-call.repository';
import { ModelPriceRepository } from '../db/repositories/model-price.repository';
import { RunRepository } from '../db/repositories/run.repository';
import type { RunDetail } from '../db/repositories/run.repository.types';
import type {
  StepUsageRow,
  UsageRow,
  UsageTotals,
} from '../db/repositories/agent-call.repository.types';
import { RunIdFormatter } from '../execution/run-id.formatter';
import { INVALID_ARGUMENT_EXIT_CODE, INVALID_DIMENSION_MESSAGE } from './cli.constants';
import type { UsageCommandOptions } from './command-options.types';
import { DatabaseCommand } from './database.command';
import { UsageDimension } from './usage-dimension.enum';
import { UsageFormatter } from './usage.formatter';

const JSON_INDENT = 2;

@Command({
  name: 'usage',
  description: 'Show token and cost usage of a run',
})
export class UsageCommand extends DatabaseCommand {
  constructor(
    @Inject(DatabaseBootstrap) bootstrap: DatabaseBootstrap,
    @Inject(RunRepository) private readonly runs: RunRepository,
    @Inject(AgentCallRepository) private readonly calls: AgentCallRepository,
    @Inject(ModelPriceRepository) private readonly prices: ModelPriceRepository,
  ) {
    super(bootstrap);
  }

  async run(_inputs: string[], options: UsageCommandOptions): Promise<void> {
    const dimension = UsageCommand.dimensionOf(options.by);
    if (dimension === null) {
      console.error(INVALID_DIMENSION_MESSAGE);
      process.exit(INVALID_ARGUMENT_EXIT_CODE);
    }
    await this.ensureDatabase();

    const run =
      options.run === undefined
        ? await this.runs.latest()
        : await this.runs.byIdOrPrefix(options.run);
    if (run === null) {
      console.log(
        options.run === undefined
          ? DatabaseMessages.noRuns()
          : DatabaseMessages.runNotFound(options.run),
      );
      return;
    }

    const totals = await this.calls.usageTotals({ runId: run.id });
    const missingPrices = await this.prices.missing(totals.models);
    const rows = await this.rowsOf(run.id, dimension);

    if (options.json === true) {
      console.log(UsageCommand.json(run, dimension, rows, totals, missingPrices));
      return;
    }
    console.log(
      UsageFormatter.lines([
        UsageFormatter.header(run),
        UsageCommand.table(dimension, rows, totals),
        UsageFormatter.footer(missingPrices),
      ]),
    );
  }

  @Option({
    flags: '--run <id>',
    description: 'show the usage of one run (full id or its short form)',
  })
  parseRun(value: string): string {
    return value;
  }

  @Option({
    flags: '--last',
    description: 'show the usage of the last run (the default)',
  })
  parseLast(): boolean {
    return true;
  }

  @Option({
    flags: '--by <dimension>',
    description: 'group by agent, step or model',
    defaultValue: UsageDimension.Agent,
  })
  parseBy(value: string): string {
    return value;
  }

  @Option({
    flags: '--json',
    description: 'print machine-readable output',
  })
  parseJson(): boolean {
    return true;
  }

  private async rowsOf(
    runId: string,
    dimension: UsageDimension,
  ): Promise<readonly UsageRow[] | readonly StepUsageRow[]> {
    if (dimension === UsageDimension.Step) {
      return this.calls.usageByStep(runId);
    }
    if (dimension === UsageDimension.Model) {
      return this.calls.usageByModel(runId);
    }
    return this.calls.usageByRun(runId);
  }

  private static table(
    dimension: UsageDimension,
    rows: readonly UsageRow[] | readonly StepUsageRow[],
    totals: UsageTotals,
  ): string {
    if (dimension === UsageDimension.Step) {
      return UsageFormatter.byStep(rows as readonly StepUsageRow[], totals);
    }
    if (dimension === UsageDimension.Model) {
      return UsageFormatter.byModel(rows, totals);
    }
    return UsageFormatter.byAgent(rows, totals);
  }

  private static json(
    run: RunDetail,
    dimension: UsageDimension,
    rows: readonly UsageRow[] | readonly StepUsageRow[],
    totals: UsageTotals,
    missingPrices: readonly string[],
  ): string {
    return JSON.stringify(
      {
        run: {
          id: run.id,
          shortId: RunIdFormatter.short(run.id),
          status: run.status,
          startedAt: run.startedAt,
          prompt: run.prompt,
        },
        groupedBy: dimension,
        rows,
        totals,
        missingPrices,
      },
      null,
      JSON_INDENT,
    );
  }

  private static dimensionOf(value?: string): UsageDimension | null {
    const dimensions: readonly string[] = Object.values(UsageDimension);
    if (value === undefined) {
      return UsageDimension.Agent;
    }
    return dimensions.includes(value) ? (value as UsageDimension) : null;
  }
}
