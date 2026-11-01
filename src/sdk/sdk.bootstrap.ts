import { Injectable } from '@nestjs/common';
import { setTracingDisabled } from '@openai/agents';
import { setDefaultOpenAIKey } from '@openai/agents-openai';
import { AgentsConfig } from '../agents/agents.config';
import type { AgentRole } from '../agents/agent-role.enum';
import { EnvironmentReader } from '../config/environment.reader';
import { MODELS_LABEL } from './sdk.messages';

// Prepares the SDK the first time a model is actually called: it validates the environment,
// hands the key to the SDK, keeps the provider-side trace export off, and reports once which
// model each role runs on. Commands that never call a model never reach this.
@Injectable()
export class SdkBootstrap {
  private models: Readonly<Record<AgentRole, string>> | null = null;

  ensureReady(): Readonly<Record<AgentRole, string>> {
    if (this.models !== null) {
      return this.models;
    }
    const environment = EnvironmentReader.modelEnvironment();
    setDefaultOpenAIKey(environment.OPENAI_API_KEY);
    // Our run log is the database and the report; nothing is exported to the provider.
    setTracingDisabled(true);

    const models = AgentsConfig.models(environment);
    console.log(`${MODELS_LABEL} ${AgentsConfig.describe(models)}`);
    this.models = models;

    return models;
  }
}
