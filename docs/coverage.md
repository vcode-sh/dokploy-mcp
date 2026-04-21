# API Model Coverage

Managed factual sections in this file are synced from `src/generated/openapi-index.json` and `scripts/v2/check-budgets.mjs`.

Run `npm run docs:sync:facts` after changing generated artifacts or budget-sensitive code. Use `npm run docs:check:facts` to verify the committed docs are still current.

<!-- docs-facts:coverage-summary:start -->
## Summary

- Generated procedures in the pinned snapshot-backed catalog: `524`
- Generated tags: `48`
- Default public MCP tools: `2`
- Public tool surface: `search`, `execute`
- Default `tools/list` footprint from the current budget check: about `1,337` tokens (`5,349` bytes)
- Optional server modes: `raw`, `hybrid`
- Optional HTTP transport: `Streamable HTTP`
<!-- docs-facts:coverage-summary:end -->

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

<!-- docs-facts:coverage-budget:start -->
## Current Budget Snapshot

- Current default `tools/list`: `5,349` bytes, about `1,337` tokens
- Classic comparison baseline: about `92,354` tokens for endpoint-per-tool discovery
- Current reduction versus that baseline: `98.6%`
- Current `ci:budgets` status from the managed budget check: `pass`
- Runtime latency budgets remain enforced by `scripts/v2/check-budgets.mjs` in CI.
<!-- docs-facts:coverage-budget:end -->

## Notes

- The catalog is generated from a pinned copy of the official Dokploy root OpenAPI snapshot.
- The default endpoint-per-tool implementation is still not the public baseline. It is only available through explicit `raw` or `hybrid` mode selection.
