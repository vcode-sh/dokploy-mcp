# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

MCP server for the Dokploy API. 196 tools across 23 modules. Your AI agent can now deploy apps, manage databases, configure domains, and handle backups -- without you touching a dashboard.

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

- **196 tools, 23 modules** -- applications, compose, databases (Postgres/MySQL/MariaDB/MongoDB/Redis), domains, backups, Docker, settings, and more
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
| Project | 6 | Deployment | 2 |
| Application | 26 | Docker | 4 |
| Compose | 14 | Certificates | 4 |
| Domain | 8 | Registry | 6 |
| PostgreSQL | 13 | Destination | 6 |
| MySQL | 13 | Backup | 8 |
| MariaDB | 13 | Mounts | 4 |
| MongoDB | 13 | Port | 4 |
| Redis | 13 | Redirects | 4 |
| Security | 4 | Cluster | 4 |
| Settings | 25 | Admin | 1 |
| User | 1 | | |

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

## License

MIT - [Vibe Code](https://vcode.sh)
