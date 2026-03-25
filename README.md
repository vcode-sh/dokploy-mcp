# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)

MCP server for the [Dokploy](https://dokploy.com) API. Two tools. Full API coverage. 99.8% fewer tokens than the alternative.

The default surface ships **Code Mode** -- `search` and `execute` -- which replaced 377 individual endpoint tools with a sandboxed SDK that runs multi-step workflows in a single call. Your agent searches the API catalog, writes a workflow, and the sandbox handles the rest. No more burning context window on tool definitions nobody reads.

Classic mode (377 tools, 35 modules) is still there for clients that need it. Think of it as the emergency exit you hope you'll never use.

## Quick start

API key from **Dokploy Settings > Profile > API/CLI**. Add to your MCP client:

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

Works in Claude Desktop, Claude Code, Cursor, VS Code, Windsurf -- anything that speaks MCP.

Already have the [Dokploy CLI](https://github.com/Dokploy/cli) authenticated? Drop the `env` block. Zero config.

### Setup wizard (optional)

```bash
npx @vibetools/dokploy-mcp setup
```

Validates credentials, saves to `~/.config/dokploy-mcp/config.json`.

## How Code Mode works

```
search  →  find the right Dokploy API procedures
execute →  run a multi-step workflow in one sandboxed call
```

One `execute` call can create an app, set env vars, mount volumes, deploy, verify, and clean up -- all without round-tripping through the model for each step.

**Token cost comparison:**

| | Classic | Code Mode |
|---|---|---|
| tools/list payload | ~92,354 tokens | ~218 tokens |
| Full lifecycle (8 API calls) | 8 tool calls = ~738k tokens on tool defs | 1 execute call = ~218 tokens |

That's not a typo. 99.8% reduction. The context window can finally be used for things that matter.

## Modes

| Mode | Tools | Use case |
|---|---|---|
| `codemode` (default) | `search`, `execute` | Agent workflows, production |
| `classic` | 377 endpoint tools | Legacy clients, debugging |

Switch modes: `DOKPLOY_MCP_MODE=classic` or `--mode classic`.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DOKPLOY_URL` | Yes | Dokploy panel URL |
| `DOKPLOY_API_KEY` | Yes | API key |
| `DOKPLOY_TIMEOUT` | No | Request timeout in ms (default: `30000`) |
| `DOKPLOY_MCP_MODE` | No | `codemode` or `classic` (default: `codemode`) |

<details>
<summary>Sandbox tuning (rarely needed)</summary>

| Variable | Default | Description |
|---|---|---|
| `DOKPLOY_MCP_SANDBOX_RUNTIME` | `subprocess` | `subprocess` or `local` |
| `DOKPLOY_MCP_SANDBOX_TIMEOUT_MS` | `30000` | Execution timeout |
| `DOKPLOY_MCP_SANDBOX_MAX_CALLS` | `25` | Max API calls per execute |
| `DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES` | `131072` | Max result size |
| `DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES` | `8192` | Max log output |
| `DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES` | `2097152` | Max cumulative response bytes |

</details>

Resolution order: env vars > `~/.config/dokploy-mcp/config.json` > Dokploy CLI config.

## API coverage

377 tools across 35 modules. 81% of the Dokploy OpenAPI surface. Full breakdown: **[docs/tools.md](docs/tools.md)**

## CLI

```bash
npx @vibetools/dokploy-mcp              # Code Mode (default)
npx @vibetools/dokploy-mcp --mode classic
npx @vibetools/dokploy-mcp setup        # Setup wizard
npx @vibetools/dokploy-mcp version
```

## Development

```bash
git clone https://github.com/vcode-sh/dokploy-mcp.git && cd dokploy-mcp
npm install && npm run build
npm run typecheck   # TypeScript 6
npm run lint        # Biome
npm test            # Vitest
npm run ci:budgets  # Protocol and runtime budgets
```

Test with MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
npx @modelcontextprotocol/inspector node dist/index.js --mode classic
```

Migration from v1: **[docs/migration-v2.md](docs/migration-v2.md)**

## Credits

Forked from [Dokploy/mcp](https://github.com/Dokploy/mcp). Started at 67 tools. Now at 377 with a whole new architecture on top.

[Mauricio Siu](https://github.com/Siumauricio) built [Dokploy](https://dokploy.com) -- the actual PaaS this thing talks to. Without the platform, this is a very elaborate way to make HTTP requests to nothing.

[Henrique Andrade](https://github.com/andradehenrique) wrote the original MCP server. 15 commits, every PR merged. The kind of contributor who ships.

And to everyone who opened PRs on the original -- merged or not -- your code shaped what this became:

[Joshua Macauley](https://github.com/Macawls) -- [lucasleal-developer](https://github.com/lucasleal-developer) -- [Nour Eddine Hamaidi](https://github.com/HenkDz) -- [Corey](https://github.com/limehawk) -- [Azil0ne](https://github.com/Azilone)

Unmerged PRs are still blueprints. That's how open source actually works -- not through clean merge histories, but through stolen inspiration with better commit messages.

## License

MIT - [Vibe Code](https://vcode.sh)

Original work by [Henrique Andrade](https://github.com/andradehenrique) under Apache 2.0 -- see [LICENSE-ORIGINAL](LICENSE-ORIGINAL).
