import { Inject, Injectable, Optional } from '@nestjs/common';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { APPROVAL_GATE } from '../../approval/approval.constants';
import type { ApprovalGate } from '../../approval/approval-gate.types';
import { ChildEnvironmentBuilder } from '../../commands/child-environment.builder';
import { CommandRunRecorder } from '../../commands/command-run.recorder';
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
    @Optional() @Inject(CommandRunRecorder) private readonly recorder?: CommandRunRecorder,
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

    this.recorder?.record({
      command: request.displayCommand,
      cwd: request.cwd,
      exitCode: outcome.exitCode,
      timedOut: outcome.timedOut,
      durationMs: outcome.durationMs,
      outputTail: output,
    });

    if (outcome.timedOut) {
      throw new Error(WorkspaceMessages.commandTimedOut(request.timeoutMs, output));
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

      child.stdout.on('data', (chunk: Buffer) => collector.add(chunk));
      child.stderr.on('data', (chunk: Buffer) => collector.add(chunk));

      const timer = setTimeout(() => {
        timedOut = true;
        RunCommandService.terminate(child);
      }, request.timeoutMs);

      child.on('error', (error: unknown) => {
        clearTimeout(timer);
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
        clearTimeout(timer);
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

  private static terminate(child: ChildProcess): void {
    RunCommandService.signal(child, TERMINATE_SIGNAL);
    setTimeout(() => RunCommandService.signal(child, KILL_SIGNAL), KILL_GRACE_MS).unref();
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
