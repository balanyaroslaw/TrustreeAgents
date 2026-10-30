import { Injectable } from '@nestjs/common';
import { GitService } from '../../git/git.service';
import { PathPolicy } from '../../security/path.policy';
import { WorkspaceMessages } from '../../workspace.messages';
import {
  MAX_SEARCH_LINE_CHARS,
  MAX_SEARCH_MATCHES,
  MAX_SEARCH_MATCHES_PER_FILE,
} from '../file-tool.constants';
import type { GrepLine, ValidatedSearchRequest } from './search-code.types';

const LINE_BREAK = '\n';
const NUL = '\0';
const GROUP_SEPARATOR = '--';
const ELLIPSIS = '…';
const DECIMAL_RADIX = 10;
const NEXT_INDEX = 1;
const NO_CONTEXT = 0;
const WHOLE_WORKSPACE_SCOPE = 'the workspace';

@Injectable()
export class SearchCodeService {
  constructor(private readonly git: GitService) {}

  async search(request: ValidatedSearchRequest): Promise<string> {
    const lines = SearchCodeService.parse(await this.git.grep(request)).filter(
      (line) => PathPolicy.denyReadReason(line.path) === null,
    );
    const matchKeys = await this.matchKeys(request);
    const matches = lines.filter((line) => SearchCodeService.isMatch(line, matchKeys));

    if (matches.length === 0) {
      return WorkspaceMessages.searchNoMatches(
        request.pattern,
        request.relativePath ?? WHOLE_WORKSPACE_SCOPE,
      );
    }

    return SearchCodeService.render(request, lines, matches, matchKeys);
  }

  private async matchKeys(request: ValidatedSearchRequest): Promise<ReadonlySet<string> | null> {
    if (request.contextLines === NO_CONTEXT) {
      return null;
    }

    const output = await this.git.grep({ ...request, contextLines: NO_CONTEXT });
    return new Set(SearchCodeService.parse(output).map(SearchCodeService.keyOf));
  }

  private static render(
    request: ValidatedSearchRequest,
    lines: readonly GrepLine[],
    matches: readonly GrepLine[],
    matchKeys: ReadonlySet<string> | null,
  ): string {
    const body: string[] = [];
    const perFile = new Map<string, number>();
    let shown = 0;
    let truncated = false;

    for (const line of lines) {
      const shownForFile = perFile.get(line.path) ?? 0;
      const hasRoom = shown < MAX_SEARCH_MATCHES && shownForFile < MAX_SEARCH_MATCHES_PER_FILE;

      if (!SearchCodeService.isMatch(line, matchKeys)) {
        if (hasRoom) {
          body.push(
            WorkspaceMessages.searchContext(
              line.path,
              line.lineNumber,
              SearchCodeService.cut(line.text),
            ),
          );
        }
        continue;
      }

      if (!hasRoom) {
        truncated = true;
        continue;
      }

      perFile.set(line.path, shownForFile + NEXT_INDEX);
      shown += 1;
      body.push(
        WorkspaceMessages.searchMatch(line.path, line.lineNumber, SearchCodeService.cut(line.text)),
      );
    }

    const files = new Set(matches.map((line) => line.path)).size;
    const output = [
      WorkspaceMessages.searchHeader(matches.length, files, request.pattern),
      ...body,
    ];
    if (truncated) {
      output.push(WorkspaceMessages.searchTruncated());
    }

    return output.join(LINE_BREAK);
  }

  private static isMatch(line: GrepLine, matchKeys: ReadonlySet<string> | null): boolean {
    return matchKeys === null || matchKeys.has(SearchCodeService.keyOf(line));
  }

  private static keyOf(line: GrepLine): string {
    return `${line.path}${NUL}${line.lineNumber}`;
  }

  private static cut(text: string): string {
    return text.length <= MAX_SEARCH_LINE_CHARS
      ? text
      : `${text.slice(0, MAX_SEARCH_LINE_CHARS)}${ELLIPSIS}`;
  }

  private static parse(output: string): GrepLine[] {
    const lines: GrepLine[] = [];

    for (const raw of output.split(LINE_BREAK)) {
      if (raw === '' || raw === GROUP_SEPARATOR) {
        continue;
      }
      const pathEnd = raw.indexOf(NUL);
      const numberEnd = raw.indexOf(NUL, pathEnd + NEXT_INDEX);
      if (pathEnd < 0 || numberEnd < 0) {
        continue;
      }
      const lineNumber = Number.parseInt(raw.slice(pathEnd + NEXT_INDEX, numberEnd), DECIMAL_RADIX);
      if (!Number.isInteger(lineNumber)) {
        continue;
      }
      lines.push({
        path: raw.slice(0, pathEnd),
        lineNumber,
        text: raw.slice(numberEnd + NEXT_INDEX),
      });
    }

    return lines;
  }
}
