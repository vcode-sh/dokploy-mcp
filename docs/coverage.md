# API Coverage

Last verified: 2026-03-25 against Dokploy OpenAPI `v0.28.8` from `.openapi/openapi`

## Summary

- OpenAPI endpoints: `463`
- Implemented MCP tools: `377`
- Implemented OpenAPI endpoints: `377`
- Missing OpenAPI endpoints: `86`
- Implemented modules: `35`
- OpenAPI tags/modules: `48`
- Overall coverage: `81%`

This report is generated from the current OpenAPI spec and the tool registry in `src/tools`. It measures endpoint coverage, not end-to-end runtime validation for every mutating operation.

## Implemented Coverage

| Module | Endpoints | Implemented | Coverage | Notes |
|---|---:|---:|---:|---|
| `admin` | 1 | 1 | 100% | |
| `application` | 29 | 29 | 100% | |
| `backup` | 11 | 11 | 100% | |
| `certificates` | 4 | 4 | 100% | |
| `cluster` | 4 | 4 | 100% | |
| `compose` | 28 | 28 | 100% | |
| `deployment` | 8 | 8 | 100% | |
| `destination` | 6 | 6 | 100% | |
| `docker` | 7 | 7 | 100% | |
| `domain` | 9 | 9 | 100% | |
| `environment` | 7 | 7 | 100% | |
| `github` | 6 | 6 | 100% | |
| `gitlab` | 7 | 7 | 100% | |
| `gitProvider` | 2 | 2 | 100% | |
| `mariadb` | 14 | 14 | 100% | |
| `mongo` | 14 | 14 | 100% | |
| `mounts` | 6 | 6 | 100% | |
| `mysql` | 14 | 14 | 100% | |
| `notification` | 38 | 38 | 100% | |
| `patch` | 12 | 12 | 100% | |
| `port` | 4 | 4 | 100% | |
| `postgres` | 14 | 14 | 100% | |
| `previewDeployment` | 4 | 4 | 100% | |
| `project` | 8 | 8 | 100% | |
| `redirects` | 4 | 4 | 100% | |
| `redis` | 14 | 14 | 100% | |
| `rollback` | 2 | 2 | 100% | |
| `schedule` | 6 | 6 | 100% | |
| `security` | 4 | 4 | 100% | |
| `server` | 16 | 16 | 100% | |
| `settings` | 49 | 49 | 100% | |
| `sshKey` | 6 | 6 | 100% | |
| `volumeBackups` | 6 | 6 | 100% | |
| `registry` | 7 | 6 | 86% | Missing: `testRegistryById` |
| `user` | 20 | 7 | 35% | Remaining: identity/admin and metrics helpers |

## Not Implemented Yet

| Module | Endpoints | Status | Notes |
|---|---:|---|---|
| `organization` | 11 | Not started | Organization management, invitations, roles |
| `sso` | 10 | Not started | SSO provider and trusted origin management |
| `ai` | 9 | Not started | AI helper endpoints |
| `gitea` | 8 | Not started | Gitea provider management |
| `bitbucket` | 7 | Not started | Bitbucket provider management |
| `stripe` | 7 | Not started | Billing/subscription flows |
| `customRole` | 6 | Not started | Custom role management |
| `licenseKey` | 6 | Not started | Enterprise licensing |
| `whitelabeling` | 4 | Not started | Branding and public theme config |
| `swarm` | 3 | Not started | Docker Swarm node views |
| `auditLog` | 1 | Not started | Audit log listing |

## Highest-Value Remaining Gaps

Based on daily operator use, the highest-value remaining work is:

1. `user` completion
2. `registry.testRegistryById`
3. `organization`
4. `sso`
5. `gitea`
6. `bitbucket`

## Notes

- The report is based on `.openapi/openapi`, not a historical Dokploy release.
- `application`, `compose`, `domain`, `deployment`, `docker`, and `mounts` are now at `100%` endpoint coverage.
- `notification` is fully implemented.
- `settings.getUpdateData`, `settings.cleanRedis`, `settings.reloadRedis`, and `settings.cleanAllDeploymentQueue` are implemented with the correct `POST` method from OpenAPI.
