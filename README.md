# @vibetools/dokploy-mcp

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)

MCP server for [Dokploy](https://dokploy.com) that works cleanly with Codex, Cursor, Claude Code,
and Claude Desktop.

Three tools up front. Hundreds of Dokploy procedures underneath. Less schema tax, more actual
deploys.

Most MCP servers treat your context window like free landfill. This one starts with
`search`, `execute`, and `list_profiles`, then earns the rest.

What that buys you:

- compact default surface instead of hundreds of raw endpoint tools
- generated, broad Dokploy coverage underneath
- real workflows for deploys, compose, logs, domains, databases, and profiles
- local `stdio` plus hosted HTTP metadata in the same package

Need proof instead of a sales monologue? Start with [docs/live-e2e-proof.md](./docs/live-e2e-proof.md).

<!-- docs-facts:readme:start -->
## Current Fact Snapshot

- Generated API procedures in the pinned catalog: `524`
- Generated tags: `48`
- Default public MCP tools: `3` (`search`, `execute`, `list_profiles`)
- Default `tools/list` footprint from the current budget check: about `1,681` tokens (`6,723` bytes)
- Reduction versus the classic endpoint-per-tool baseline (`92,354` tokens): `98.2%`

| | Classic endpoint-per-tool baseline | Current Code Mode default |
|---|---|---|
| Tool definitions sent | about `92,354` tokens | about `1,681` tokens |
| Public MCP tools | hundreds of endpoint schemas | `3` |
| Context window tax | wide schema dump | compact fixed surface |
<!-- docs-facts:readme:end -->

## Quick Start

Get your API key from **Dokploy Settings > Profile > API/CLI**.

If your client uses a JSON-style MCP config, this is the whole block:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "dokp_..."
      }
    }
  }
}
```

If your client uses CLI-based MCP management:

```bash
# Codex
codex mcp add dokploy \
  --env DOKPLOY_URL=https://panel.example.com \
  --env DOKPLOY_API_KEY=dokp_... \
  -- npx @vibetools/dokploy-mcp

# Claude Code
claude mcp add --transport stdio \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=dokp_... \
  dokploy -- npx @vibetools/dokploy-mcp
```

Already authenticated with the [Dokploy CLI](https://github.com/Dokploy/cli) or local
`dokploy-mcp` config?

You may not need the env block at all.

Using multiple Dokploy organizations?

Keep one compact MCP server and configure profiles with `DOKPLOY_PROFILES_JSON`:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_PROFILES_JSON": "{\"redivo\":{\"url\":\"https://redivo.example.com\",\"apiKey\":\"dokp_redivo\"},\"personal\":{\"url\":\"https://personal.example.com\",\"apiKey\":\"dokp_personal\"},\"mezon\":{\"url\":\"https://mezon.example.com\",\"apiKey\":\"dokp_mezon\"}}"
      }
    }
  }
}
```

Use `list_profiles` to see the available default and named profile targets without exposing API
keys. Pass `profile` to `execute` when you want a named profile instead of the default target:

```json
{
  "profile": "redivo",
  "code": "return await dokploy.project.all()"
}
```

`search` also accepts an optional `profile` argument for profile-name validation while preserving
the same compact catalog behavior.

Hosted HTTP sessions keep their request-scoped remote credentials bound to the session. Named local
profiles are not exposed there.

Want the wizard path instead of manual config?

```bash
npx @vibetools/dokploy-mcp setup
```

## Pick Your Client

- [Docs Home](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Cursor](./docs/clients/cursor.md)
- [Codex](./docs/clients/codex.md)
- [Claude Code](./docs/clients/claude-code.md)
- [Claude Desktop](./docs/clients/claude-desktop.md)

## What You Actually Get

- `search`: discover Dokploy procedures and contracts
- `execute`: run multi-step workflows in one sandboxed call
- `list_profiles`: list configured Dokploy profile names and URLs without secrets
- optional `raw` mode: one tool per procedure
- optional `hybrid` mode: Code Mode plus selected raw tools
- optional hosted HTTP path with `server.json` metadata and header-based remote auth

If you are new, use the default mode and stop trying to outsmart a problem that already has a
working shape.

## Read These Next

- [docs/getting-started.md](./docs/getting-started.md)
- [docs/guides/profiles.md](./docs/guides/profiles.md)
- [docs/guides/modes.md](./docs/guides/modes.md)
- [docs/guides/compose.md](./docs/guides/compose.md)
- [docs/guides/hosted-http.md](./docs/guides/hosted-http.md)
- [docs/guides/troubleshooting.md](./docs/guides/troubleshooting.md)
- [docs/live-e2e-proof.md](./docs/live-e2e-proof.md)

## CLI

```bash
npx @vibetools/dokploy-mcp
npx @vibetools/dokploy-mcp serve-stdio
npx @vibetools/dokploy-mcp serve-http
npx @vibetools/dokploy-mcp setup
npx @vibetools/dokploy-mcp version
```

## Development

```bash
git clone https://github.com/vcode-sh/dokploy-mcp.git && cd dokploy-mcp
npm install
npm run build
npm run lint
npm test
npm run docs:check:facts
```

The rest lives in [docs](./docs/README.md), where it belongs.

## Credits

Forked from [Dokploy/mcp](https://github.com/Dokploy/mcp). Started at 67 tools, mass-refactored to 377, then rebuilt the whole thing into an architecture that makes the tool count irrelevant.

[Mauricio Siu](https://github.com/Siumauricio) built [Dokploy](https://dokploy.com) itself -- the PaaS this server talks to. Without the platform, this is a very elaborate way to POST into the void.

[Henrique Andrade](https://github.com/andradehenrique) wrote the original MCP server. 15 commits, every PR merged. The kind of contributor who closes issues instead of opening them.

Contributors who shaped the original: [Joshua Macauley](https://github.com/Macawls) -- [lucasleal-developer](https://github.com/lucasleal-developer) -- [Nour Eddine Hamaidi](https://github.com/HenkDz) -- [Corey](https://github.com/limehawk) -- [Azil0ne](https://github.com/Azilone)

Unmerged PRs are still blueprints. That's how open source works -- stolen inspiration with better commit messages.

## License

MIT - [Vibe Code](https://vcode.sh)

Original work by [Henrique Andrade](https://github.com/andradehenrique) under Apache 2.0 -- see [LICENSE-ORIGINAL](LICENSE-ORIGINAL).
