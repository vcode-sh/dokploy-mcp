# Contributing

Found a bug? Want a tool added? Just feel like improving something on a Sunday afternoon? Welcome. The bar is low but it does exist.

## Setup

```bash
git clone https://github.com/vcode-sh/dokploy-mcp.git
cd dokploy-mcp
npm install
```

**Requirements:** Node.js >= 22, npm. If you're still on Node 18, I can't help you. That's not sarcasm, it literally won't build.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run build` | Compile TypeScript to dist/ |
| `npm run dev` | Watch mode with auto-recompile |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome auto-fix |
| `npm run format` | Biome format |
| `npm start` | Run the built server |

## Project Structure

```
src/
  index.ts              # Entry point, routes CLI vs MCP server
  server.ts             # MCP server creation, tool registration
  api/client.ts         # Fetch-based API client, lazy config, ApiError
  config/types.ts       # Config types and platform paths
  config/resolver.ts    # Config resolution chain (env -> file -> CLI)
  cli/index.ts          # CLI command router
  cli/setup.ts          # Interactive setup wizard (@clack/prompts)
  tools/_factory.ts     # Tool creation helpers (createTool, postTool, getTool)
  tools/index.ts        # Aggregates all tool module exports
  tools/{module}.ts     # 24 domain modules (224 tools total)
```

One file per Dokploy API module. Each tool is a single `postTool()` or `getTool()` call. If you can read one, you can read all 224.

## Adding a New Tool

1. Find the module file in `src/tools/` (e.g., `application.ts`)
2. Add a `postTool()` or `getTool()` call with name, description, schema, endpoint
3. Use `.describe()` on all Zod schema parameters
4. Set `annotations: { destructiveHint: true }` for destructive operations
5. Add it to the module's exported array
6. `npm run build`

That's it. No registration step, no config file, no ceremony.

## The Rules

1. **Run `npm run lint` before committing.** Biome is strict. That's a feature, not a bug.
2. **Run `npm run typecheck`.** TypeScript strict mode is on. Deal with it.
3. **Use `import type` for type-only imports.** `verbatimModuleSyntax` will yell at you if you don't.
4. **ESM only.** No CommonJS. It's 2026. Let it go.
5. **All Zod schemas get `.strict()`.** No sneaky extra fields.
6. **ID parameters get `.min(1).describe()`.** Every time. No exceptions.

## Pull Requests

1. Fork it. Branch from `main`.
2. Make your changes. Run the whole suite.
3. `npm run lint && npm run typecheck && npm run build` -- all green or don't bother opening the PR. I will not debug your CI for you.
4. Write a real PR description. What changed, why, how to test it. "Fixed stuff" is not a description, it's a cry for help.
5. One PR per feature or fix. Don't bundle unrelated changes.

## Reporting Issues

- Include: Node version, OS, Dokploy version, what you did, what happened, what you expected. Minimum viable bug report.
- **Security vulnerabilities:** email hello@vcode.sh. Do NOT open a public issue. See [SECURITY.md](SECURITY.md).

## Style

Biome handles formatting. Don't fight it. Tabs for indentation, double quotes, no semicolons. If you disagree with any of these choices, you're entitled to your wrong opinion.

---

No CLA. No 47-page contributor agreement. No corporate nonsense. Just write good code and don't be terrible to people. That's genuinely it.
