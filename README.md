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

Runs a prompt against the agent team. Prints the prompt and the resolved absolute workspace path.

| Option                   | Default           | Description                                                                     |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------- |
| `-w, --workspace <path>` | current directory | workspace directory the agents work in; relative paths are resolved to absolute |
| `--no-tui`               | TUI enabled       | disable the interactive TUI and print plain text                                |

```bash
npm run team -- run "add a health endpoint"
npm run team -- run "demo" -w ../some-folder
npm run team -- run "demo" --no-tui
```

Without a prompt the command prints an error and exits with code `1`.

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
npm test        # jest unit tests
npm run lint    # eslint
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
    run.command.ts
    agents.command.ts
    usage.command.ts
    history.command.ts
  agents/
    agents.config.ts       typed agent list
```
