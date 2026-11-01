import { Inject, Injectable } from '@nestjs/common';
import { AgentCallStore } from '../../activity/agent-call.store';
import { ChangeAction } from '../../activity/change-action.enum';
import { AtomicFileWriter } from '../../io/atomic-file.writer';
import { TextContent } from '../../utils/text-content';
import { WorkspaceMessages } from '../../workspace.messages';
import type { ValidatedEditRequest } from './edit-file.types';

const SINGLE_REPLACEMENT = 1;

@Injectable()
export class EditFileService {
  constructor(@Inject(AgentCallStore) private readonly calls: AgentCallStore) {}

  async edit(request: ValidatedEditRequest): Promise<string> {
    const { absolutePath, relativePath, content, oldString, newString, replaceAll, occurrences } =
      request;

    const replacements = replaceAll ? occurrences : SINGLE_REPLACEMENT;
    const updated = replaceAll
      ? content.split(oldString).join(newString)
      : EditFileService.replaceFirst(content, oldString, newString);

    await AtomicFileWriter.replace(absolutePath, updated, request.mode);
    this.calls.current()?.changes.record(relativePath, ChangeAction.Modified);

    return WorkspaceMessages.editResult(
      relativePath,
      replacements,
      TextContent.countLines(newString),
      TextContent.countLines(oldString),
    );
  }

  private static replaceFirst(content: string, oldString: string, newString: string): string {
    const index = content.indexOf(oldString);
    return content.slice(0, index) + newString + content.slice(index + oldString.length);
  }
}
