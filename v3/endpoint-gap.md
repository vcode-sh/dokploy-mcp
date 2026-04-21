# Endpoint Gap Status

Last updated: 2026-04-21

## Status

The Dokploy endpoint parity gap is closed.

The resource gap is also closed for the current `phase 1` scope.

The prompt and completion gap is closed for the current `phase 2` scope.

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
| Agentic workflow layer | Open strategic gap | `sampling`, `elicitation`, and `tasks` are still missing |
| Remote discovery and auth metadata | Open strategic gap | registry metadata, `server.json`, `remotes`, OIDC-aware discovery, and scope signaling are still missing |

## What Not To Do Next

Do not treat raw endpoint growth as the main roadmap item anymore.

Do not reopen `phase 0` or `phase 1` with cosmetic scope creep.

New endpoint additions should happen only when upstream Dokploy changes again.

## What To Do Next

Shift the roadmap to two remaining product gaps:

1. Agentic workflow support
2. Remote-native distribution and auth

## Practical Interpretation

If a user says "the official repo has more tools", the correct answer is now:

- not in the only way that still matters for Dokploy API coverage
- yes, possibly at the presentation layer depending on mode, but that is not the strategic gap
- the real remaining gap is the higher-level MCP capability surface after resources and prompts:
  workflow utilities and remote product posture
