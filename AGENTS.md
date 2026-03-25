# AGENTS.md -- project context for AI code review

## What this is

MCP (Model Context Protocol) server for the Dokploy API. 23 modules, 196 tools, full endpoint coverage. TypeScript, ES modules, Node >= 22.

## Architecture

- Entry: `src/index.ts` (routes CLI vs MCP server)
- Server: `src/server.ts` (registers all tools with McpServer)
- Tools: `src/tools/{module}.ts` -- each module exports tools via factory
- Factory: `src/tools/_factory.ts` (shared tool builder)
- Database helpers: `src/tools/_database.ts` (shared across postgres, mysql, mariadb, mongo, redis)
- Config: `src/config/resolver.ts` (env vars > config file > Dokploy CLI config)
- CLI: `src/cli/setup.ts` (interactive wizard using @clack/prompts)

## Code style

- Formatter/linter: Biome (not ESLint/Prettier)
- Single quotes, no semicolons, trailing commas, 2-space indent, 100 char line width
- `kebab-case` filenames (enforced by Biome)
- `useConst`, `useTemplate`, `useImportType`, `useExportType` -- all enforced
- No `forEach` -- use `for...of` or `.map()`
- No enums -- use const objects or union types
- Max cognitive complexity: 20

## Testing

- Framework: Vitest
- Tests in `tests/*.test.ts`
- Coverage: v8 provider, excludes `src/index.ts` and `src/cli/**`
- Run: `npm test` or `npm run test:coverage`

## Commands

```
npm run build        # tsc
npm run typecheck    # tsc --noEmit
npm run lint         # biome check .
npm run lint:fix     # biome check --write .
npm test             # vitest run
npm run test:coverage # vitest run --coverage
```

## Dependencies

- Runtime: `@modelcontextprotocol/sdk`, `zod` (v4), `@clack/prompts`
- Dev: `@biomejs/biome`, `vitest`, `typescript`

## Review guidelines

- Watch for unused imports/variables (Biome catches these, but still)
- API client calls must go through `src/api/client.ts` -- no raw fetch
- Tool definitions follow the factory pattern -- don't create one-off tool registrations
- No `any` unless truly unavoidable (warn, don't block)
- Security: no hardcoded credentials, no secrets in code, no command injection
