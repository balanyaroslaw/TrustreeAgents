import { randomBytes } from 'node:crypto';
import { chmod, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { TEMPORARY_SUFFIX_BYTES, WRITE_FILE_MODE } from '../tools/file-tool.constants';

const UTF8_ENCODING = 'utf8';

export class AtomicFileWriter {
  static async replace(absolutePath: string, content: string, mode?: number): Promise<void> {
    const directory = dirname(absolutePath);
    await mkdir(directory, { recursive: true });

    const temporary = AtomicFileWriter.temporaryPath(absolutePath);
    try {
      await writeFile(temporary, content, { encoding: UTF8_ENCODING, mode: WRITE_FILE_MODE });
      if (mode !== undefined) {
        await chmod(temporary, mode);
      }
      await rename(temporary, absolutePath);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      throw error;
    }
  }

  private static temporaryPath(absolutePath: string): string {
    const suffix = randomBytes(TEMPORARY_SUFFIX_BYTES).toString('hex');
    return join(dirname(absolutePath), `.${basename(absolutePath)}.${suffix}.tmp`);
  }
}
