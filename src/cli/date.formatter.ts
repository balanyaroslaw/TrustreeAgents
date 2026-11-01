const DATE_TIME_LENGTH = 16;
const START = 0;
const DATE_TIME_SEPARATOR = 'T';
const SPACE = ' ';

export class DateFormatter {
  static short(date: Date): string {
    return date.toISOString().slice(START, DATE_TIME_LENGTH).replace(DATE_TIME_SEPARATOR, SPACE);
  }
}
