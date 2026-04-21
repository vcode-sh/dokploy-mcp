# Endpoint Gap Status

Last updated: 2026-04-21

## Status

The Dokploy endpoint parity gap is closed.

The resource gap is also closed for the current `phase 1` scope.

The prompt and completion gap is closed for the current `phase 2` scope.

The `sampling` and `elicitation` gap is closed for the current `phase 3` scope.

The `tasks` gap is also closed for the current `phase 4` scope.

That means endpoint count, basic resource reuse, and guided prompt entry are no longer the
blockers for `v3`.

## Current Gap Map

| Gap type | Status | Notes |
| --- | --- | --- |
| Generated Dokploy endpoint coverage | Closed | parity reached against the official Dokploy root OpenAPI snapshot |
| Live backend version skew | Open runtime constraint | older Dokploy servers may still return `404` for newer procedures |
| Capability foundation | Closed for shipped families | modular registration and shipped feature flags are in place |
| `resources` and `resource templates` | Closed for `phase 1` scope | reusable `dokploy://...` resources are implemented and tested |
| Prompt and completion surface | Closed for `phase 2` scope | guided prompts and completion-backed prompt arguments are implemented and tested |
| `sampling` and `elicitation` workflow layer | Closed for `phase 3` scope | guided `execute.workflow` planning and interactive input collection are implemented and tested |
| `tasks` workflow layer | Closed for `phase 4` scope | long-running progress, polling, cancellation, and task-backed execution are implemented and tested |
| Remote distribution and auth metadata | Closed for `phase 5` scope | registry metadata, `server.json`, `remotes`, and the pragmatic remote auth contract are shipped and verified |

## What Not To Do Next

Do not treat raw endpoint growth as the main roadmap item anymore.

Do not reopen `phase 0` or `phase 1` with cosmetic scope creep.

New endpoint additions should happen only when upstream Dokploy changes again.

## What To Do Next

Shift the roadmap to the remaining release closeout work:

1. Final verification and rollout

## Practical Interpretation

If a user says "the official repo has more tools", the correct answer is now:

- not in the only way that still matters for Dokploy API coverage
- yes, possibly at the presentation layer depending on mode, but that is not the strategic gap
- the real remaining work is release follow-through after closing resources, prompts, tasks, and
  remote product posture
