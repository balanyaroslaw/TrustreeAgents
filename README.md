# TrusteeAgent CLI

A NestJS application that runs purely as a CLI (no HTTP server, no controllers) built with
[`nest-commander`](https://nest-commander.jaymcdoniel.dev/). `run` is still a stub; `agent`,
`tools`, `usage`, `history`, `prices` and `runs:prune` do real work.

## Requirements

- Node.js **22+**
- npm

## Install

```bash
npm install
```

## Usage

Commands run through the `team` script:

```bash
npm run team -- <command> [options]
```

Use `--help` on the CLI or on any single command:

```bash
npm run team -- --help
npm run team -- run --help
```

### `run "<prompt>"`

Runs a prompt against the whole team. The Orchestrator plans the work, then every step runs the
Developer, QA and the Reviewer, the Orchestrator decides what to do with the result, and accepted
steps are committed one per step on a `agent/run-<id>` branch. The run ends with
`reports/run-<id>.md`. Nothing is ever pushed.

It needs `OPENAI_API_KEY` in `.env` and a running database, unless you pass `--dry-run`.

| Option                   | Default           | Description                                                                      |
| ------------------------ | ----------------- | -------------------------------------------------------------------------------- |
| `-w, --workspace <path>` | current directory | workspace directory the agents work in; relative paths are resolved to absolute  |
| `--no-tui`               | TUI enabled       | disable the interactive TUI and print plain text; also makes the run unattended   |
| `--budget <tokens>`      | `200000`          | how many tokens the whole run may spend; it stops as `failed` when they run out   |
| `--max-steps <n>`        | every planned step| run at most this many plan steps; the rest are skipped                           |
| `--dry-run`              | off               | exercise the whole run on canned answers, calling no model and spending nothing   |
| `--yes`                  | off               | do not ask for confirmation of the plan before the steps run                     |

```bash
npm run team -- run "add a health endpoint"
npm run team -- run "demo" -w ../some-folder --budget 50000
npm run team -- run "demo" --max-steps 1
npm run team -- run "demo" --dry-run --yes
```

The budget and the model of every role are printed before the first model call. On a terminal the
plan is shown and confirmed once before any step starts; `--yes` skips that question and
`--no-tui` makes the run unattended, which answers it the same way.

Exit codes: `0` the run completed, `1` it failed or the arguments were wrong, `130` it was
cancelled with Ctrl+C. A cancelled run keeps the work it already committed.

#### `--dry-run`

A dry run replaces the model with canned answers: a two-step plan, a Developer that writes one
file, a passing QA report, an approving review and an accept decision. Every call is still
recorded in `agent_calls` under the model name `dry-run`, which is priced at zero, so the loop,
the commits, the report and the per-step accounting can be checked without spending anything. It
still needs the database, and it still writes real files and real commits in the workspace.

### `agent`

Runs **one** agent against the workspace and prints its report. It needs `OPENAI_API_KEY` in
`.env`; it creates no branch and no commit, and the call is recorded in `agent_calls`.

```bash
npm run team -- agent developer "Add a sum(a, b) function in src/math.ts and export it" -w ../tmp-ws
npm run team -- agent reviewer "Review the current changes" -w ../tmp-ws
npm run team -- agent orchestrator:plan "Create a payment simulator" -w ../empty-ws
```

Roles: `developer`, `qa`, `reviewer`, `orchestrator:plan`. Options: `-w, --workspace <path>`,
`--no-stream` (wait for the whole answer instead of showing live tool calls),
`--max-turns <n>`.

### `tools`

Lists the workspace tools, whether they write and whether they need approval, and which tools
each role may use. Needs no API key.

```bash
npm run team -- tools
```

### `agents`

Prints the four agents of the team (name and role). The list lives in
`src/agents/agents.constants.ts`; the model each role runs on lives in
`src/agents/agents.config.ts` and can be overridden with `ORCHESTRATOR_MODEL`,
`DEVELOPER_MODEL`, `QA_MODEL` and `REVIEWER_MODEL`.

```bash
npm run team -- agents
```

```
NAME          ROLE
------------  ---------------------------------------------------------
Orchestrator  Splits the prompt into tasks and assigns them to the team
Developer     Writes and edits the code for the assigned tasks
QA            Writes and runs tests, reports defects
Reviewer      Reviews diffs and approves or rejects the result
```

### `usage`

| Option       | Default  | Description                    |
| ------------ | -------- | ------------------------------ |
| `--run <id>` | all runs | show the usage of a single run |

```bash
npm run team -- usage
npm run team -- usage --run 42
```

### `history`

| Option        | Default | Description                                                   |
| ------------- | ------- | ------------------------------------------------------------- |
| `--limit <n>` | `10`    | maximum number of entries to show; must be a positive integer |

```bash
npm run team -- history
npm run team -- history --limit 5
```

A non-numeric, zero, negative or fractional `--limit` prints an error and exits with code `1`.

## Database

PostgreSQL runs locally in Docker. The CLI itself still runs on the host — only the database is
containerised, and nothing connects to it yet (infrastructure only).

**Requirement:** Docker — Docker Desktop on Windows/macOS, Docker Engine on Linux.

```bash
cp .env.example .env   # local-only dev credentials
npm run db:up          # starts postgres and waits until it is healthy
```

All settings come from `.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` and
`POSTGRES_PORT`. Only `.env.example` is committed; `.env` is git-ignored.

| Script             | What it does                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `npm run db:generate` | Generates the Prisma client from `prisma/schema.prisma` (also runs on install and before a build). |
| `npm run db:migrate` | Applies the pending migrations (`prisma migrate deploy`). Commands that need the database do this themselves. |
| `npm run db:migrate:dev` | Creates a new migration from a schema change (development only).                                      |
| `npm run db:seed`  | Upserts the model prices of `prisma/seed.ts`. Runs automatically when the table is empty.                  |
| `npm run db:studio` | Opens Prisma Studio against the database.                                                                |
| `npm run db:up`    | Starts the `postgres` container in the background and waits for its healthcheck.                           |
| `npm run db:down`  | Stops and removes the container. **The data is kept** — the `postgres_data` volume stays.                  |
| `npm run db:reset` | Removes the container **and its volume**, then starts fresh. **All data is lost — this cannot be undone.** |
| `npm run db:logs`  | Follows the Postgres logs (`Ctrl+C` to stop).                                                              |
| `npm run db:psql`  | Opens a `psql` shell inside the container against `POSTGRES_DB`.                                           |

### Port already in use

If something else already listens on 5432, change the port in `.env` — and keep the port in
`DATABASE_URL` in sync, since it is a separate value:

```
POSTGRES_PORT=5433
DATABASE_URL=postgresql://aidev:aidev_password@localhost:5433/aidev
```

Then recreate the container with `npm run db:down && npm run db:up`. Only the host port changes;
inside the container Postgres always listens on 5432.

## Development

```bash
npm run build   # compile to dist/ with nest build
npm run lint    # eslint
npm test        # jest; there are no test files yet, so this passes with --passWithNoTests
```

After `npm run build` the CLI can also be run from the compiled output:

```bash
node dist/main.js agents
```

## Structure

```
src/
  main.ts                  CommandFactory bootstrap (no HTTP server)
  app.module.ts
  cli/
    cli.module.ts          registers all commands
    run.command.ts         the whole team on one prompt
    agent.command.ts       one agent on one task
    agents.command.ts
    usage.command.ts
    history.command.ts
  execution/
    execution.module.ts    the executor and the four ports it needs
    plan-executor.ts       owns one run: plan, steps, budget, report
    step-runner.ts         owns one step: Developer, QA, Reviewer, decision
    agents/                the AgentInvoker port and the canned --dry-run invoker
    checkpoint/            the run branch and one commit per accepted step
    persistence/           what the executor needs from the database
    report/                the final run report
  agents/
    agents.config.ts       which model each role runs on
  sdk/                     the only place that imports @openai/agents
  db/                      prisma, repositories, prices
```
