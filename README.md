# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)

MCP server for [Dokploy](https://dokploy.com). Two tools. 463 API procedures. Your AI agent can now deploy, configure, and manage your entire infrastructure without memorizing 377 endpoint definitions first.

Most MCP servers dump hundreds of tool schemas into your context window and call it a day. This one doesn't. **Code Mode** gives your agent `search` and `execute` -- it finds what it needs from a compact API catalog, writes a workflow, and the sandbox runs the whole thing in one call. Create an app, set env vars, mount volumes, configure domains, deploy -- all in a single round-trip.

The result: **99.8% fewer tokens** on tool definitions. Your context window can go back to doing its actual job.

> Previously: 377 tools = ~92,354 tokens just to list them. Now: 2 tools = ~218 tokens. The math is embarrassing for everyone else.

## Quick start

Grab your API key from **Dokploy Settings > Profile > API/CLI**:

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

Drop this into Claude Desktop, Claude Code, Cursor, VS Code, Windsurf -- anything that speaks MCP. Done. No ceremony.

Already have the [Dokploy CLI](https://github.com/Dokploy/cli) authenticated? Skip the `env` block entirely. It just works.

Want a wizard? `npx @vibetools/dokploy-mcp setup` -- validates credentials, saves config, holds your hand exactly once.

## How it works

Your agent gets two tools:

```
search   →  "what can Dokploy do with applications?"
execute  →  runs a multi-step workflow in one sandboxed call
```

One `execute` call can spin up an app, configure resource limits, set 5 env vars, create 3 file mounts, attach a domain with HTTPS, deploy, wait for it to come up, verify it's running, and clean up after itself. Eight API calls. One context window round-trip. Sub-second sandbox overhead.

**What this looks like in practice:**

| | Old way (endpoint-per-tool) | Code Mode |
|---|---|---|
| Tool definitions sent | ~92,354 tokens (377 tools) | ~218 tokens (2 tools) |
| Deploy workflow (8 API calls) | 8 round-trips through the model | 1 execute call, done |
| Context window tax | ~738k tokens on tool schemas alone | ~218 tokens total |

That last row is why this exists. Every token spent on tool definitions is a token your agent can't use for reasoning. We just gave you 738k of them back.

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DOKPLOY_URL` | Yes | Your Dokploy panel URL |
| `DOKPLOY_API_KEY` | Yes | API key from Dokploy settings |
| `DOKPLOY_TIMEOUT` | No | Request timeout in ms (default: `30000`) |

Resolution order: env vars > `~/.config/dokploy-mcp/config.json` > Dokploy CLI config. First match wins.

<details>
<summary>Sandbox tuning -- for when the defaults aren't enough drama</summary>

| Variable | Default | What it does |
|---|---|---|
| `DOKPLOY_MCP_SANDBOX_TIMEOUT_MS` | `30000` | How long before the sandbox gives up on your workflow |
| `DOKPLOY_MCP_SANDBOX_MAX_CALLS` | `25` | Max API calls per execute (prevents runaway loops) |
| `DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES` | `131072` | Max result payload (128 KB) |
| `DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES` | `2097152` | Cumulative API response cap (2 MB) |
| `DOKPLOY_MCP_SANDBOX_RUNTIME` | `subprocess` | `subprocess` (isolated) or `local` (faster, less safe) |

</details>

## What's in the box

The Code Mode catalog covers the full Dokploy OpenAPI surface -- 463 procedures across every module. Applications, compose stacks, databases (Postgres, MySQL, MariaDB, MongoDB, Redis), domains, certificates, Docker, servers, backups, notifications, and about 30 more categories you'll discover when you need them.

Your agent doesn't need to know any of this upfront. That's the point. It searches when it needs something, executes when it knows what to do.

Coverage details: **[docs/coverage.md](docs/coverage.md)**

## CLI

```bash
npx @vibetools/dokploy-mcp              # Start Code Mode server
npx @vibetools/dokploy-mcp setup        # Interactive setup
npx @vibetools/dokploy-mcp version      # Because you'll be asked
```

## Development

```bash
git clone https://github.com/vcode-sh/dokploy-mcp.git && cd dokploy-mcp
npm install && npm run build
npm run typecheck   # TypeScript 6
npm run lint        # Biome
npm test            # Vitest
npm run ci:budgets  # Protocol and runtime budget checks
```

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Credits

Forked from [Dokploy/mcp](https://github.com/Dokploy/mcp). Started at 67 tools, mass-refactored to 377, then rebuilt the whole thing into an architecture that makes the tool count irrelevant.

[Mauricio Siu](https://github.com/Siumauricio) built [Dokploy](https://dokploy.com) itself -- the PaaS this server talks to. Without the platform, this is a very elaborate way to POST into the void.

[Henrique Andrade](https://github.com/andradehenrique) wrote the original MCP server. 15 commits, every PR merged. The kind of contributor who closes issues instead of opening them.

Contributors who shaped the original: [Joshua Macauley](https://github.com/Macawls) -- [lucasleal-developer](https://github.com/lucasleal-developer) -- [Nour Eddine Hamaidi](https://github.com/HenkDz) -- [Corey](https://github.com/limehawk) -- [Azil0ne](https://github.com/Azilone)

Unmerged PRs are still blueprints. That's how open source works -- stolen inspiration with better commit messages.

## License

MIT - [Vibe Code](https://vcode.sh)

Original work by [Henrique Andrade](https://github.com/andradehenrique) under Apache 2.0 -- see [LICENSE-ORIGINAL](LICENSE-ORIGINAL).
