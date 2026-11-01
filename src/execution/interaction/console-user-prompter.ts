import { createInterface } from 'node:readline/promises';
import type { UserPrompter } from './user-prompter.port.types';

const QUESTION_SUFFIX = ' ';
const FIRST_ITEM = 1;

// Asks on the terminal, one question at a time. Available only on a TTY: a piped or detached
// process has nobody to answer, and the run must not block on it.
export class ConsoleUserPrompter implements UserPrompter {
  static forTty(): ConsoleUserPrompter | null {
    return process.stdin.isTTY === true && process.stdout.isTTY === true
      ? new ConsoleUserPrompter()
      : null;
  }

  async ask(questions: readonly string[]): Promise<readonly string[]> {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answers: string[] = [];
      for (const [position, question] of questions.entries()) {
        const answer = await terminal.question(
          `${position + FIRST_ITEM}. ${question}${QUESTION_SUFFIX}`,
        );
        answers.push(answer.trim());
      }
      return answers;
    } finally {
      terminal.close();
    }
  }
}
