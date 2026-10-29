import { extname } from 'node:path';
import { BINARY_EXTENSIONS, BINARY_SNIFF_BYTES } from '../workspace.constants';

const NULL_BYTE = 0;

export class BinaryDetector {
  private static readonly extensions = new Set(BINARY_EXTENSIONS);

  static hasBinaryExtension(filePath: string): boolean {
    return BinaryDetector.extensions.has(extname(filePath).toLowerCase());
  }

  static containsNullByte(head: Uint8Array): boolean {
    const limit = Math.min(head.length, BINARY_SNIFF_BYTES);
    for (let index = 0; index < limit; index += 1) {
      if (head[index] === NULL_BYTE) {
        return true;
      }
    }
    return false;
  }

  static isBinary(filePath: string, head: Uint8Array = new Uint8Array()): boolean {
    return BinaryDetector.hasBinaryExtension(filePath) || BinaryDetector.containsNullByte(head);
  }
}
