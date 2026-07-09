# Upstream proposal: `application.one` response shaping

Status: recommendation draft, not submitted upstream.
Date: 2026-07-09.

## Recommendation

Open a Dokploy issue before writing a PR. The proposed change is small in code but product-facing in API
semantics, and Dokploy's `CONTRIBUTING.md` asks contributors to discuss features before implementation
work. The current best path is:

1. File an issue against the `canary` branch with the compatibility contract below.
2. Ask maintainers whether `select` should silently omit unknown top-level fields, matching this MCP,
   or reject them with validation.
3. Only prepare a PR after that answer, because the unknown-field decision affects the public API
   contract and generated OpenAPI surface.

This is a conditional go: proceed issue-first; do not PR-first.

## Current upstream state

Read-only upstream check was performed against `Dokploy/dokploy` `canary` on 2026-07-09.

- `apps/dokploy/server/api/routers/application.ts` registers `applicationRouter.one` with
  `apiFindOneApplication`, checks service read access, calls `findApplicationById`, checks organization
  ownership, then adds git-provider authorization metadata.
- `packages/server/src/db/schema/application.ts` defines `apiFindOneApplication` as only
  `{ applicationId: z.string().min(1) }`.
- `packages/server/src/services/application.ts` implements `findApplicationById` with eager related
  reads including `environment.project`, `domains`, `deployments`, `mounts`, `redirects`, `security`,
  `ports`, git providers, server, preview deployments, and registries.
- Public API docs for `GET /api/application.one` expose only `applicationId`.
- No upstream `includeDeployments` or `deploymentLimit` fields were found in the application router or
  server package.

## Current MCP behavior

This MCP currently adds local-only shaping in
`src/codemode/procedure-overrides/application-one.ts`.

Supported inputs:

- `select?: string[]`
- `includeDeployments?: boolean`
- `deploymentLimit?: number`
- `includeSecrets?: boolean`

Forwarding behavior:

- `select`, `includeDeployments`, `deploymentLimit`, and `includeSecrets` are stripped before the
  request is forwarded to Dokploy.
- `includeSecrets` is only an MCP redaction toggle. It is not part of this upstream proposal.

Response behavior:

- No shaping fields means current response behavior is preserved.
- `select` keeps only requested existing top-level fields.
- Unknown `select` fields are silently omitted.
- Duplicate selected fields are deduped in first-seen order.
- `includeDeployments: false` removes `deployments`.
- `deploymentLimit` slices `deployments` when it is an array.
- `deploymentLimit: 0` returns an empty `deployments` array.
- `includeDeployments: false` with `deploymentLimit` is rejected.

Validation behavior:

- `select` must be a non-empty array of non-empty strings when provided.
- `deploymentLimit` must be a non-negative integer when provided.
- `includeDeployments: false` cannot be combined with `deploymentLimit`.

## Measured impact

Measurement method: a representative application fixture was passed through the real MCP
`application.one` gateway transform with ten deployment records and common related records. The fixture
is not a live production payload; it is a deterministic local measurement of the current MCP shaping
semantics.

| Scenario | Input | JSON bytes |
|----------|-------|------------|
| Full current read | `{ applicationId }` | 13,138 |
| Omit deployments | `{ applicationId, includeDeployments: false }` | 1,541 |
| Prompt/resource shape | `{ applicationId, select: [...], deploymentLimit: 1 }` | 1,863 |
| Minimal status read | `{ applicationId, select: ['applicationId', 'name', 'applicationStatus'] }` | 70 |

The representative prompt/resource shape uses:

```ts
{
  select: [
    'applicationId',
    'name',
    'appName',
    'applicationStatus',
    'domains',
    'mounts',
    'watchPaths',
    'deployments',
  ],
  deploymentLimit: 1,
}
```

That reduces the serialized response from 13,138 bytes to 1,863 bytes in the local measurement, an
85.8% reduction before any model prompt or transport overhead is counted.

## Proposed upstream API

Extend `apiFindOneApplication` compatibly:

```ts
export const apiFindOneApplication = z
  .object({
    applicationId: z.string().min(1),
    select: z.array(z.string().min(1)).nonempty().optional(),
    includeDeployments: z.boolean().optional(),
    deploymentLimit: z.number().int().nonnegative().optional(),
  })
  .refine(
    (input) => input.includeDeployments !== false || input.deploymentLimit === undefined,
    {
      message: 'deploymentLimit cannot be used when includeDeployments is false',
      path: ['deploymentLimit'],
    },
  )
```

The router can continue using `findApplicationById` for the first upstream version. That preserves the
access-control path and keeps the PR small. A later optimization can push `select` and deployment
limits deeper into Drizzle queries if maintainers want true database-level savings.

Recommended first implementation:

1. Keep the current unshaped response byte-for-byte compatible when no new inputs are provided.
2. Apply shaping after authorization checks and after git-provider access metadata is added.
3. Filter only top-level fields.
4. Preserve `hasGitProviderAccess` and `unauthorizedProvider` when selected explicitly or when no
   `select` is provided.
5. Do not add `includeSecrets`; it is MCP-specific because upstream already owns its auth model.

## Upstream touch points

- `packages/server/src/db/schema/application.ts`
  - extend `apiFindOneApplication`
  - add validation tests if upstream has schema-level tests for this package
- `apps/dokploy/server/api/routers/application.ts`
  - shape the `one` result after current auth checks
  - add or update router tests if available
- OpenAPI generation
  - regenerated docs should expose the new optional inputs for `GET /api/application.one`
- Public docs
  - add short compatibility examples for omitting deployments and selecting top-level fields

## Comparable upstream evidence

Recent merged PRs show maintainers accept focused API/runtime safety and payload-size work when scoped
narrowly:

- [#4730](https://github.com/Dokploy/dokploy/pull/4730), "fix: reduce SSR payload size by scoping
  user.get columns", merged 2026-07-05.
- [#4733](https://github.com/Dokploy/dokploy/pull/4733), "fix(deployment): resolve schedule to its
  service before permission check in allByType", merged 2026-07-05.
- [#4758](https://github.com/Dokploy/dokploy/pull/4758), "feat(ci): pin install.sh release asset to
  the released version", merged 2026-07-07.

Open upstream issues also show payload and public API shape pain:

- [#3793](https://github.com/Dokploy/dokploy/issues/3793) reports an OpenAPI endpoint failure while
  the equivalent tRPC path returns a large project payload.
- [#4700](https://github.com/Dokploy/dokploy/issues/4700) reports a slow dashboard with a large page
  data payload and discusses limiting recent deployment data.

## `application.many` feasibility

Recommendation: defer until `application.one` shaping is accepted or rejected.

Native `application.many` is feasible, but the API contract is wider than `application.one`:

- define max batch size
- preserve input order
- choose partial-failure behavior for missing or unauthorized applications
- reuse the same `select`, `includeDeployments`, and `deploymentLimit` semantics
- avoid N identical permission-check code paths drifting from `application.one`

If `application.one` shaping lands, `application.many` can reuse that internal shaper and focus only on
batch semantics.

## `project.overview` feasibility

Recommendation: issue/design only for now.

`project.overview` is useful, but it is a larger aggregate endpoint with more product semantics than
`application.one`:

- environment grouping has to be stable and documented
- each service type needs a consistent summary shape
- "last deployment" and deployment limits need clear rules
- payload size can regress quickly if the endpoint grows into a dashboard dump

The better upstream order is `application.one` shaping first, then `application.many`, then a scoped
`project.overview` design if maintainers want an aggregate read endpoint.
