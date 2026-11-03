import { Inject, Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { APPROVAL_GATE } from '../../approval/approval.constants';
import type { ApprovalGate } from '../../approval/approval-gate.types';
import { ChildEnvironmentBuilder } from '../../commands/child-environment.builder';
import { AgentCallStore } from '../../activity/agent-call.store';
import { CommandLock } from '../../commands/command.lock';
import { CommandRisk } from '../../commands/command-risk.enum';
import { OutputCollector } from '../../commands/output.collector';
import { OutputTruncator } from '../../commands/output.truncator';
import { ErrorInspector } from '../../utils/error.inspector';
import { WorkspaceMessages } from '../../workspace.messages';
import { WorkspaceService } from '../../workspace.service';
import { KILL_GRACE_MS, MAX_COLLECTED_OUTPUT_BYTES } from '../file-tool.constants';
import { FileToolName } from '../../enums/file-tool-name.enum';
import type { CommandOutcome, ValidatedCommandRequest } from './run-command.types';

const LINE_BREAK = '\n';
const NO_SHELL = false;
const WINDOWS_PLATFORM = 'win32';
const TERMINATE_SIGNAL = 'SIGTERM';
const KILL_SIGNAL = 'SIGKILL';

@Injectable()
export class RunCommandService {
  // Every parameter carries an explicit @Inject so the constructor also resolves in runtimes
  // that do not emit design:paramtypes metadata (the tsx dev script).
  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    @Inject(CommandLock) private readonly lock: CommandLock,
    @Inject(APPROVAL_GATE) private readonly approvalGate: ApprovalGate,
    // Present only while an agent call is running; without it the command is simply not recorded.
    @Inject(AgentCallStore) private readonly calls: AgentCallStore,
  ) {}

  async run(request: ValidatedCommandRequest): Promise<string> {
    return this.lock.run(() => this.runExclusively(request));
  }

  private async runExclusively(request: ValidatedCommandRequest): Promise<string> {
    if (request.risk === CommandRisk.NeedsApproval) {
      const approved = await this.approvalGate.request({
        tool: FileToolName.RunCommand,
        description: request.displayCommand,
      });
      if (!approved) {
        throw new Error(WorkspaceMessages.commandNotApproved());
      }
    }

    const outcome = await this.spawnCommand(request);
    const output = RunCommandService.outputOf(outcome);

    this.calls.current()?.commands.record({
      command: request.displayCommand,
      cwd: request.cwd,
      exitCode: outcome.exitCode,
      timedOut: outcome.timedOut,
      durationMs: outcome.durationMs,
      outputTail: output,
    });

    // A timeout is an outcome of the command, not a failure of the tool: it is returned as the
    // "Error: ..." text the model reads, with whatever the command printed before it was killed.
    if (outcome.timedOut) {
      return WorkspaceMessages.error(WorkspaceMessages.commandTimedOut(request.timeoutMs, output));
    }

    return WorkspaceMessages.commandResult(
      request.displayCommand,
      outcome.exitCode,
      outcome.signal,
      outcome.durationMs,
      output,
    );
  }

  private spawnCommand(request: ValidatedCommandRequest): Promise<CommandOutcome> {
    return new Promise<CommandOutcome>((resolve, reject) => {
      const startedAt = Date.now();
      const child = spawn(request.executable, [...request.args], {
        cwd: request.cwd,
        shell: NO_SHELL,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== WINDOWS_PLATFORM,
        env: ChildEnvironmentBuilder.build(this.workspace.root),
      });

      const collector = new OutputCollector(MAX_COLLECTED_OUTPUT_BYTES);
      let timedOut = false;
      // The pending SIGKILL, held so it can be cancelled the moment the group is gone: the pid of
      // a reaped group can be reused, and this signal must never reach anything else.
      let escalation: NodeJS.Timeout | null = null;

      child.stdout.on('data', (chunk: Buffer) => collector.add(chunk));
      child.stderr.on('data', (chunk: Buffer) => collector.add(chunk));

      const timer = setTimeout(() => {
        timedOut = true;
        escalation = RunCommandService.terminate(child);
      }, request.timeoutMs);

      child.on('error', (error: unknown) => {
        RunCommandService.clearTimers(timer, escalation);
        reject(
          new Error(
            WorkspaceMessages.couldNotStartCommand(
              request.executable,
              ErrorInspector.message(error),
            ),
          ),
        );
      });

      child.on('close', (exitCode, signal) => {
        RunCommandService.clearTimers(timer, escalation);
        resolve({
          exitCode,
          signal,
          output: collector.text(),
          outputCut: collector.wasCut(),
          timedOut,
          durationMs: Date.now() - startedAt,
        });
      });
    });
  }

  private static outputOf(outcome: CommandOutcome): string {
    const output = OutputTruncator.truncate(outcome.output);
    if (!outcome.outputCut) {
      return output;
    }
    return [output, WorkspaceMessages.outputCut(MAX_COLLECTED_OUTPUT_BYTES)].join(LINE_BREAK);
  }

  // SIGTERM to the whole process group first, so a shell and everything it started get it, then
  // SIGKILL to the same group for whatever ignored SIGTERM. The returned timer is cancelled by the
  // caller as soon as the group has gone, and unref'd so it can never hold the process open.
  private static terminate(child: ChildProcess): NodeJS.Timeout {
    RunCommandService.signal(child, TERMINATE_SIGNAL);

    return setTimeout(() => RunCommandService.signal(child, KILL_SIGNAL), KILL_GRACE_MS).unref();
  }

  // Called on every exit path, so neither a pending timeout nor a pending kill can hold this
  // process open or fire once the command is over.
  private static clearTimers(...timers: readonly (NodeJS.Timeout | null)[]): void {
    for (const timer of timers) {
      if (timer !== null) {
        clearTimeout(timer);
      }
    }
  }

  private static signal(child: ChildProcess, signal: NodeJS.Signals): void {
    try {
      if (child.pid !== undefined && process.platform !== WINDOWS_PLATFORM) {
        process.kill(-child.pid, signal);
        return;
      }
      child.kill(signal);
    } catch {
      // the process group is already gone
    }
  }
}
