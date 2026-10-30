const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;

export class DurationFormatter {
  static format(durationMs: number): string {
    const totalSeconds = Math.round(durationMs / MILLISECONDS_PER_SECOND);
    if (totalSeconds < SECONDS_PER_MINUTE) {
      return `${totalSeconds} s`;
    }
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return `${minutes} m ${seconds} s`;
  }
}
