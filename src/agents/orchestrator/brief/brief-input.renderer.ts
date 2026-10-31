import { InputSectionRenderer } from '../../context/input-section.renderer';
import {
  BRIEF_CHANGED_CODE_LABELS,
  BRIEF_DEVELOPER_NOTES_HEADER,
  BRIEF_MAX_LISTED_FILES,
} from './brief-input.constants';
import type { BriefInputPacket } from './brief-input.types';

const SECTION_SEPARATOR = '\n\n';

export class BriefInputRenderer {
  static render(packet: BriefInputPacket): string {
    const sections = [
      InputSectionRenderer.step(packet.step),
      InputSectionRenderer.criteria(packet.step.acceptanceCriteria),
      InputSectionRenderer.changedCode(
        packet.changedCode,
        BRIEF_CHANGED_CODE_LABELS,
        BRIEF_MAX_LISTED_FILES,
      ),
      InputSectionRenderer.developerNotes(
        packet.developerReport.result,
        BRIEF_DEVELOPER_NOTES_HEADER,
      ),
    ];

    return sections.filter((section) => section !== null).join(SECTION_SEPARATOR);
  }
}
