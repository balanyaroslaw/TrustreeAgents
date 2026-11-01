// How the executor asks the clarifying questions of the Orchestrator. An unattended run has no
// prompter and answers them itself.
export interface UserPrompter {
  ask(questions: readonly string[]): Promise<readonly string[]>;
}
