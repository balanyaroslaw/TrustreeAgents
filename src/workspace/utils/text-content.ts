const UTF8_ENCODING = 'utf-8';
const LINE_BREAK = '\n';
const LINE_SPLIT_PATTERN = /\r?\n/;

export class TextContent {
  static decodeUtf8(bytes: Uint8Array): string {
    return new TextDecoder(UTF8_ENCODING, { fatal: true }).decode(bytes);
  }

  static splitLines(text: string): string[] {
    const lines = text.split(LINE_SPLIT_PATTERN);
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines;
  }

  static countLines(text: string): number {
    if (text === '') {
      return 0;
    }
    const lines = text.split(LINE_BREAK);
    return text.endsWith(LINE_BREAK) ? lines.length - 1 : lines.length;
  }
}
