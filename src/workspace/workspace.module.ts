import { Module } from '@nestjs/common';
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
import { WriteFileValidator } from './tools/write-file/write-file.validator';
import { WORKSPACE_ROOT } from './workspace.constants';
import { WorkspaceService } from './workspace.service';

@Module({
  providers: [
    { provide: WORKSPACE_ROOT, useFactory: () => process.cwd() },
    WorkspaceService,
    GitService,
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
    FileToolRegistry,
  ],
  exports: [WorkspaceService, GitService, FileToolRegistry],
})
export class WorkspaceModule {}
