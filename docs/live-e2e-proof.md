# Live End-To-End Proof

Yes, it actually deployed something. Revolutionary stuff.

This document is the public evidence snapshot for the current `v3` package surface. It focuses on
the question people usually dodge in MCP demos:

Can this thing do real Dokploy work end to end, with a small default footprint, without turning the
context window into soup?

## What Was Proven

On `2026-04-21`, the current `v3` build was validated against a live Dokploy test project:

- project: `mcp-test-v3`
- project id: `7m9j_C4qfc6thVTQroHSt`
- environment id: `z602tgn2I7XDFIqw5FCas`
- audit application: `mcp-v3-audit-app-01`
- application id: `p0F3_eJF0zAIF33nUfhIx`
- latest deployment id: `XXTLcgpfd2lMO9EXgDDth`

The live mutation flow proved:

1. application creation and readback
2. resource tuning through `application.update`
3. mount creation and mount update through `mounts.*`
4. Docker-image deploy through `application.deploy`
5. deployment polling through `deployment.latestByType`
6. runtime log reads through `application.readLogs`
7. project-wide log aggregation through `project.logsOverview`

The final live app state after the audit run:

- `sourceType: "docker"`
- `dockerImage: "nginx:alpine"`
- `applicationStatus: "done"`
- `memoryReservation: "134217728"`
- `memoryLimit: "268435456"`
- `cpuReservation: "0.10"`
- `cpuLimit: "0.50"`
- named volume `mcp-v3-audit-volume-01` mounted at `/audit-data`

## Response Shape

The default public surface still exposes only:

- `search`
- `execute`

That does not mean the responses are vague. A typical successful `execute` result includes:

```json
{
  "result": {
    "projectId": "7m9j_C4qfc6thVTQroHSt",
    "name": "mcp-test-v3"
  },
  "logs": [],
  "calls": [
    {
      "procedure": "project.one",
      "method": "GET",
      "durationMs": 133
    }
  ],
  "resourceLinks": [
    {
      "uri": "dokploy://project/7m9j_C4qfc6thVTQroHSt/overview",
      "title": "Project Overview"
    }
  ]
}
```

In other words:

- the useful result is there
- the underlying Dokploy calls are there
- reusable `dokploy://...` links are there
- the agent does not need 500 raw MCP tools up front just to find one project

## Remote HTTP Proof

The `phase 5` hosted path was also exercised end to end through the current `serve-http` build with
the shipped remote header contract from [remote-http.md](./remote-http.md).

The remote smoke passed these checks:

- `/health` returned `200` with the expected remote-auth metadata
- MCP initialize without remote headers failed closed with `401`
- MCP initialize with only one remote header failed closed with `400`
- a real remote `execute` read-only call succeeded against the live Dokploy backend
- reusing the same MCP session with different credentials failed closed with `403`

That proves:

- the remote path is not just brochureware
- the header contract is real
- session-bound credential isolation is real

The live remote validation used a localhost `serve-http` instance of the current build against the
live Dokploy backend. It did not depend on a separate public demo host.

## Budget Snapshot

Current measured public footprint from `scripts/v2/check-budgets.mjs`:

- default `tools/list`: `5,941` bytes, about `1,485` tokens
- classic endpoint-per-tool comparison baseline: about `92,354` tokens
- reduction versus that baseline: `98.4%`
- current `ci:budgets` status: `pass`

Current local benchmark snapshot from the same budget check:

- `search` duration: `p50 1.44ms`, `p95 1.68ms`, `max 1.68ms`
- `execute` duration: `p50 0.56ms`, `p95 0.73ms`, `max 0.73ms`
- sandbox startup: `p50 0.37ms`, `p95 0.46ms`, `max 0.46ms`

Those latency numbers are local protocol/runtime budget measurements, not live Dokploy network
round-trip timings. The point is budget discipline, not fake internet bravado.

## Why This Matters

The usual MCP stunt is:

- publish hundreds of tools
- dump the schema bill into the context window
- call it “agentic”

This package does the opposite:

- `524` generated procedures stay discoverable
- the default public contract stays fixed at `2` tools
- live Dokploy mutation flows still work
- hosted HTTP still works

Small surface. Real deploy. No interpretive dance.

## Verification Commands

The current proof is backed by these repository checks:

```bash
npm run build
npm run test:phase5
npm run ci:budgets
```

For the hosted HTTP contract and operator details, see [remote-http.md](./remote-http.md).
For the generated coverage and budget snapshot, see [coverage.md](./coverage.md).
