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

## Representative Stack

Then the audit was pushed into a more normal Dokploy story instead of a single disposable app:

- project: `mcp-v3-marketing-20260421-131921`
- project id: `Q5ketpYMbtxFMoqSZdGje`
- environment id: `Z8w1YtAR0Eb1OUxZiv7--`

Workloads created inside that project:

- direct Docker app: `mk-web-131921`
- direct Docker app with database env wiring: `mk-api-131921`
- Git-backed Dockerfile app: `mk-build-131921`
- Postgres 18 service: `mk-pg18-131921`
- raw Docker Compose workload: `mk-compose-131921`

The final live state for the representative stack:

- `mk-web-131921`: deployed from `nginx:alpine`, status `done`, named volume mounted at
  `/audit-data`
- `mk-api-131921`: deployed from `traefik/whoami:v1.10`, status `done`, `DATABASE_URL` wiring
  present in the app env
- `mk-build-131921`: deployed from public Git repo `https://github.com/traefik/whoami.git` with
  `buildType: "dockerfile"`, status `done`
- `mk-pg18-131921`: deployed from `postgres:18-alpine`, status `done`
- `mk-compose-131921`: deployed from a raw one-service Compose file, status `done`

The final live project-wide readbacks also worked:

- `project.overview` returned all `3` applications with status `done`
- `project.logsOverview` returned all `3` applications plus the `Postgres 18` service
- each source returned a bounded logs payload instead of a generic explosion

## Step Footprint

These are approximate per-step token counts from compact JSON summaries emitted during the live
audit workflow itself.

They are not the full MCP wrapper payload, and they are not network transfer bytes. The point is to
compare step shape honestly, not to fake precision with ceremonial decimals.

### Project Bootstrap

| Step | Approx tokens |
| --- | ---: |
| `project.create` observed-return recovery note | `52` |
| `project.one` | `58` |
| `project.overview` | `34` |

### Application Shell Creation

| Step | Approx tokens |
| --- | ---: |
| `application.create:mk-web-131921` | `32` |
| `application.one:mk-web-131921` | `43` |
| `application.create:mk-api-131921` | `32` |
| `application.one:mk-api-131921` | `43` |
| `application.create:mk-build-131921` | `33` |
| `application.one:mk-build-131921` | `44` |
| `project.overview` after app shell creation | `120` |

### Postgres 18 And Compose Creation

| Step | Approx tokens |
| --- | ---: |
| `postgres.create` password-validation note | `34` |
| `postgres.create` | `34` |
| `postgres.one` | `54` |
| `compose.create` | `34` |
| `compose.one` | `45` |

### Postgres 18 Deploy Flow

| Step | Approx tokens |
| --- | ---: |
| `postgres.deploy` CPU edge-case note | `30` |
| `postgres.deploy` retry observed payload | `430` |
| `postgres.one` deploy poll | `21` |
| `postgres.readLogs` preview | `4` |

### Direct Docker App: `mk-web-131921`

| Step | Approx tokens |
| --- | ---: |
| `application.update` | `55` |
| `mounts.create` | `92` |
| `mounts.listByServiceId` | `31` |
| `application.deploy` | `6` |
| `deployment.latestByType` poll | `75` |
| `application.readLogs` preview | `130` |

### Direct Docker App: `mk-api-131921`

| Step | Approx tokens |
| --- | ---: |
| `application.update` | `72` |
| `application.deploy` | `6` |
| `deployment.latestByType` poll | `75` |
| `application.readLogs` preview | `22` |

### Domains And HTTPS For Direct Apps

| Step | Approx tokens |
| --- | ---: |
| `domain.generateDomain:mk-web-131921` | `28` |
| `domain.create:mk-web-131921` | `120` |
| `domain.byApplicationId:mk-web-131921` | `40` |
| `domain.generateDomain:mk-api-131921` | `28` |
| `domain.create:mk-api-131921` | `120` |
| `domain.byApplicationId:mk-api-131921` | `40` |

### Git-Backed Dockerfile App: `mk-build-131921`

| Step | Approx tokens |
| --- | ---: |
| `application.update` | `67` |
| `application.deploy` | `6` |
| `deployment.latestByType` poll | `164` |
| `application.readLogs` preview | `4` |
| `domain.generateDomain` | `29` |
| `domain.create` | `121` |
| `domain.byApplicationId` | `40` |

### Compose Flow

First attempt:

| Step | Approx tokens |
| --- | ---: |
| `compose.deploy` | `25` |
| `deployment.latestByType` | `46` |
| `docker.getContainers` | `1` |
| `compose.readLogs` failure note | `25` |
| `domain.generateDomain` | `30` |
| `domain.create` | `121` |
| `domain.byComposeId` | `46` |

Retry after forcing `sourceType: "raw"`:

| Step | Approx tokens |
| --- | ---: |
| `compose.create` sourceType gap note | `31` |
| `compose.update` | `28` |
| `compose.deploy` retry | `25` |
| `deployment.latestByType` retry | `87` |
| `docker.getContainers` retry | `39` |
| `compose.readLogs` retry | `30` |

### Final Project Reads

| Step | Approx tokens |
| --- | ---: |
| `project.overview` with all running workloads | compact enough to reuse directly |
| `project.logsOverview` across `3` apps plus `Postgres 18` | bounded and successful |

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

## Bugs Found

The audit was useful precisely because not everything was clean.

### 1. `project.create` did not expose `projectId` directly in the observed mutation response

The project was created successfully, but the live workflow had to recover the id through
`project.all` and the unique project name.

That is survivable, but not lovely.

### 2. `compose.create` plus `composeFile` was not enough for a successful raw Compose deploy

The first live Compose deploy failed because the created record still persisted
`sourceType: "github"`.

The workload only deployed after a follow-up:

```js
await dokploy.compose.update({
  composeId,
  sourceType: 'raw',
  composeFile,
})
```

That looks like a real contract gap in the underlying flow, not just user error.

### 3. `https: true` and `certificateType: "letsencrypt"` did not prove real certificate issuance

For the generated `traefik.me` hosts:

- Dokploy stored the domains
- `domain.validateDomain(...)` returned `isValid: true`
- HTTPS responded with `200`
- the same pattern held for direct Docker apps, the raw Compose workload, and the Git-backed app

But the live certificate presented on the wire was still:

- `CN=TRAEFIK DEFAULT CERT`

So there is a difference between:

- desired Dokploy domain config
- actual publicly served TLS state

If you want to market HTTPS honestly, test the certificate on the wire, not just the saved domain
record.

### 4. `postgres.deploy` with `cpuLimit: "1.00"` hit a backend edge case

The live deploy failed with:

```text
invalid cpu value 1e-09: Must be at least 0.001
```

Using `cpuLimit: "0.75"` worked immediately afterward.

That smells like a Dokploy-side parsing bug or rounding bug in the deployment path, not a generic
MCP failure.

### 5. MCP-level issues were fixed in this repository after the audit

- `project.logsOverview` now degrades per source instead of failing the whole helper when one log
  target has no container
- data service responses now redact `databasePassword` and `databaseRootPassword` instead of
  casually spraying them into the context window
- `compose.deploy` now preflights the record and returns an actionable validation error when the
  user mixes inline `composeFile` content with a Git-backed `sourceType`
- `catalog.get("compose.create")`, `catalog.get("compose.update")`, and `catalog.get("compose.deploy")`
  now explain the `raw` versus Git-backed split directly in the MCP contract view

Because apparently “don’t leak database passwords in AI tooling” still has to be written down.

## Budget Snapshot

Current measured public footprint from `scripts/v2/check-budgets.mjs`:

- default `tools/list`: `6,682` bytes, about `1,671` tokens
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
npm test
```

For the hosted HTTP contract and operator details, see [remote-http.md](./remote-http.md).
For the generated coverage and budget snapshot, see [coverage.md](./coverage.md).
