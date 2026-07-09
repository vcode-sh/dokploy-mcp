# Hosted HTTP And Remote Auth

This document is the operator-facing reference for the shipped `phase 5` surface:

- registry-ready `server.json` metadata
- Streamable HTTP hosting
- pragmatic remote auth through Dokploy URL plus API key headers

## What Phase 5 Ships

The repository now supports two installation paths without changing the default Code Mode contract:

1. Local package over `stdio`
2. Hosted Streamable HTTP remote discovered through `server.json`

The hosted path does not introduce custom OAuth, OIDC discovery, or Dokploy Enterprise-only SSO
requirements. It reuses the same Dokploy API boundary that already exists today: target URL plus
API key.

## Metadata Surface

The root [server.json](../server.json) declares:

- npm install metadata for local `stdio` use
- a `streamable-http` remote entry
- repository, website, and icon metadata for registry-aware clients
- the required hosted headers:
  - `X-Dokploy-Url`
  - `X-Dokploy-Api-Key`

That means registry-aware MCP clients can discover both the local and hosted installation paths
without out-of-band setup notes.

## Hosted Request Contract

Hosted HTTP requests must send both headers together:

- `X-Dokploy-Url`: Dokploy panel URL
- `X-Dokploy-Api-Key`: Dokploy API key

Accepted URL forms:

- `https://panel.example.com`
- `https://panel.example.com/api`
- `https://panel.example.com/api/trpc`

The runtime normalizes each form to the tRPC base path before it reaches the Dokploy API client.

If only one remote header is present, the request fails closed with `400`.
If the URL is malformed, the request fails closed with `400`.
If no remote headers are present, the hosted request returns `401` unless local fallback is
explicitly enabled.

## Session Isolation

HTTP sessions are bound to the resolved Dokploy credentials that created them.

That prevents one hosted client from creating an MCP session against Dokploy target A and then
silently switching the same session to target B on the next request. Follow-up requests whose
resolved credentials do not match the session-bound config are rejected with `403`.

This isolation is request-scoped and does not change the local `stdio` flow.

## Browser-Origin Rules

Browser-based hosted clients are rejected by default.

To allow them, set `DOKPLOY_MCP_ALLOWED_ORIGINS` to a comma-separated allowlist:

```bash
DOKPLOY_MCP_ALLOWED_ORIGINS=https://cursor.example.com,https://app.example.com
```

Behavior:

- normal MCP requests from disallowed origins return `403`
- preflight requests without `Origin` return `400`
- allowed origins receive the expected CORS headers
- `Origin` is appended to `Vary` so caches do not collapse different browser callers

## Optional Local Fallback

Single-tenant hosted deployments can opt into local Dokploy credential fallback:

```bash
DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK=true
```

When enabled:

- per-request remote headers still win
- if headers are missing, the server falls back to the local env/config/CLI resolution chain
- request-scoped overrides are ignored while resolving the fallback config so hosted requests do
  not accidentally inherit a previous session override

This mode is for trusted, single-tenant deployments. Multi-tenant hosted usage should continue to
require explicit per-request headers.

## Runbook

Start the hosted server:

```bash
npx @vibetools/dokploy-mcp serve-http
```

Common environment variables:

```bash
DOKPLOY_MCP_HTTP_HOST=127.0.0.1
DOKPLOY_MCP_HTTP_PORT=3000
DOKPLOY_MCP_HTTP_PATH=/mcp
DOKPLOY_MCP_HEALTH_PATH=/health
```

The health endpoint returns the active remote-auth posture, including:

- configured MCP and health paths
- whether local fallback is enabled
- allowed origins
- the declared remote header names and secrecy flags

## Verification Commands

Repository-wide verification:

```bash
npm run typecheck
npm run lint
npm run build
npm run docs:check:facts
npm test
npm run test:coverage
npm run ci:budgets
```

## Evidence Snapshot

Latest local verification in this execution cycle:

- `npm test`: `495` tests passed
- `npm run test:coverage`: `90.07%` statements, `79.45%` branches, `94.23%` functions, `90.48%`
  lines repository-wide

See [coverage.md](./coverage.md) for the generated coverage snapshot maintained by the docs facts
checker.

The full repository now also clears `90%` for statements and lines. Remaining lower branch
coverage is outside the hosted HTTP closeout scope.
