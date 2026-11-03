import { Module } from '@nestjs/common';
import { AgentCallStore } from './activity/agent-call.store';
import { APPROVAL_GATE } from './approval/approval.constants';
import { LoggingApprovalGate } from './approval/logging-approval-gate';
import { CommandLock } from './commands/command.lock';
import { PackageTestScriptReader } from './commands/package-test-script.reader';
import { GitService } from './git/git.service';
import { FileToolRegistry } from './tools/file-tool.registry';
import { DeleteFileService } from './tools/delete-file/delete-file.service';
import { DeleteFileTool } from './tools/delete-file/delete-file.tool';
import { DeleteFileValidator } from './tools/delete-file/delete-file.validator';
import { EditFileService } from './tools/edit-file/edit-file.service';
import { EditFileTool } from './tools/edit-file/edit-file.tool';
import { EditFileValidator } from './tools/edit-file/edit-file.validator';
import { GitDiffService } from './tools/git-diff/git-diff.service';
import { GitDiffTool } from './tools/git-diff/git-diff.tool';
import { GitDiffValidator } from './tools/git-diff/git-diff.validator';
import { GitStatusService } from './tools/git-status/git-status.service';
import { GitStatusTool } from './tools/git-status/git-status.tool';
import { ListFilesService } from './tools/list-files/list-files.service';
import { ListFilesTool } from './tools/list-files/list-files.tool';
import { ListFilesValidator } from './tools/list-files/list-files.validator';
import { ReadFileService } from './tools/read-file/read-file.service';
import { ReadFileTool } from './tools/read-file/read-file.tool';
import { ReadFileValidator } from './tools/read-file/read-file.validator';
import { WriteFileService } from './tools/write-file/write-file.service';
import { WriteFileTool } from './tools/write-file/write-file.tool';
import { RunCommandService } from './tools/run-command/run-command.service';
import { RunCommandTool } from './tools/run-command/run-command.tool';
import { RunCommandValidator } from './tools/run-command/run-command.validator';
import { SearchCodeService } from './tools/search-code/search-code.service';
import { SearchCodeTool } from './tools/search-code/search-code.tool';
import { SearchCodeValidator } from './tools/search-code/search-code.validator';
import { WriteFileValidator } from './tools/write-file/write-file.validator';
import { WORKSPACE_ROOT } from './workspace.constants';
import { WorkspaceRootResolver } from './workspace-root.resolver';
import { WorkspaceService } from './workspace.service';

@Module({
  providers: [
    { provide: WORKSPACE_ROOT, useFactory: () => WorkspaceRootResolver.fromArgv(process.argv) },
    WorkspaceService,
    GitService,
    AgentCallStore,
    ReadFileValidator,
    ReadFileService,
    ReadFileTool,
    WriteFileValidator,
    WriteFileService,
    WriteFileTool,
    ListFilesValidator,
    ListFilesService,
    ListFilesTool,
    EditFileValidator,
    EditFileService,
    EditFileTool,
    DeleteFileValidator,
    DeleteFileService,
    DeleteFileTool,
    GitStatusService,
    GitStatusTool,
    GitDiffValidator,
    GitDiffService,
    GitDiffTool,
    SearchCodeValidator,
    SearchCodeService,
    SearchCodeTool,
    CommandLock,
    PackageTestScriptReader,
    { provide: APPROVAL_GATE, useClass: LoggingApprovalGate },
    RunCommandValidator,
    RunCommandService,
    RunCommandTool,
    FileToolRegistry,
  ],
  exports: [
    WorkspaceService,
    GitService,
    FileToolRegistry,
    AgentCallStore,
    PackageTestScriptReader,
  ],
})
export class WorkspaceModule {}
