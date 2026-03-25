# API Model Coverage

Last verified: 2026-03-25 against Dokploy OpenAPI `v0.28.8` from `.openapi/openapi`

## Summary

- OpenAPI procedures in Dokploy spec: `463`
- Procedures in generated Code Mode catalog: `463`
- Procedures in generated runtime schema map: `463`
- Public MCP tools: `2`
- Public tool surface: `search`, `execute`
- Public `tools/list` footprint: about `218` tokens

This report describes the public v2 package surface.

The public server does not expose one MCP tool per Dokploy endpoint anymore. Instead, it exposes a fixed Code Mode interface backed by:

- a fully generated OpenAPI catalog
- generated procedure schemas
- a generated Dokploy runtime SDK used by the sandbox

## Public Runtime Guarantees

- `search` can discover every procedure present in the generated catalog
- `execute` can call any generated Dokploy procedure through the sandbox bridge
- the generated catalog and generated schema map stay aligned through tests
- CI enforces protocol and runtime budgets for the public v2 surface

## Current Benchmark Snapshot

- classic comparison baseline: about `92,354` tokens for endpoint-per-tool discovery
- current public v2 `tools/list`: about `218` tokens
- `search` p95 in the current budget run: about `51.87ms`
- `execute` p95 in the current budget run: about `47.92ms`
- sandbox startup p95 in the current budget run: about `1.05ms`

## Notes

- The catalog is generated from `.openapi/openapi`, not a historical Dokploy release.
- The endpoint-per-tool implementation has been removed from the public v2 codebase.
