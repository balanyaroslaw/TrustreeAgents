const MILLISECONDS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECOND_FRACTION_DIGITS = 1;

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

  static preciseSeconds(durationMs: number): string {
    return `${(durationMs / MILLISECONDS_PER_SECOND).toFixed(SECOND_FRACTION_DIGITS)} s`;
  }
}
