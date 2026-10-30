import { Injectable, Logger } from '@nestjs/common';
import type { ApprovalGate, ApprovalRequest } from './approval-gate.types';

const SKIPPED_PREFIX = '[APPROVAL SKIPPED]';

// TEMPORARY: replace with the interactive gate that asks the user in the terminal UI.
@Injectable()
export class LoggingApprovalGate implements ApprovalGate {
  private readonly logger = new Logger(LoggingApprovalGate.name);

  async request(info: ApprovalRequest): Promise<boolean> {
    this.logger.warn(`${SKIPPED_PREFIX} ${info.tool}: ${info.description}`);
    return true;
  }
}
