import { Inject, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WorkspaceService } from '../workspace.service';
import {
  PACKAGE_MANIFEST_NAME,
  PACKAGE_SCRIPTS_KEY,
  PACKAGE_TEST_SCRIPT_KEY,
} from './test-command.constants';

const UTF8_ENCODING = 'utf8';

// The "test" script of the workspace, so a project that runs its suites through a script of its
// own is still recognised as running them. A workspace with no package.json, with JSON that does
// not parse, or with no test script simply has none: this never fails a report.
@Injectable()
export class PackageTestScriptReader {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  async read(): Promise<string | null> {
    try {
      const contents = await readFile(
        join(this.workspace.root, PACKAGE_MANIFEST_NAME),
        UTF8_ENCODING,
      );

      return PackageTestScriptReader.testScriptOf(JSON.parse(contents));
    } catch {
      return null;
    }
  }

  private static testScriptOf(manifest: unknown): string | null {
    const scripts = PackageTestScriptReader.at(manifest, PACKAGE_SCRIPTS_KEY);
    const script = scripts === null ? undefined : scripts[PACKAGE_TEST_SCRIPT_KEY];

    return typeof script === 'string' && script.trim() !== '' ? script.trim() : null;
  }

  private static at(value: unknown, key: string): Record<string, unknown> | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }
    const nested = (value as Record<string, unknown>)[key];

    return typeof nested === 'object' && nested !== null
      ? (nested as Record<string, unknown>)
      : null;
  }
}
