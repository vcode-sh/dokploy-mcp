# Live Verification

Last updated: 2026-04-21

This file records the read-only live verification that still matters for the next implementation
cycle.

## Verified Backend Fact

Observed live Dokploy version during verification:

- `v0.28.8`

## Read-Only Procedures That Succeeded

- `settings.getDokployVersion`
- `project.all`
- `application.search`
- `compose.search`
- `docker.getContainers`

## Newer Procedures That Returned `404`

- `settings.checkInfrastructureHealth`
- `settings.getDockerDiskUsage`
- `server.allForPermissions`
- `sshKey.allForApps`
- `project.homeStats`
- `gitProvider.allForPermissions`
- `user.getBookmarkedTemplates`
- `ai.getEnabledProviders`
- `tag.all`

## Why This Still Matters

The next cycle is no longer about endpoint parity, but version skew still shapes the implementation.

The shipped `resources` layer and any future `prompts`, `completions`, `sampling`, `elicitation`,
or `tasks` layer must:

- degrade cleanly when a connected Dokploy backend is older
- keep compatibility-aware messaging
- avoid assuming that generated parity means live availability

## Rule For The Next Cycle

Build new MCP capabilities on top of the existing compatibility-aware gateway behavior.

Do not regress the current handling of newer Dokploy procedures on older backends.
