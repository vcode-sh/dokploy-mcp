# AGENTS.md -- project context for AI code review

## What this is

MCP (Model Context Protocol) server for the Dokploy API. v2 is Code Mode only: three public tools: `search`, `execute`, and `list_profiles`, backed by generated OpenAPI artifacts, a sandboxed runtime, and a generated Dokploy SDK. TypeScript, ES modules, Node >= 24.

## Architecture

- Entry: `src/index.ts` (CLI vs MCP server)
- Server: `src/server.ts` (registers Code Mode tools with `McpServer`)
- Public tools: `src/codemode/tools/search.ts`, `src/codemode/tools/execute.ts`, `src/codemode/tools/list-profiles.ts`
- Tool factory: `src/mcp/tool-factory.ts`
- Search context: `src/codemode/context/search-context.ts`
- Execute context: `src/codemode/context/execute-context.ts`
- Gateway: `src/codemode/gateway/*.ts`
- Sandbox: `src/codemode/sandbox/*.ts`
- Generated artifacts: `src/generated/*`
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
- Coverage: v8 provider, excludes entry shims `src/index.ts`, `src/cli/index.ts`, and generated code
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
- Public MCP tools should use `src/mcp/tool-factory.ts`
- No `any` unless truly unavoidable (warn, don't block)
- Security: no hardcoded credentials, no secrets in code, no command injection
