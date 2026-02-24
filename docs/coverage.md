# API Coverage Report

Last verified: 2026-02-24 against Dokploy v0.27.1 at panel.example.com

## Implemented Modules (23 modules, 196 tools)

| Module | Tools | API Endpoints | Coverage | Notes |
|--------|-------|---------------|----------|-------|
| project | 6 | 6 | 100% | `project.all` returns 500 (Dokploy server bug) |
| application | 26 | 28 | 93% | Missing: `clearDeployments`, `killBuild` |
| compose | 14 | 27 | 52% | Missing: `cancelDeployment`, `clearDeployments`, `disconnectGitProvider`, `fetchSourceType`, `getConvertedCompose`, `getTags`, `import`, `isolatedDeployment`, `killBuild`, `loadMountsByService`, `loadServices`, `move`, `processTemplate`, `start` |
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
| settings | 25 | 49 | 51% | Many read-only info endpoints not implemented |
| admin | 1 | 1 | 100% | |
| user | 1 | 18 | 6% | Only `user.all` implemented |

## Unimplemented Modules (19 modules, 193 endpoints)

| Module | Endpoints | Priority | Notes |
|--------|-----------|----------|-------|
| notification | 38 | Medium | 11 notification types (Discord, Slack, Telegram, etc.) |
| server | 16 | High | Multi-server management, metrics, SSH keys |
| sso | 10 | Low | SSO provider management |
| organization | 9 | Medium | Org management, invitations, roles |
| ai | 9 | Low | AI suggestion features |
| gitea | 8 | Medium | Git provider management |
| bitbucket | 7 | Medium | Git provider management |
| gitlab | 7 | Medium | Git provider management |
| github | 6 | Medium | Git provider management |
| environment | 6 | High | Project environment CRUD (needed for service creation) |
| licenseKey | 6 | Low | Enterprise licensing |
| sshKey | 6 | Medium | SSH key management |
| schedule | 6 | Medium | Scheduled tasks / cron jobs |
| volumeBackups | 6 | Medium | Volume backup management |
| stripe | 5 | Skip | Billing/payment — not useful for MCP |
| previewDeployment | 4 | Medium | Preview deployment management |
| swarm | 3 | Low | Docker Swarm node info |
| rollback | 2 | High | Deployment rollback/delete |
| gitProvider | 2 | Low | Generic git provider list/remove |

## Known Issues

- **`project.all` returns HTTP 500**: Confirmed Dokploy v0.27.1 server-side bug. All other list endpoints work. Workaround: use `project.one` with known project IDs.
- **`project.create` auto-creates environment**: Returns both project and a default "production" environment. Services require `environmentId` (not `projectId`).

## Removed Phantom Tools (2026-02-24)

These tools were removed because they called endpoints that don't exist (confirmed 404):

- **auth module** (14 tools): Entire module removed. Auth is not part of the Dokploy REST API.
- **admin module** (8 tools): `admin.one`, `admin.createUserInvitation`, `admin.removeUser`, `admin.getUserByToken`, `admin.assignPermissions`, `admin.cleanGithubApp`, `admin.getRepositories`, `admin.getBranches`, `admin.haveGithubConfigured`
- **application** (2 tools): `generateSSHKey`, `removeSSHKey`
- **compose** (3 tools): `allServices`, `generateSSHKey`, `removeSSHKey`
- **domain** (1 tool): `generateWildcard`
- **registry** (1 tool): `enableSelfHostedRegistry`
- **settings** (1 tool): `checkAndUpdateImage`
- **user** (2 tools): `byAuthId`, `byUserId`

## Bugs Fixed (2026-02-24)

- **Typo**: `application.saveGitProdiver` → `application.saveGitProvider`
- **Wrong parameter**: `project.duplicate` used `sourceProjectId`, API requires `sourceEnvironmentId`
