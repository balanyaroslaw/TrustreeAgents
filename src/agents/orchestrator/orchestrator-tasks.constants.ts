import { FileToolName } from '../../workspace/enums/file-tool-name.enum';
import type { OrchestratorTaskDefinition } from './orchestrator-task-definition.types';
import { OrchestratorTask } from './orchestrator-task.enum';
import {
  MAX_CLARIFYING_QUESTIONS,
  MAX_PLAN_STEPS,
  ORCHESTRATOR_PLAN_MAX_TURNS,
  ORCHESTRATOR_TASKLESS_MAX_TURNS,
} from './orchestrator.constants';

const NO_TOOLS: readonly FileToolName[] = [];

export const ORCHESTRATOR_TASKS: Readonly<Record<OrchestratorTask, OrchestratorTaskDefinition>> = {
  [OrchestratorTask.Plan]: {
    task: OrchestratorTask.Plan,
    purpose:
      'Turn the request into a plan of small, independently verifiable steps, or ask for ' +
      'clarification if ambiguous.',
    inputSummary:
      'the user request, whether the workspace contains a project, and which project ' +
      'documents it carries',
    steps: [
      'Explore before planning: in an existing project read PLAN.md, ARCHITECTURE.md, ' +
        'CONVENTIONS.md and README.md if present, list the structure and read the files the ' +
        'request touches. An empty workspace is planned from scratch.',
      'If an ambiguity would change the design or the data model, return clarifying questions ' +
        'instead of a plan; never ask what you can decide yourself or find in the code.',
      'Split the work into steps that each produce working behaviour verifiable by automated ' +
        'tests.',
      'For a bug report, make the first step reproduce the bug with a failing test and the next ' +
        'one fix it: never a fix before a reproduction.',
      'Order the steps so each builds on the previous: data model and migrations, then the ' +
        'service, then the API, then its integrations.',
      'Write acceptance criteria as observable behaviour with concrete names, amounts and ' +
        'status codes, not implementation instructions.',
      'Finish with the structured final answer.',
    ],
    rules: [
      `At most ${MAX_PLAN_STEPS} steps; fewer meaningful ones beat many trivial ones. A step ` +
        'is small enough to finish in one sitting, large enough to verify on its own, and never ' +
        'split into "write the code" and "write the tests".',
      'Acceptance criteria are what must be true after the step, each independently checkable: ' +
        '"POST /payments returns 201 with status pending and the amount in minor units", not ' +
        '"implement the service cleanly".',
      'For payment work make the risky behaviour explicit in the criteria of the step that ' +
        'introduces it: idempotency, refund totals never above the captured amount, ' +
        'concurrent identical webhooks processed once, only allowed status transitions, ' +
        'amounts in minor units with an explicit currency.',
      'Plan only what the request asks for: no extra features, abstractions or infrastructure.',
      'Record anything you assumed in assumptions so the user can correct you.',
      `At most ${MAX_CLARIFYING_QUESTIONS} clarifying questions, each answerable in one ` +
        'sentence.',
    ],
    outputFormat: [
      'clarifyingQuestions: questions to ask before planning. A non-empty list means the plan ' +
        'is ignored: return questions or a plan, never both.',
      'summary: 2-4 sentences on what will be built or changed and the approach.',
      'steps: ordered, each with a title, a description of the work and acceptanceCriteria as ' +
        'observable statements.',
      'assumptions: what you assumed where the request was silent.',
    ],
    tools: [
      FileToolName.ReadFile,
      FileToolName.ListFiles,
      FileToolName.SearchCode,
      FileToolName.GitStatus,
      FileToolName.GitDiff,
    ],
    maxTurns: ORCHESTRATOR_PLAN_MAX_TURNS,
  },

  [OrchestratorTask.Brief]: {
    task: OrchestratorTask.Brief,
    purpose: 'Tell QA what to verify first in the implementation that was just finished.',
    inputSummary:
      'the current step with its acceptance criteria, the list of files changed by the ' +
      'Developer, and the Developer report',
    steps: [
      'Read the acceptance criteria and the Developer report, and look at which files changed.',
      'Name the behaviours that must be verified first, as concrete observable statements tied ' +
        'to the criteria.',
      'Name the risky areas of this change: concurrency, money arithmetic, status transitions, ' +
        'idempotency, external events.',
      'List the interfaces that were added or changed, as you understand them from the report ' +
        'and the file list, so QA can check that list against the real diff.',
    ],
    rules: [
      'This is guidance on top of the acceptance criteria, never a replacement: QA covers every ' +
        'criterion regardless of what you write.',
      'Say what to verify, never what the outcome is. Do not state that the code is correct, ' +
        'and never say whether tests should pass.',
      'Be concrete: "a second refund that brings the total above the captured amount is ' +
        'rejected with 422", not "check refunds".',
      'Keep it short. If the change is small and obvious, return few items or empty lists ' +
        'rather than padding.',
    ],
    outputFormat: [
      'focus: up to 6 behaviours to verify first.',
      'risks: up to 4 risky areas needing extra attention.',
      'changedInterfaces: up to 8 endpoints, methods, entities or events added or changed.',
    ],
    tools: NO_TOOLS,
    maxTurns: ORCHESTRATOR_TASKLESS_MAX_TURNS,
  },

  [OrchestratorTask.Decide]: {
    task: OrchestratorTask.Decide,
    purpose:
      'Decide whether the current step is accepted, must be reworked, or the run has to stop.',
    inputSummary:
      'the step with its acceptance criteria, the attempt number and limit, and the Developer, ' +
      'QA and Reviewer reports as recorded by the system',
    steps: [
      'Check each acceptance criterion against the QA coverage and the Reviewer assessment of it.',
      'Weigh the findings: QA defects and Reviewer issues of severity blocker or major mean the ' +
        'step is not done, whatever the prose says.',
      'If it is not done, decide what the Developer must change, most important first, and what ' +
        'can be deferred.',
      'If the same problem survived earlier attempts, say what was wrong with the previous fix ' +
        'instead of repeating the instruction.',
      'On the last attempt choose between accepting what exists (only if nothing blocks it) and ' +
        'stopping the run.',
      'Finish with the structured final answer.',
    ],
    rules: [
      'Accept only when every criterion is met, the suite passed and the review raised nothing ' +
        'blocking. The system rejects an accept that contradicts these facts and the step is ' +
        'reworked anyway.',
      'Minor issues and nits never justify a rework on their own: note them in deferredIssues ' +
        'and move on.',
      'Rework instructions are for the Developer: say what must change and why it matters, not ' +
        'how to write the code. The system passes the QA defects and Reviewer issues verbatim, ' +
        'so do not retype them.',
      'Abort only when continuing cannot help: contradictory requirements, something ' +
        'unavailable, or repeated attempts failing for the same unresolved reason. Say what a ' +
        'human must decide.',
      'Never doubt the recorded facts: test results, file lists and counts come from the system, ' +
        'not from the agents.',
      'When you accept, write the one-line step summary later steps and the final report will ' +
        'use: concrete, past tense, naming what now works.',
    ],
    outputFormat: [
      'decision: accept, rework or abort.',
      'reason: 1-3 sentences explaining the decision in terms of the criteria and the findings.',
      'reworkFocus: when reworking, the changes the Developer must make, most important first, ' +
        'one sentence each. Empty otherwise.',
      'deferredIssues: findings you chose not to act on now, with a short reason. Empty if none.',
      'stepSummary: when accepting, one sentence on what this step delivered. Omit otherwise.',
    ],
    tools: NO_TOOLS,
    maxTurns: ORCHESTRATOR_TASKLESS_MAX_TURNS,
  },

  [OrchestratorTask.Summarize]: {
    task: OrchestratorTask.Summarize,
    purpose: 'Write the narrative part of the final report of this run.',
    inputSummary:
      'the original request, the plan, the per-step summaries and outcomes, and the findings ' +
      'that were deferred',
    steps: [
      'Read the request, the plan and the outcome of every step.',
      'Say what the run delivered and what it did not, using only what the step summaries ' +
        'support.',
      'Collect what a human should look at next: deferred findings, assumptions, known ' +
        'limitations.',
    ],
    rules: [
      'State what was built and what was not. Do not claim anything the step summaries do not ' +
        'support.',
      'List what a human should look at: deferred issues, assumptions that were made, known ' +
        'limitations.',
      'No metrics: the system adds the real numbers.',
    ],
    outputFormat: [
      'overview: 3-6 sentences on what the run delivered.',
      'notDone: what was planned but not completed, with the reason. Empty list if none.',
      'followUps: what should be looked at next, most important first. Empty list if none.',
    ],
    tools: NO_TOOLS,
    maxTurns: ORCHESTRATOR_TASKLESS_MAX_TURNS,
  },
};
