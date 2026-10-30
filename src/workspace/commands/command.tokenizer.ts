import { ToolValidationError } from '../errors/tool-validation.error';
import { WorkspaceMessages } from '../workspace.messages';

const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const WHITESPACE_PATTERN = /\s/;
const FORBIDDEN_OUTSIDE_QUOTES: readonly string[] = [
  '|',
  '&',
  ';',
  '<',
  '>',
  '(',
  ')',
  '{',
  '}',
  '\n',
  '\r',
];
const FORBIDDEN_ANYWHERE: readonly string[] = ['`', '$'];
const NEXT_CHARACTER = 1;
const DOUBLED = 2;

export class CommandTokenizer {
  static tokenize(command: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let started = false;
    let quote: string | null = null;

    for (let index = 0; index < command.length; index += 1) {
      const character = command[index];

      if (FORBIDDEN_ANYWHERE.includes(character)) {
        throw new ToolValidationError(WorkspaceMessages.shellSyntaxNotSupported(character));
      }

      if (quote !== null) {
        if (character === quote) {
          quote = null;
        } else {
          current += character;
        }
        started = true;
        continue;
      }

      if (character === SINGLE_QUOTE || character === DOUBLE_QUOTE) {
        quote = character;
        started = true;
        continue;
      }

      if (FORBIDDEN_OUTSIDE_QUOTES.includes(character)) {
        throw new ToolValidationError(
          WorkspaceMessages.shellSyntaxNotSupported(CommandTokenizer.found(command, index)),
        );
      }

      if (WHITESPACE_PATTERN.test(character)) {
        if (started) {
          tokens.push(current);
          current = '';
          started = false;
        }
        continue;
      }

      current += character;
      started = true;
    }

    if (quote !== null) {
      throw new ToolValidationError(WorkspaceMessages.unbalancedQuote());
    }
    if (started) {
      tokens.push(current);
    }
    if (tokens.length === 0) {
      throw new ToolValidationError(WorkspaceMessages.emptyCommand());
    }

    return tokens;
  }

  private static found(command: string, index: number): string {
    const character = command[index];
    return command[index + NEXT_CHARACTER] === character ? character.repeat(DOUBLED) : character;
  }
}
