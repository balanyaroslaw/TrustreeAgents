# TrusteeAgent CLI

A multi-agent command line tool that builds and maintains a software product **only from
prompts**. An Orchestrator plans the work, a Developer writes the code, QA writes and runs the
tests, a Reviewer inspects the result, and the Orchestrator decides after each step. The product
(here: a Payment Processing Simulator) lives in a separate git repository, the *workspace*; this
repository contains only the agent system.

Built with NestJS (application context only, no HTTP server), `nest-commander`, PostgreSQL +
Prisma for run history and cost tracking, and the OpenAI Agents SDK.

## Requirements

- Node.js **22+** and npm
- Docker (Docker Desktop on Windows/macOS, Docker Engine on Linux)
- An OpenAI API key (not needed for `--dry-run`)

## Quick start: build the Payment Simulator

### 1. Set up the agent system (once)

```bash
npm install
cp .env.example .env          # local-only dev credentials
# edit .env and set OPENAI_API_KEY=...
npm run db:up                 # starts PostgreSQL for the agent system and waits until healthy
npm run db:migrate            # applies the migrations
```

Check that everything loads:

```bash
npm run team -- agents        # the four agents
npm run team -- tools         # the workspace tools and who may use them
npm run team -- prices --help # how to read or set model prices (used for cost reports)
```

Models can be changed per role in `.env`: `ORCHESTRATOR_MODEL`, `DEVELOPER_MODEL`, `QA_MODEL`,
`REVIEWER_MODEL`.

### 2. Free smoke test (no model calls)

```bash
mkdir ../smoke && cd ../smoke && git init -q && git commit -q --allow-empty -m init && cd -
npm run team -- run "demo" -w ../smoke --dry-run --yes
```

A dry run uses canned answers and spends nothing, but it exercises the whole loop: plan, steps,
commits, report.

### 3. Create an empty workspace

The workspace must be a git repository with a clean working tree.

```bash
mkdir ../payment-sim && cd ../payment-sim
git init -q && git commit -q --allow-empty -m init
cd -
```

### 4. Run the real build

The product specification is a prompt file in `prompts/`:

```bash
npm run team -- run "$(cat prompts/payment-simulator-final.md)" -w ../payment-sim --budget 8000000
```

The run prints the models and the budget, shows the plan and asks for confirmation (`--yes` skips
the question). A full build takes roughly 30 minutes and 4 to 5 million tokens. `Ctrl+C` is safe:
steps that were already accepted stay committed.

### 5. Look at the result

The run ends with a summary like:

```
status: completed
branch: agent/run-<id>
steps: 4 of 4 accepted
report: reports/run-<id>.md
```

```bash
cat ../payment-sim/reports/run-<id>.md   # plan, per-step result, findings, metrics
npm run team -- usage --run <id>         # tokens and cost per agent
npm run team -- history                  # all runs
```

Every accepted step is one commit on the branch `agent/run-<id>`; nothing is ever pushed.

### 6. Run the generated product

```bash
cd ../payment-sim
git checkout agent/run-<id>
cat README.md                    # the product's own README is authoritative
```

Typical sequence (the product README has the exact commands):

```bash
docker compose up -d --wait      # PostgreSQL on 127.0.0.1:55432
npm ci
npm test                         # unit + integration tests; run it twice to see it is repeatable
npm start                        # start the API
```

In a second terminal, create a payment and simulate the provider:

```bash
curl -s -X POST http://localhost:3000/payments \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: demo-key-0001' \
  -d '{"amount":1250,"currency":"USD"}'

npm run webhook -- <paymentId> authorized
npm run webhook -- <paymentId> captured
npm run webhook -- <paymentId> captured      # replay: nothing changes

curl -s "http://localhost:3000/payments?status=captured"   # status and full history
```

### 7. Change the product with prompts

Merge the accepted branch first so changes build on it:

```bash
cd ../payment-sim && git checkout main && git merge agent/run-<id> && cd -
```

Then each change is another prompt on the same workspace.

Add partial refunds:

```bash
npm run team -- run "Add partial refunds: a payment can be refunded several times, the total \
of refunds never exceeds the original amount, refunds use the payment's currency. Update the \
API, the data model, the documentation and the automated tests." -w ../payment-sim --budget 4000000
```

Fix a defect and prove the fix:

```bash
npm run team -- run "Concurrent identical webhook deliveries sometimes process a payment twice. \
Find the cause, fix it and prove the fix with automated tests that run the deliveries \
concurrently against the real database." -w ../payment-sim --budget 4000000
```

### 8. When a run gets stuck or fails

- `Ctrl+C` once stops the run; committed steps are kept. If it does not react:
  `pkill -f "src/main.ts"`.
- Read `reports/run-<id>.md` of the failed run first: the *Why it failed* section and the
  per-step *Ended early* lines show whether an agent hit `max_turns`, the token cap or a failing
  test.
- Leftover edits of a failed run block the next one (the workspace must be clean):

  ```bash
  cd ../payment-sim && git reset --hard && git clean -fd
  ```

- Port 55432 already allocated: another container holds it.

  ```bash
  docker ps -a --format '{{.Names}}\t{{.Ports}}\t{{.Status}}'
  docker rm -f <container-holding-55432>
  ```

  Do not remove the agent system's own database container (port 5432).
- Costs: `npm run team -- usage --run <id>`. If a cost shows `$0`, the model has no price; set
  it with `npm run team -- prices --help`.

## Commands

Commands run through the `team` script:

```bash
npm run team -- <command> [options]
npm run team -- --help
npm run team -- run --help
```

### `run "<prompt>"`

Runs a prompt against the whole team. The Orchestrator plans the work, then every step runs the
Developer, QA and the Reviewer, the Orchestrator decides what to do with the result, and accepted
steps are committed one per step on an `agent/run-<id>` branch. The run ends with
`reports/run-<id>.md` in the workspace. Nothing is ever pushed.

It needs `OPENAI_API_KEY` in `.env` and a running database, unless you pass `--dry-run`.

| Option                   | Default            | Description                                                                     |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------- |
| `-w, --workspace <path>` | current directory  | workspace directory the agents work in; relative paths are resolved to absolute |
| `--no-tui`               | TUI enabled        | disable the interactive TUI and print plain text; also makes the run unattended  |
| `--budget <tokens>`      | `200000`           | how many tokens the whole run may spend; it stops as `failed` when they run out  |
| `--max-steps <n>`        | every planned step | run at most this many plan steps; the rest are skipped                          |
| `--dry-run`              | off                | exercise the whole run on canned answers, calling no model and spending nothing  |
| `--yes`                  | off                | do not ask for confirmation of the plan before the steps run                    |

```bash
npm run team -- run "add a health endpoint"
npm run team -- run "demo" -w ../some-folder --budget 50000
npm run team -- run "demo" --max-steps 1
npm run team -- run "demo" --dry-run --yes
```

The budget and the model of every role are printed before the first model call.

Exit codes: `0` the run completed, `1` it failed or the arguments were wrong, `130` it was
cancelled with Ctrl+C. A cancelled run keeps the work it already committed.

#### `--dry-run`

A dry run replaces the model with canned answers: a two-step plan, a Developer that writes one
file, a passing QA report, an approving review and an accept decision. Every call is still
recorded in `agent_calls` under the model name `dry-run`, which is priced at zero. It still needs
the database, and it still writes real files and real commits in the workspace.

### `agent`

Runs **one** agent against the workspace and prints its report. It needs `OPENAI_API_KEY`; it
creates no branch and no commit, and the call is recorded in `agent_calls`.

```bash
npm run team -- agent developer "Add a sum(a, b) function in src/math.ts and export it" -w ../tmp-ws
npm run team -- agent reviewer "Review the current changes" -w ../tmp-ws
npm run team -- agent orchestrator:plan "Create a payment simulator" -w ../empty-ws
```

Roles: `developer`, `qa`, `reviewer`, `orchestrator:plan`. Options: `-w, --workspace <path>`,
`--no-stream` (wait for the whole answer instead of showing live tool calls), `--max-turns <n>`.

### `tools`

Lists the workspace tools, whether they write and whether they need approval, and which tools
each role may use. Needs no API key.

### `agents`

Prints the four agents of the team (name and role). The model each role runs on lives in
`src/agents/agents.config.ts` and can be overridden with `ORCHESTRATOR_MODEL`,
`DEVELOPER_MODEL`, `QA_MODEL` and `REVIEWER_MODEL`.

### `usage`

| Option       | Default  | Description                    |
| ------------ | -------- | ------------------------------ |
| `--run <id>` | all runs | show the usage of a single run |

### `history`

| Option        | Default | Description                                                   |
| ------------- | ------- | ------------------------------------------------------------- |
| `--limit <n>` | `10`    | maximum number of entries to show; must be a positive integer |

### `prices`

Reads and sets the per-model prices used for cost reports. Prices live in the `model_prices`
table, never in code. See `npm run team -- prices --help`.

## Database (agent system)

PostgreSQL runs locally in Docker and stores runs, plan steps, attempts, agent calls and model
prices. The CLI itself runs on the host; only the database is containerised.

```bash
cp .env.example .env
npm run db:up
npm run db:migrate
```

All settings come from `.env`: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
`POSTGRES_PORT` and `DATABASE_URL`. Only `.env.example` is committed; `.env` is git-ignored.

| Script                   | What it does                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `npm run db:generate`    | Generates the Prisma client (also runs on install and before a build).                     |
| `npm run db:migrate`     | Applies the pending migrations (`prisma migrate deploy`).                                  |
| `npm run db:migrate:dev` | Creates a new migration from a schema change (development only).                           |
| `npm run db:seed`        | Upserts the model prices of `prisma/seed.ts`. Runs automatically when the table is empty.  |
| `npm run db:studio`      | Opens Prisma Studio against the database.                                                  |
| `npm run db:up`          | Starts the `postgres` container in the background and waits for its healthcheck.           |
| `npm run db:down`        | Stops and removes the container. **The data is kept**; the volume stays.                   |
| `npm run db:reset`       | Removes the container **and its volume**, then starts fresh. **All data is lost.**         |
| `npm run db:logs`        | Follows the Postgres logs.                                                                 |
| `npm run db:psql`        | Opens a `psql` shell inside the container.                                                 |

### Port already in use

If something else listens on 5432, change the port in `.env` and keep `DATABASE_URL` in sync:

```
POSTGRES_PORT=5433
DATABASE_URL=postgresql://aidev:aidev_password@localhost:5433/aidev
```

Then recreate the container with `npm run db:down && npm run db:up`.

## Development

```bash
npm run build   # compile to dist/ with nest build
npm run lint    # eslint
npm test        # unit tests of the agent system
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
  cli/                     commands: run, agent, agents, tools, usage, history, prices
  execution/
    plan-executor.ts       owns one run: plan, steps, budget, report
    step-runner.ts         owns one step: Developer, QA, Reviewer, decision
    agents/                the AgentInvoker port and the canned --dry-run invoker
    checkpoint/            the run branch and one commit per accepted step
    persistence/           what the executor needs from the database
    report/                the final run report
  agents/                  agent definitions and the model of each role
  tools/                   workspace tools (read, write, edit, delete, list, search, run, git)
  sdk/                     the only place that imports @openai/agents
  db/                      prisma, repositories, prices
prompts/                   product specifications and change requests passed to `run`
```

Core code never imports from `src/cli` or `src/tui`; it only emits events.