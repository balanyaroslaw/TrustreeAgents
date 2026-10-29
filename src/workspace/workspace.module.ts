import { Module } from '@nestjs/common';
import { FileToolRegistry } from './tools/file-tool.registry';
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
    ReadFileValidator,
    ReadFileService,
    ReadFileTool,
    WriteFileValidator,
    WriteFileService,
    WriteFileTool,
    ListFilesValidator,
    ListFilesService,
    ListFilesTool,
    FileToolRegistry,
  ],
  exports: [WorkspaceService, FileToolRegistry],
})
export class WorkspaceModule {}
