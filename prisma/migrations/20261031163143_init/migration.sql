-- CreateEnum
CREATE TYPE "run_status" AS ENUM ('running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "step_status" AS ENUM ('pending', 'in_progress', 'accepted', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "agent_role" AS ENUM ('orchestrator', 'developer', 'qa', 'reviewer');

-- CreateEnum
CREATE TYPE "decision_kind" AS ENUM ('accept', 'rework', 'abort');

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "run_status" NOT NULL DEFAULT 'running',
    "branch" TEXT,
    "plan_summary" TEXT,
    "assumptions" JSONB,
    "report_path" TEXT,
    "tokens_total" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,
    "failure_reason" TEXT,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_steps" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acceptance_criteria" JSONB NOT NULL,
    "status" "step_status" NOT NULL DEFAULT 'pending',
    "attempts_used" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "commit_sha" TEXT,
    "failure_reason" TEXT,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "plan_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "step_attempts" (
    "id" UUID NOT NULL,
    "step_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "developer_report" JSONB,
    "qa_report" JSONB,
    "review_report" JSONB,
    "decision" JSONB,
    "guarded" JSONB,
    "effective_decision" "decision_kind",
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "changed_files" JSONB,
    "tokens_total" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_calls" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "attempt_id" UUID,
    "role" "agent_role" NOT NULL,
    "task" TEXT,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "tool_calls" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "failure_kind" TEXT,
    "instructions_hash" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "agent_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_prices" (
    "model" TEXT NOT NULL,
    "input_per_m" DECIMAL(12,6) NOT NULL,
    "cached_input_per_m" DECIMAL(12,6) NOT NULL,
    "output_per_m" DECIMAL(12,6) NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "model_prices_pkey" PRIMARY KEY ("model")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_path_key" ON "projects"("path");

-- CreateIndex
CREATE INDEX "runs_project_id_started_at_idx" ON "runs"("project_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "plan_steps_run_id_index_key" ON "plan_steps"("run_id", "index");

-- CreateIndex
CREATE UNIQUE INDEX "step_attempts_step_id_attempt_key" ON "step_attempts"("step_id", "attempt");

-- CreateIndex
CREATE INDEX "agent_calls_run_id_started_at_idx" ON "agent_calls"("run_id", "started_at");

-- CreateIndex
CREATE INDEX "agent_calls_role_model_idx" ON "agent_calls"("role", "model");

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_steps" ADD CONSTRAINT "plan_steps_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_attempts" ADD CONSTRAINT "step_attempts_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "plan_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_calls" ADD CONSTRAINT "agent_calls_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_calls" ADD CONSTRAINT "agent_calls_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "step_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
