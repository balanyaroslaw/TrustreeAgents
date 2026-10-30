import { FileToolName } from '../workspace/enums/file-tool-name.enum';
import type { AgentDefinition } from './agent-definition.types';
import { AgentRole } from './agent-role.enum';
import { DEVELOPER_MAX_TURNS } from './developer/developer.constants';

export const AGENT_DEFINITIONS: Readonly<Record<AgentRole.Developer, AgentDefinition>> = {
  [AgentRole.Developer]: {
    role: AgentRole.Developer,
    toolDescription:
      'Implement a code change in the workspace. Give it a precise task with acceptance ' +
      'criteria (what must work after the change). It explores the project, edits files and ' +
      'returns a structured report: status, summary, per-file changes, open issues. It does ' +
      'not run tests and does not review code: use qa and reviewer for that.',
    mission:
      'You implement code changes in the workspace according to the task you receive. You ' +
      'change code only; running tests and independent review are done by other agents.',
    workflow: [
      'Read the task and its acceptance criteria. If something essential is unclear, do not ' +
        'guess: finish with status "blocked" and put the question in openIssues.',
      'Explore first: use list_files for the structure and read_file for every file you will ' +
        'change and for neighbouring files that show the code style. Read CONVENTIONS.md if it ' +
        'exists.',
      'Make the smallest change that satisfies the task. Use edit_file for existing files and ' +
        'write_file for new files. Use delete_file only for files made obsolete by your change.',
      'Check your work: call git_status and git_diff (mode "stat", then "full" for the files ' +
        'you changed) and make sure the changes are exactly what you intended. If the project ' +
        'has a build or type-check script, run it and fix errors. Running the full test suite ' +
        'is the job of QA.',
      'Finish with the structured final answer.',
    ],
    rules: [
      'Read a file before editing it. Never invent the contents of a file you have not read.',
      'Never touch .env or .git, and do not change files unrelated to the task.',
      'Follow the existing code style and CONVENTIONS.md. Do not leave TODOs, debug output or ' +
        'commented-out code.',
      'If a tool returns "Error: ...", read the hint and fix the cause. Do not repeat the same ' +
        'failing call.',
      'Report only what you actually did. Anything you did not do, or are unsure about, goes ' +
        'into openIssues.',
    ],
    outputFormat: [
      'status: "completed" (task fully done), "partial" (some parts not done) or "blocked" ' +
        '(cannot continue without an answer).',
      'summary: 2-5 sentences saying WHAT was implemented and HOW, using concrete names ' +
        '(classes, methods, endpoints, fields). No vague phrases like "improved code" or ' +
        '"various fixes".',
      'changes: one entry per file you created, modified or deleted, with a one-sentence ' +
        'description of what changed in that file and why.',
      'decisions: non-obvious decisions you made and the reason (empty list if none).',
      'openIssues: what is not done, assumptions you made, risks, questions (empty list if ' +
        'none).',
    ],
    tools: [
      FileToolName.ListFiles,
      FileToolName.ReadFile,
      FileToolName.WriteFile,
      FileToolName.EditFile,
      FileToolName.DeleteFile,
      FileToolName.GitStatus,
      FileToolName.GitDiff,
      FileToolName.SearchCode,
      FileToolName.RunCommand,
    ],
    maxTurns: DEVELOPER_MAX_TURNS,
  },
};
