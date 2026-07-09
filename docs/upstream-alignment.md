# Upstream Alignment Proposal

This document captures the remaining improvements that should happen in the Dokploy API and OpenAPI spec so MCP-side overrides can eventually shrink or disappear.

## Goals

- move high-value response shaping to the real Dokploy API
- reduce upstream payload size for heavy read workflows
- let generated OpenAPI artifacts describe useful response shapes directly
- replace MCP-only virtual helpers with native Dokploy endpoints where it makes sense

## Current MCP-side behavior

The MCP server currently adds local behavior on top of the generated Dokploy surface:

- `application.one` supports optional MCP-only inputs:
  - `select`
  - `includeDeployments`
  - `deploymentLimit`
- `application.many` is an MCP-only virtual helper
- `project.overview` is an MCP-only virtual helper
- `search` exposes response hints because some important OpenAPI output schemas are currently too weak to help the model

These improve model cost and workflow ergonomics, but they do not give true server-side efficiency unless Dokploy implements them upstream.

## Proposed Dokploy API additions

### 1. `application.one` server-side shaping

Status: see the detailed issue-first recommendation in
[`docs/proposals/upstream-application-one.md`](./proposals/upstream-application-one.md).

**Current call**

```ts
await dokploy.application.one({ applicationId: 'app-123' })
```

**Proposed compatible extension**

```ts
await dokploy.application.one({
  applicationId: 'app-123',
  select: ['applicationId', 'name', 'applicationStatus', 'mounts', 'watchPaths'],
  includeDeployments: false,
  deploymentLimit: 1,
})
```

**Rules**

- without the new fields, keep current behavior
- `select` should return only the requested top-level fields
- `includeDeployments: false` should omit `deployments`
- `deploymentLimit` should truncate `deployments`
- reject `includeDeployments: false` with `deploymentLimit`

**Why**

- this is the highest-value server-side token and payload reduction
- it directly replaces the current MCP-only shaping override

### 2. `application.many` native batch read

**Proposed endpoint**

```ts
await dokploy.application.many({
  applicationIds: ['app-1', 'app-2', 'app-3'],
  select: ['applicationId', 'name', 'applicationStatus'],
  deploymentLimit: 1,
})
```

**Recommended response**

```ts
{
  items: [
    { applicationId: 'app-1', name: 'One', applicationStatus: 'running' },
    { applicationId: 'app-2', name: 'Two', applicationStatus: 'stopped' },
  ],
  total: 2,
}
```

**Why**

- replaces MCP fan-out with one real upstream call
- preserves model-friendly workflow ergonomics
- allows the OpenAPI spec to describe the batch shape directly

### 3. `project.overview` native aggregate read

**Proposed endpoint**

```ts
await dokploy.project.overview({ projectId: 'project-1' })
```

**Recommended response shape**

```ts
{
  projectId: 'project-1',
  name: 'Demo project',
  environments: [
    {
      environmentId: 'env-1',
      name: 'Production',
      applications: [
        {
          applicationId: 'app-1',
          name: 'Web',
          appName: 'web',
          applicationStatus: 'running',
          domains: [],
          mounts: [],
          watchPaths: [],
          lastDeployment: null,
        },
      ],
    },
  ],
}
```

**Why**

- this is the common “show me the state of everything in this project” workflow
- it removes multiple follow-up reads in both humans and agents
- it gives true server-side aggregation instead of MCP fan-out

## OpenAPI spec improvements

Even without new endpoints, several high-value read procedures should expose real output schemas in OpenAPI.

### Highest-priority output schemas to improve

- `application.one`
- `project.one`
- `project.all`
- `deployment.all`
- `application.search`
- `environment.byProjectId`

### Minimum desired detail

Each of these should expose enough output shape for:

- field discovery
- generated SDK typing
- search-time agent hints without manual MCP metadata

For example, `application.one` should at least describe commonly returned top-level fields such as:

- `applicationId`
- `name`
- `appName`
- `applicationStatus`
- `domains`
- `mounts`
- `watchPaths`
- `deployments`

## Migration plan for this MCP repo

When Dokploy ships the upstream improvements:

1. update `.openapi/openapi`
2. run the existing generation pipeline
3. remove MCP-only overrides that became redundant
4. keep only lightweight response hints where they still add value

## Success criteria

The upstream alignment work is complete when:

- `application.one` shaping is native to Dokploy
- `application.many` is no longer an MCP-only virtual helper
- `project.overview` is no longer an MCP-only virtual helper
- OpenAPI output schemas for the key read endpoints are descriptive enough that MCP no longer needs manual shape hints for them
