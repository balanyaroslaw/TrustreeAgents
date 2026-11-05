import { ReworkBriefBuilder } from '../orchestrator/decide/rework-brief.builder';
import { ReworkBriefRenderer } from '../orchestrator/decide/rework-brief.renderer';
import {
  CONTINUATION_HEADER,
  DEVELOPER_CHANGED_CODE_LABELS,
  DEVELOPER_MAX_LISTED_FILES,
  REWORK_HEADER,
  SYSTEM_NOTE_HEADER,
} from './developer-input.constants';
import type { DeveloperInputPacket } from './developer-input.types';
import { InputSectionRenderer } from './input-section.renderer';

const SECTION_SEPARATOR = '\n\n';
const LINE_SEPARATOR = '\n';
const FIRST_ATTEMPT = 1;

export class DeveloperInputRenderer {
  static render(packet: DeveloperInputPacket): string {
    const sections = [
      InputSectionRenderer.step(packet.step),
      InputSectionRenderer.criteria(packet.step.acceptanceCriteria),
      InputSectionRenderer.completedSteps(packet.completedSteps),
      DeveloperInputRenderer.attempt(packet),
      InputSectionRenderer.changedCode(
        packet.changedCode,
        DEVELOPER_CHANGED_CODE_LABELS,
        DEVELOPER_MAX_LISTED_FILES,
      ),
      DeveloperInputRenderer.systemNote(packet.systemNote),
      DeveloperInputRenderer.rework(packet),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }

  private static attempt(packet: DeveloperInputPacket): string | null {
    return packet.attempt <= FIRST_ATTEMPT
      ? null
      : `Attempt ${packet.attempt} of ${packet.maxAttempts}.`;
  }

  private static systemNote(note: string | null): string | null {
    return note === null ? null : [SYSTEM_NOTE_HEADER, note].join(LINE_SEPARATOR);
  }

  // The findings first, then what code gathered about them: the diff stat, the output of the run
  // that failed, the code around each blocking issue and what earlier attempts were asked to do.
  // A first attempt has no brief, so none of this is rendered there.
  private static rework(packet: DeveloperInputPacket): string | null {
    const { reworkBrief } = packet;
    if (reworkBrief === null) {
      return null;
    }
    const issues = ReworkBriefBuilder.render(reworkBrief);
    const gathered = ReworkBriefRenderer.render(reworkBrief);
    const body = [issues, gathered].filter((section) => section !== '');
    const header = ReworkBriefBuilder.hasFindings(reworkBrief)
      ? REWORK_HEADER
      : CONTINUATION_HEADER;

    return body.length === 0 ? null : [header, ...body].join(SECTION_SEPARATOR);
  }
}
