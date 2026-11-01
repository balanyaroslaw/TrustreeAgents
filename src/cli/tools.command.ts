import { Inject } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';
import { AGENT_DEFINITIONS } from '../agents/agent-definitions.constants';
import type { DefinedAgentRole } from '../agents/agent-definition.types';
import { FileToolRegistry } from '../workspace/tools/file-tool.registry';
import { TableRenderer } from './table.renderer';
import {
  APPROVAL_LABEL,
  NO_APPROVAL_LABEL,
  READ_ONLY_LABEL,
  TOOL_COLUMNS,
  TOOL_ROLES_HEADER,
  WRITES_LABEL,
} from './tools.constants';

const NAME_SEPARATOR = ', ';

// Lists the tools the agents can use and which role gets which. No model is called, so it works
// without an API key.
@Command({
  name: 'tools',
  description: 'List the workspace tools and which role may use them',
})
export class ToolsCommand extends CommandRunner {
  constructor(@Inject(FileToolRegistry) private readonly registry: FileToolRegistry) {
    super();
  }

  async run(): Promise<void> {
    const rows = this.registry
      .definitions()
      .map((definition) => [
        definition.name,
        definition.mutatesWorkspace ? WRITES_LABEL : READ_ONLY_LABEL,
        definition.requiresApproval ? APPROVAL_LABEL : NO_APPROVAL_LABEL,
        definition.summary,
      ]);
    console.log(TableRenderer.render(TOOL_COLUMNS, rows));
    console.log('');
    console.log(TOOL_ROLES_HEADER);

    for (const [role, definition] of Object.entries(AGENT_DEFINITIONS)) {
      const tools = this.registry
        .forRole(role as DefinedAgentRole)
        .map((tool) => tool.name)
        .join(NAME_SEPARATOR);
      console.log(`  ${definition.role}: ${tools}`);
    }
  }
}
