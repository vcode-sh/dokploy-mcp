# Migration to v2 Code Mode

## What changed

v1 exposed 377 endpoint tools. Every request sent ~92k tokens of tool definitions. Your agent spent more time reading the menu than ordering.

v2 ships **Code Mode** as the default -- two tools, 218 tokens:

- `search` -- find Dokploy API procedures from a compact catalog
- `execute` -- run multi-step workflows in a sandboxed SDK

The agent searches, writes a workflow, and the sandbox handles multiple API calls in a single round-trip. No more context window arson.

## Classic mode

Still available. Set `DOKPLOY_MCP_MODE=classic` or `--mode classic`.

Use it when:
- Your client doesn't support code execution in tool calls
- You're debugging a specific endpoint
- You enjoy burning tokens (we don't judge)

## Code Mode workflow

```
1. search  →  discover relevant procedures
2. execute →  multi-step workflow in one sandbox call
```

The sandbox provides:
- `dokploy.*` -- full SDK with all 47 API modules
- `helpers.sleep(ms)` -- async delay (max 15s)
- `helpers.assert(condition, message)` -- quick validation
- `helpers.pick(obj, keys)` -- object projection
- `helpers.limit(items, n)` -- array slicing
- `helpers.selectOne(items, predicate?)` -- find first match
- `helpers.paginateUntil(fetchPage, predicate)` -- paginated search

## Sandbox limits

| Limit | Default | Env var |
|---|---|---|
| Timeout | 30s | `DOKPLOY_MCP_SANDBOX_TIMEOUT_MS` |
| API calls | 25 | `DOKPLOY_MCP_SANDBOX_MAX_CALLS` |
| Result bytes | 128 KB | `DOKPLOY_MCP_SANDBOX_MAX_RESULT_BYTES` |
| Log bytes | 8 KB | `DOKPLOY_MCP_SANDBOX_MAX_LOG_BYTES` |
| Response bytes | 2 MB | `DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES` |
| Heap delta | 16 MB | `DOKPLOY_MCP_SANDBOX_MAX_HEAP_DELTA_BYTES` |

The sandbox blocks `process`, `fetch`, `require`, `Function`, `eval`, `WebAssembly`, and `SharedArrayBuffer`. Runtime default is `subprocess`.

## Migration path

1. Default to `codemode` for new integrations.
2. Fall back to `classic` only for compatibility.
3. Test representative workflows in codemode.
4. Keep classic available until all clients are migrated.

## Benchmarks

| Metric | Classic | Code Mode |
|---|---|---|
| tools/list tokens | ~92,354 | ~218 |
| search p95 | -- | ~52ms |
| execute p95 | -- | ~48ms |
| sandbox startup p95 | -- | ~1ms |
