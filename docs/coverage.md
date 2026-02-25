# API Coverage

Last verified: 2026-02-24 against Dokploy v0.27.1

## What's implemented (23 modules, 196 tools)

| Module | Tools | Endpoints | Coverage | Notes |
|--------|-------|-----------|----------|-------|
| project | 6 | 6 | 100% | `project.all` returns 500 -- Dokploy bug, not ours |
| application | 26 | 28 | 93% | Missing: `clearDeployments`, `killBuild` |
| compose | 14 | 27 | 52% | 13 endpoints not implemented yet |
| domain | 8 | 9 | 89% | Missing: `canGenerateTraefikMeDomains` |
| postgres | 13 | 13 | 100% | |
| mysql | 13 | 13 | 100% | |
| mariadb | 13 | 13 | 100% | |
| mongo | 13 | 13 | 100% | |
| redis | 13 | 13 | 100% | |
| deployment | 2 | 6 | 33% | Missing: `allByServer`, `allByType`, `killProcess`, `removeDeployment` |
| docker | 4 | 7 | 57% | Missing: `getServiceContainersByAppName`, `getStackContainersByAppName`, `restartContainer` |
| certificates | 4 | 4 | 100% | |
| registry | 6 | 7 | 86% | Missing: `testRegistryById` |
| destination | 6 | 6 | 100% | |
| backup | 8 | 11 | 73% | Missing: `listBackupFiles`, `manualBackupCompose`, `manualBackupWebServer` |
| mounts | 4 | 5 | 80% | Missing: `allNamedByApplicationId` |
| port | 4 | 4 | 100% | |
| redirects | 4 | 4 | 100% | |
| security | 4 | 4 | 100% | |
| cluster | 4 | 4 | 100% | |
| settings | 25 | 49 | 51% | Many read-only info endpoints skipped |
| admin | 1 | 1 | 100% | |
| user | 1 | 18 | 6% | Only `user.all` -- the rest aren't useful via MCP |

## What's not implemented (19 modules, 193 endpoints)

Ordered by "how much we actually care":

| Module | Endpoints | Priority | Why |
|--------|-----------|----------|-----|
| server | 16 | High | Multi-server management, metrics, SSH keys |
| environment | 6 | High | Project environment CRUD -- needed for service creation |
| rollback | 2 | High | Deployment rollback. Kind of important. |
| notification | 38 | Medium | Discord, Slack, Telegram, etc. (11 types) |
| organization | 9 | Medium | Org management, invitations, roles |
| gitea | 8 | Medium | Git provider management |
| bitbucket | 7 | Medium | Git provider management |
| gitlab | 7 | Medium | Git provider management |
| github | 6 | Medium | Git provider management |
| sshKey | 6 | Medium | SSH key management |
| schedule | 6 | Medium | Cron jobs / scheduled tasks |
| volumeBackups | 6 | Medium | Volume backup management |
| previewDeployment | 4 | Medium | Preview deployments |
| sso | 10 | Low | SSO provider management |
| ai | 9 | Low | AI suggestion features |
| licenseKey | 6 | Low | Enterprise licensing |
| swarm | 3 | Low | Docker Swarm node info |
| gitProvider | 2 | Low | Generic git provider list/remove |
| stripe | 5 | Skip | Billing. No. |

## Known issues

- **`project.all` returns HTTP 500** -- Dokploy v0.27.1 server bug. Workaround: use `project.one` with known IDs.
- **`project.create` auto-creates environment** -- returns both project and a default "production" environment. Services need `environmentId`, not `projectId`.

## Phantom tools we killed (2026-02-24)

Tools that called endpoints returning 404. They never worked. We removed them:

- **auth module** (14 tools) -- entire module. Auth isn't part of the Dokploy REST API.
- **admin** (8 tools) -- `one`, `createUserInvitation`, `removeUser`, `getUserByToken`, `assignPermissions`, `cleanGithubApp`, `getRepositories`, `getBranches`, `haveGithubConfigured`
- **application** (2 tools) -- `generateSSHKey`, `removeSSHKey`
- **compose** (3 tools) -- `allServices`, `generateSSHKey`, `removeSSHKey`
- **domain** (1 tool) -- `generateWildcard`
- **registry** (1 tool) -- `enableSelfHostedRegistry`
- **settings** (1 tool) -- `checkAndUpdateImage`
- **user** (2 tools) -- `byAuthId`, `byUserId`

## Bugs we fixed (2026-02-24)

- **Typo**: `application.saveGitProdiver` -> `application.saveGitProvider`
- **Wrong parameter**: `project.duplicate` used `sourceProjectId`, API wants `sourceEnvironmentId`
