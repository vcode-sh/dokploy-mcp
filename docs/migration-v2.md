# Migration to v2 Code Mode

## Status

The repository now ships the `v2.0.0` Code Mode architecture, and the default runtime is `codemode`.

Current modes:

- `codemode`
- `classic`

## What changes in v2

Classic mode exposes the current endpoint-based MCP surface with hundreds of tools.

Code Mode is designed to expose a tiny, fixed MCP surface:

- `search`
- `execute`

Instead of selecting among hundreds of endpoint tools, the agent searches a generated Dokploy API catalog and executes multi-step workflows through sandboxed code.

## Capability discovery workflow

In `codemode`, the expected flow is:

1. discover relevant Dokploy capabilities through `search`
2. inspect endpoint contracts through the returned compact catalog entries
3. execute multi-step Dokploy workflows through `execute`

This is the opposite of the classic model, where the client sees the whole endpoint surface up front and picks tools directly from that list.

## Current commands

After build:

```bash
node dist/index.js                # default codemode mode
node dist/index.js --mode codemode
node dist/index-classic.js
node dist/index-codemode.js
```

Or via npm scripts:

```bash
npm run start:classic
npm run start:codemode
```

## Current v2 implementation

- generated OpenAPI resolution
- compact endpoint catalog
- generated procedure schemas
- generated Dokploy SDK declaration
- generated Dokploy SDK runtime
- `search` Code Mode tool
- `execute` Code Mode workflow runner
- classic/codemode mode routing
- subprocess sandbox default with local fallback
- protocol, generation, gateway, search, execute, security, and budget tests
- MCP Inspector smoke scripts for both modes
- CI budget checks and MCP smoke coverage

## Current benchmark snapshot

- classic `tools/list`: about `92,354` tokens
- codemode `tools/list`: about `218` tokens
- `search` p95 in the current budget run: about `51.87ms`
- `execute` p95 in the current budget run: about `47.92ms`
- broad `search` result: about `26.9 KB`
- sandbox startup p95: about `1.05ms`

## Current sandbox limits

- timeout: `5000ms`
- max API calls: `25`
- max serialized result bytes: `131072`
- max log bytes: `8192`
- max cumulative Dokploy response bytes: `2097152`
- max heap delta bytes: `16777216`

## Current sandbox guarantees

The current runtime blocks direct access to:

- `process`
- `fetch`
- `require`
- `Function`
- `eval`
- `WebAssembly`
- `SharedArrayBuffer`

And currently enforces:

- sandbox runtime default: `subprocess`
- timeout limit
- max API calls limit
- max serialized result bytes
- max log bytes
- max cumulative Dokploy response bytes
- max heap delta bytes

## Recommended migration path

1. Use default `codemode` for new agent integrations.
2. Fall back to `classic` only for compatibility-sensitive clients.
3. Validate representative workflows in `codemode`.
4. Keep `classic` available until all migration-sensitive clients are moved.
