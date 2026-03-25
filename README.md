# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)

MCP server for the Dokploy API. The default surface is now Code Mode with `search` and `execute`, while the classic compatibility surface still exposes 377 tools across 35 modules.

Forked from [Dokploy/mcp](https://github.com/Dokploy/mcp) and rebuilt with expanded API coverage, tool annotations, Zod v4 schemas, lazy config loading, and a setup wizard. The original had 67 tools. This one has 377. Standing on shoulders, etc.

## Quick Start

Grab your API key from **Dokploy Settings > Profile > API/CLI** and add this to your MCP client config:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

That's it. No setup wizard, no config files, no PhD.

### Alternative: setup wizard

If you prefer saving credentials to disk instead of env vars:

```bash
npx @vibetools/dokploy-mcp setup
```

Validates credentials, saves to `~/.config/dokploy-mcp/config.json`, and shows you the minimal MCP config to copy. After that, the `env` block is optional.

### Alternative: Dokploy CLI auto-detection

If you already have the [Dokploy CLI](https://github.com/Dokploy/cli) installed and authenticated -- zero config needed. It just works.

## Features

- **Default Code Mode surface** -- compact `search` / `execute` tooling backed by generated OpenAPI artifacts and a compact API catalog
- **Classic compatibility surface** -- 377 tools across 35 modules for endpoint-per-tool workflows
- **Tool annotations** -- `readOnlyHint`, `destructiveHint`, `idempotentHint` so clients can warn before you nuke something
- **Type-safe schemas** -- Zod v4 validation on every parameter
- **Lazy config loading** -- validates credentials on first API call, not at startup
- **Three config sources** -- env vars > config file > Dokploy CLI (first match wins)
- **Minimal dependencies** -- just `@modelcontextprotocol/sdk`, `zod`, and `@clack/prompts`

## MCP Client Config

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

Already ran `setup` or have Dokploy CLI authenticated? Drop the `env` block entirely.

## Tools

| Module | Tools | Module | Tools |
|--------|-------|--------|-------|
| Project | 8 | Deployment | 8 |
| Environment | 7 | Docker | 7 |
| Application | 29 | Server | 16 |
| Compose | 28 | Certificates | 4 |
| Domain | 9 | Registry | 6 |
| Patch | 12 | SSH Key | 6 |
| Git Provider | 2 | GitHub | 6 |
| GitLab | 7 | PostgreSQL | 14 |
| Notification | 38 | MySQL | 14 |
| Destination | 6 | MariaDB | 14 |
| Backup | 11 | MongoDB | 14 |
| Mounts | 6 | Redis | 14 |
| Port | 4 | Volume Backups | 6 |
| Redirects | 4 | Rollback | 2 |
| Preview Deployment | 4 | Schedule | 6 |
| Security | 4 | Cluster | 4 |
| Settings | 49 | Admin | 1 |
| User | 7 | | |

Full reference with parameters and descriptions: **[docs/tools.md](docs/tools.md)**

API coverage report: **[docs/coverage.md](docs/coverage.md)**

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DOKPLOY_URL` | Yes | Dokploy panel URL -- automatically normalized to `/api/trpc` |
| `DOKPLOY_API_KEY` | Yes | API key from Dokploy Settings > API |
| `DOKPLOY_TIMEOUT` | No | Request timeout in ms (default: `30000`) |
| `DOKPLOY_MCP_MODE` | No | `codemode` or `classic` (default: `codemode`) |
| `DOKPLOY_MCP_SANDBOX_RUNTIME` | No | `subprocess` or `local` (default: `subprocess`) |
| `DOKPLOY_MCP_SANDBOX_TIMEOUT_MS` | No | Code Mode timeout in ms (default: `5000`) |
| `DOKPLOY_MCP_SANDBOX_MAX_CALLS` | No | Max Dokploy API calls per `execute` run (default: `25`) |
| `DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES` | No | Max serialized result bytes (default: `131072`) |
| `DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES` | No | Max captured log bytes (default: `8192`) |
| `DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES` | No | Max cumulative Dokploy response bytes per run (default: `2097152`) |

Resolution order: env vars > `~/.config/dokploy-mcp/config.json` > Dokploy CLI config.

### Mode Selection

The current package ships with two server surfaces:

- `codemode` -- the default v2 surface
- `classic` -- the current endpoint-based compatibility surface

Mode selection:

- default: `codemode`
- environment variable: `DOKPLOY_MCP_MODE=classic|codemode`
- CLI flag: `--mode classic|codemode`

The `codemode` surface is intentionally tiny and currently exposes:

- `search`
- `execute`

Use `classic` only when you explicitly need the legacy endpoint-per-tool MCP surface.

Current benchmark snapshot:

- classic `tools/list`: about `92,354` tokens
- codemode `tools/list`: about `218` tokens
- `search` p95 in the current budget run: about `51.87ms`
- `execute` p95 in the current budget run: about `47.92ms`
- broad `search` result: about `26.9 KB`
- sandbox startup p95 in the current benchmark: about `1.05ms`

### Code Mode workflow

Recommended agent workflow in `codemode`:

1. call `search`
2. narrow the Dokploy API surface to the relevant procedures
3. call `execute`
4. let the sandboxed workflow perform multiple Dokploy API calls in one run
5. return only the final result, logs, and call trace

The goal is to avoid pushing every intermediate Dokploy response back through the model.

### Sandbox limits

The current Code Mode sandbox:

- blocks direct access to `process`
- blocks direct access to `fetch`
- blocks direct access to `require`
- blocks direct access to `Function`, `eval`, `WebAssembly`, and `SharedArrayBuffer`
- enforces limits on:
  - execution timeout
  - number of Dokploy API calls
  - log bytes
  - serialized result bytes
  - cumulative Dokploy response bytes

The default runtime is `subprocess`, with `local` available as an explicit fallback for deterministic tests or constrained environments.

## CLI

```bash
npx @vibetools/dokploy-mcp              # Start MCP server (stdio)
npx @vibetools/dokploy-mcp --mode classic
npx @vibetools/dokploy-mcp setup        # Interactive setup wizard (aliases: init, auth)
npx @vibetools/dokploy-mcp version      # Show version
```

Local binaries after build:

```bash
npm run start           # Default Code Mode surface
npm run start:classic   # Classic endpoint-based MCP surface
npm run start:codemode  # Explicit Code Mode surface
```

## Development

```bash
git clone https://github.com/vcode-sh/dokploy-mcp.git
cd dokploy-mcp
npm install && npm run build
```

Point your MCP client at the local build:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "node",
      "args": ["/path/to/dokploy-mcp/dist/index.js"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

```bash
npm run dev        # Watch mode
npm run typecheck  # Type-check
npm run lint       # Lint with Biome
npm run lint:fix   # Auto-fix
npm run ci:budgets # Protocol and runtime budgets
npm run ci:full    # Full local validation with live Dokploy smoke calls
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Classic mode in Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js --mode classic
```

Code Mode example:

```bash
node dist/index.js
```

Classic compatibility example:

```bash
node dist/index-classic.js
```

v2 migration notes: **[docs/migration-v2.md](docs/migration-v2.md)**

## Standing on the Shoulders of People Who Actually Did the Work

This project is a fork of [Dokploy/mcp](https://github.com/Dokploy/mcp). I rewrote most of it, tripled the tool count, and added things like a setup wizard and config resolution chain -- but "rewrote" is easy when someone else already built the thing you're rewriting.

[Mauricio Siu](https://github.com/Siumauricio) created [Dokploy](https://dokploy.com) itself -- a genuinely impressive open-source PaaS -- and kicked off the MCP server repo. Without Dokploy, there's no API. Without the API, there's no MCP server. Without the MCP server, I'd have had to start from zero instead of "from scratch."

[Henrique Andrade](https://github.com/andradehenrique) did the actual heavy lifting on the original MCP. Projects, applications, PostgreSQL, MySQL, domains -- that was all him. 15 commits, every merged PR. The kind of contributor who doesn't just open issues, he closes them.

And to everyone who opened PRs on the original repo -- merged or not -- your code and ideas shaped what this became:

[Joshua Macauley](https://github.com/Macawls) · [lucasleal-developer](https://github.com/lucasleal-developer) · [Nour Eddine Hamaidi](https://github.com/HenkDz) · [Corey](https://github.com/limehawk) · [Azil0ne](https://github.com/Azilone)

Unmerged PRs are still blueprints. Someone reads your compose tools PR and thinks "right, I should cover that." Someone sees your consolidation approach and borrows the idea. That's how open source actually works -- not through clean merge histories, but through stolen inspiration with better commit messages.

Cheers to all of you. I owe you mass-produced coffee at minimum.

## License

MIT - [Vibe Code](https://vcode.sh)

Original work by [Henrique Andrade](https://github.com/andradehenrique) under Apache 2.0 -- see [LICENSE-ORIGINAL](LICENSE-ORIGINAL).
