export interface ApprovalRequest {
  readonly tool: string;
  readonly description: string;
}

export interface ApprovalGate {
  request(info: ApprovalRequest): Promise<boolean>;
}
