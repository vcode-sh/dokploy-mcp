# API Model Coverage

Last verified: 2026-04-20 against the pinned official Dokploy root OpenAPI snapshot used by `scripts/v2/official-openapi-root.json`

## Summary

- OpenAPI procedures in pinned upstream spec: `524`
- Procedures in generated Code Mode catalog: `524`
- Procedures in generated runtime schema map: `524`
- Generated tags: `48`
- Public MCP tools: `2`
- Public tool surface: `search`, `execute`
- Public `tools/list` footprint: about `218` tokens
- Optional server modes: `raw`, `hybrid`
- Optional HTTP transport: `Streamable HTTP`

This report describes the public v3 package surface.

The public server does not expose one MCP tool per Dokploy endpoint anymore. Instead, it exposes a fixed Code Mode interface backed by:

- a fully generated OpenAPI catalog
- generated procedure schemas
- a generated Dokploy runtime SDK used by the sandbox

## Public Runtime Guarantees

- `search` can discover every procedure present in the generated catalog
- `execute` can call any generated Dokploy procedure through the sandbox bridge
- the generated catalog and generated schema map stay aligned through tests
- CI enforces protocol and runtime budgets for the public v2 surface
- default `tools/list` remains fixed at the 2-tool Code Mode surface
- raw and hybrid mode expose the generated catalog only when explicitly requested
- newer generated procedures can fail with compatibility-aware errors on older Dokploy backends

## Current Benchmark Snapshot

- classic comparison baseline: about `92,354` tokens for endpoint-per-tool discovery
- current public v3 default `tools/list`: about `595` tokens
- `search` p95 in the current budget run: about `1.79ms`
- `execute` p95 in the current budget run: about `0.65ms`
- sandbox startup p95 in the current budget run: about `0.42ms`

## Notes

- The catalog is generated from a pinned copy of the official Dokploy root OpenAPI snapshot.
- The default endpoint-per-tool implementation is still not the public baseline. It is only available through explicit `raw` or `hybrid` mode selection.
