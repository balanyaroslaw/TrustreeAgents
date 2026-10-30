const UTF8_ENCODING = 'utf8';

export class OutputCollector {
  private readonly chunks: Buffer[] = [];
  private collected = 0;
  private cut = false;

  constructor(private readonly limitBytes: number) {}

  add(chunk: Buffer): void {
    if (this.cut) {
      return;
    }

    const remaining = this.limitBytes - this.collected;
    if (chunk.length >= remaining) {
      this.chunks.push(chunk.subarray(0, remaining));
      this.collected = this.limitBytes;
      this.cut = true;
      return;
    }

    this.chunks.push(chunk);
    this.collected += chunk.length;
  }

  text(): string {
    return Buffer.concat(this.chunks).toString(UTF8_ENCODING);
  }

  wasCut(): boolean {
    return this.cut;
  }
}
