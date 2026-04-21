# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)

MCP server for [Dokploy](https://dokploy.com). Two tools by default. Generated API coverage and current protocol budgets are kept in sync from the generated catalog and budget checks.

Most MCP servers dump hundreds of tool schemas into your context window and call it a day. This one doesn't. **Code Mode** gives your agent `search` and `execute` -- it finds what it needs from a compact API catalog, writes a workflow, and the sandbox runs the whole thing in one call. Create an app, set env vars, mount volumes, configure domains, deploy -- all in a single round-trip.

v3 also adds:

- optional `raw` mode for one-tool-per-procedure MCP
- optional `hybrid` mode for Code Mode plus filtered raw tools
- Streamable HTTP transport with a health endpoint
- compatibility-aware errors when the MCP catalog is newer than the connected Dokploy server

The result is a dramatically smaller default MCP footprint.

<!-- docs-facts:readme:start -->
## Current Fact Snapshot

- Generated API procedures in the pinned catalog: `524`
- Generated tags: `48`
- Default public MCP tools: `2` (`search`, `execute`)
- Default `tools/list` footprint from the current budget check: about `669` tokens (`2,674` bytes)
- Reduction versus the classic endpoint-per-tool baseline (`92,354` tokens): `99.3%`

| | Classic endpoint-per-tool baseline | Current Code Mode default |
|---|---|---|
| Tool definitions sent | about `92,354` tokens | about `669` tokens |
| Public MCP tools | hundreds of endpoint schemas | `2` |
| Context window tax | wide schema dump | compact fixed surface |
<!-- docs-facts:readme:end -->

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
search   →  discover API procedures and their parameters
execute  →  run a multi-step workflow in one sandboxed call
```

`dokploy` and `helpers` are sandbox globals -- your agent writes bare code, no wrapper functions:

```js
// search
catalog.searchText("deploy")
catalog.get("application.one")

// execute -- just write code
await dokploy.settings.health()

// multi-step workflows
const app = await dokploy.application.one({ applicationId: "id", select: ["name", "status"] })
return app.name
```

One `execute` call can spin up an app, configure resource limits, set env vars, create file mounts, attach a domain with HTTPS, deploy, wait for it to come up, verify, and clean up. Eight API calls. One context window round-trip.

That remains the default public surface in v3. Raw MCP tools are now opt-in, not the baseline.

The managed fact snapshot above carries the current public footprint numbers, so the README stays aligned with the generated catalog and budget checks.

## Response shaping

Heavy endpoints like `application.one` return 25KB+ of data when you need 3 fields. Code Mode adds optional shaping parameters that trim responses **before** the sandbox counts bytes:

```js
// Select only the fields you need (96% reduction)
await dokploy.application.one({
  applicationId: "id",
  select: ["name", "applicationStatus", "mounts", "watchPaths"],
  includeDeployments: false
})

// Or limit deployment history instead of excluding it entirely
await dokploy.application.one({
  applicationId: "id",
  deploymentLimit: 1   // only the latest deployment
})
```

Without shaping params, behavior is identical to the raw Dokploy API -- fully backward compatible.

## Secret redaction

Git provider credentials (GitHub App private keys, client secrets, webhook secrets, Gitea/GitLab/Bitbucket tokens) are **automatically redacted** from all responses. Your AI agent sees `[REDACTED]` instead of the real values -- because leaking your private key into a context window is the kind of mistake you only make once.

Affected procedures: `application.one`, `application.many`, `github.one`, `gitea.one`, `gitlab.one`, `bitbucket.one`, `github.githubProviders`, `gitProvider.getAll`.

If you actually need the raw secrets (rotation scripts, migration, etc.), opt in explicitly:

```js
await dokploy.application.one({
  applicationId: "id",
  includeSecrets: true  // you asked for it
})

await dokploy.github.one({
  githubId: "id",
  includeSecrets: true
})
```

## Virtual helpers

Code Mode includes MCP-side helpers for common multi-call patterns. They run inside `execute`, fan out to real Dokploy API calls, and charge every underlying call against the sandbox budget honestly.

**Batch reads** -- inspect N apps without N separate tool calls:

```js
await dokploy.application.many({
  applicationIds: ["app-1", "app-2", "app-3"],
  select: ["name", "applicationStatus", "watchPaths"],
  includeDeployments: false
})
// Returns: { items: [...], total: 3 }
```

**Project overview** -- the entire project state in one call:

```js
await dokploy.project.overview({ projectId: "id" })
// Returns: { name, environments: [{ name, applications: [{ name, status, domains, mounts, watchPaths, lastDeployment }] }] }
```

These are discoverable via `search` (`catalog.get("application.many")`, `catalog.get("project.overview")`). They are MCP-side virtual procedures, not Dokploy HTTP endpoints.

v3 adds more Code Mode helpers for batched and infrastructure-oriented reads, including:

- `server.many`
- `project.infrastructureOverview`

## Sandbox helpers

Available as globals inside `execute`:

| Helper | Description |
|---|---|
| `helpers.sleep(ms)` | Async delay, max 15s. Use after deploy to wait for containers. |
| `helpers.assert(condition, msg)` | Quick validation. Throws on falsy. |
| `helpers.pick(obj, keys)` | Object projection. |
| `helpers.limit(arr, n)` | Array slicing. |
| `helpers.selectOne(arr, pred?)` | Find first match. |

## Configuration

| Variable | Required | Description |
|---|---|---|
| `DOKPLOY_URL` | Yes | Your Dokploy panel URL |
| `DOKPLOY_API_KEY` | Yes | API key from Dokploy settings |
| `DOKPLOY_TIMEOUT` | No | Request timeout in ms (default: `30000`) |
| `DOKPLOY_MCP_MODE` | No | `codemode` (default), `raw`, or `hybrid` |
| `DOKPLOY_ENABLED_TAGS` | No | Comma-separated tag filter for `raw` or `hybrid` mode |
| `DOKPLOY_MCP_TRANSPORT` | No | `stdio` (default) or `http` |
| `DOKPLOY_MCP_HTTP_HOST` | No | HTTP bind host (default: `127.0.0.1`) |
| `DOKPLOY_MCP_HTTP_PORT` | No | HTTP bind port (default: `3000`) |
| `DOKPLOY_MCP_HTTP_PATH` | No | MCP HTTP path (default: `/mcp`) |
| `DOKPLOY_MCP_HEALTH_PATH` | No | HTTP health path (default: `/health`) |

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

## Server modes

`codemode` is the default and still exposes only:

- `search`
- `execute`

If you explicitly want endpoint-per-tool MCP, v3 also supports:

- `raw` mode: one MCP tool per generated Dokploy procedure
- `hybrid` mode: Code Mode plus filtered raw tools

Examples:

```bash
npx @vibetools/dokploy-mcp serve-stdio --mode raw
npx @vibetools/dokploy-mcp serve-stdio --mode hybrid --enabled-tags project,application
```

## HTTP transport

v3 adds Streamable HTTP transport with a JSON health endpoint:

```bash
npx @vibetools/dokploy-mcp serve-http
```

Defaults:

- MCP endpoint: `/mcp`
- health endpoint: `/health`

Example:

```bash
DOKPLOY_MCP_MODE=hybrid DOKPLOY_ENABLED_TAGS=project,application npx @vibetools/dokploy-mcp serve-http
```

## What's in the box

The generated catalog tracks the pinned official Dokploy root OpenAPI snapshot, including the newer upstream surface for LibSQL, tags, infrastructure reads, and the additional procedures present in the official root OpenAPI document.

Your agent doesn't need to know any of this upfront. That's the point. It searches when it needs something, executes when it knows what to do.

## Compatibility

The generated MCP catalog can be newer than the connected Dokploy backend.

Example: during v3 development, the configured live backend still reported `v0.28.8`, while newer upstream procedures such as `settings.checkInfrastructureHealth` and `tag.all` already existed in the latest official OpenAPI.

When that happens, v3 returns compatibility-aware errors for known newer procedures instead of a generic not-found response.

## CLI

```bash
npx @vibetools/dokploy-mcp              # Start Code Mode server
npx @vibetools/dokploy-mcp serve-stdio  # Start stdio server explicitly
npx @vibetools/dokploy-mcp serve-http   # Start Streamable HTTP server
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
npm run docs:sync:facts  # Refresh script-managed factual sections
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
