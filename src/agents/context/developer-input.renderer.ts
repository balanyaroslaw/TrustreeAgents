import { ReworkBriefBuilder } from '../orchestrator/decide/rework-brief.builder';
import {
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

  private static rework(packet: DeveloperInputPacket): string | null {
    if (packet.reworkBrief === null) {
      return null;
    }
    const brief = ReworkBriefBuilder.render(packet.reworkBrief);

    return brief === '' ? null : [REWORK_HEADER, brief].join(SECTION_SEPARATOR);
  }
}
