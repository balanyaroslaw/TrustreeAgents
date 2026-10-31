const FIRST_SEQUENCE = 1;

// One instance per agent call: file changes and command runs share this timeline, so the report
// can tell whether the last test run happened after the last change of a test file.
export class ActivityClock {
  private sequence = FIRST_SEQUENCE;

  next(): number {
    const current = this.sequence;
    this.sequence += 1;
    return current;
  }
}
