# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

MCP server for the Dokploy API. 377 tools across 35 modules. Your AI agent can now deploy apps, manage databases, configure domains, and handle backups -- without you touching a dashboard.

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

- **377 tools, 35 modules** -- applications, compose, environments, servers, Git providers, notifications, databases (Postgres/MySQL/MariaDB/MongoDB/Redis), domains, backups, deployment queues, rollback, patching, Docker, settings, preview deployments, schedules, and more
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

Resolution order: env vars > `~/.config/dokploy-mcp/config.json` > Dokploy CLI config.

## CLI

```bash
npx @vibetools/dokploy-mcp              # Start MCP server (stdio)
npx @vibetools/dokploy-mcp setup        # Interactive setup wizard (aliases: init, auth)
npx @vibetools/dokploy-mcp version      # Show version
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
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

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
