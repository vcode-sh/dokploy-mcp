# Dokploy API Reference

Auto-generated from the OpenAPI 3.0.3 spec. This is the raw Dokploy API -- every endpoint, every parameter. If you're looking for what this MCP server actually implements, see [TOOLS.md](TOOLS.md) and [coverage.md](coverage.md) instead.

**Base URL:** `https://panel.example.com/api`

---

## Table of Contents

- [Admin](#admin) (1 endpoint)
- [Project](#project) (6 endpoints)
- [Application](#application) (28 endpoints)
- [Compose](#compose) (27 endpoints)
- [Domain](#domain) (9 endpoints)
- [Postgres](#postgres) (13 endpoints)
- [Mysql](#mysql) (13 endpoints)
- [Mariadb](#mariadb) (13 endpoints)
- [Mongo](#mongo) (13 endpoints)
- [Redis](#redis) (13 endpoints)
- [Deployment](#deployment) (6 endpoints)
- [Docker](#docker) (7 endpoints)
- [Certificates](#certificates) (4 endpoints)
- [Registry](#registry) (7 endpoints)
- [Destination](#destination) (6 endpoints)
- [Backup](#backup) (11 endpoints)
- [Mounts](#mounts) (5 endpoints)
- [Port](#port) (4 endpoints)
- [Redirects](#redirects) (4 endpoints)
- [Security](#security) (4 endpoints)
- [Cluster](#cluster) (4 endpoints)
- [Settings](#settings) (49 endpoints)
- [User](#user) (18 endpoints)
- [Ai](#ai) (9 endpoints)
- [Environment](#environment) (6 endpoints)
- [GitProvider](#gitprovider) (2 endpoints)
- [Gitea](#gitea) (8 endpoints)
- [Github](#github) (6 endpoints)
- [Gitlab](#gitlab) (7 endpoints)
- [Bitbucket](#bitbucket) (7 endpoints)
- [Organization](#organization) (9 endpoints)
- [Sso](#sso) (10 endpoints)
- [Notification](#notification) (38 endpoints)
- [LicenseKey](#licensekey) (6 endpoints)
- [Stripe](#stripe) (5 endpoints)
- [Schedule](#schedule) (6 endpoints)
- [Rollback](#rollback) (2 endpoints)
- [PreviewDeployment](#previewdeployment) (4 endpoints)
- [Server](#server) (16 endpoints)
- [VolumeBackups](#volumebackups) (6 endpoints)
- [SshKey](#sshkey) (6 endpoints)
- [Swarm](#swarm) (3 endpoints)

---

## Admin

### `POST /admin.setupMonitoring`

**Admin setup Monitoring**

**Request body:**

- `metricsConfig` (object) **required**

**Response:** 200 OK

---

## Project

### `GET /project.all`

**Project all**

**Response:** 200 OK

---

### `POST /project.create`

**Project create**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `env` (string) optional

**Response:** 200 OK

---

### `POST /project.duplicate`

**Project duplicate**

**Request body:**

- `sourceEnvironmentId` (string) **required**
- `name` (string) **required**
- `description` (string) optional
- `includeServices` (boolean) optional
- `selectedServices` (array) optional
- `duplicateInSameProject` (boolean) optional

**Response:** 200 OK

---

### `GET /project.one`

**Project one**

**Parameters:**

- `projectId` (string) **required**

**Response:** 200 OK

---

### `POST /project.remove`

**Project remove**

**Request body:**

- `projectId` (string) **required**

**Response:** 200 OK

---

### `POST /project.update`

**Project update**

**Request body:**

- `projectId` (string) **required**
- `name` (string) optional
- `description` (string) optional
- `createdAt` (string) optional
- `organizationId` (string) optional
- `env` (string) optional

**Response:** 200 OK

---

## Application

### `POST /application.cancelDeployment`

**Application cancel Deployment**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.cleanQueues`

**Application clean Queues**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.clearDeployments`

**Application clear Deployments**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.create`

**Application create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `description` (string) optional
- `environmentId` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /application.delete`

**Application delete**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.deploy`

**Application deploy**

**Request body:**

- `applicationId` (string) **required**
- `title` (string) optional
- `description` (string) optional

**Response:** 200 OK

---

### `POST /application.disconnectGitProvider`

**Application disconnect Git Provider**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.killBuild`

**Application kill Build**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.markRunning`

**Application mark Running**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.move`

**Application move**

**Request body:**

- `applicationId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /application.one`

**Application one**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `GET /application.readAppMonitoring`

**Application read App Monitoring**

**Parameters:**

- `appName` (string) **required**

**Response:** 200 OK

---

### `GET /application.readTraefikConfig`

**Application read Traefik Config**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.redeploy`

**Application redeploy**

**Request body:**

- `applicationId` (string) **required**
- `title` (string) optional
- `description` (string) optional

**Response:** 200 OK

---

### `POST /application.refreshToken`

**Application refresh Token**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.reload`

**Application reload**

**Request body:**

- `appName` (string) **required**
- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.saveBitbucketProvider`

**Application save Bitbucket Provider**

**Request body:**

- `bitbucketBranch` (string) **required**
- `bitbucketBuildPath` (string) **required**
- `bitbucketOwner` (string) **required**
- `bitbucketRepository` (string) **required**
- `bitbucketRepositorySlug` (string) **required**
- `bitbucketId` (string) **required**
- `applicationId` (string) **required**
- `watchPaths` (array) optional
- `enableSubmodules` (boolean) **required**

**Response:** 200 OK

---

### `POST /application.saveBuildType`

**Application save Build Type**

**Request body:**

- `applicationId` (string) **required**
- `buildType` (string) **required**
- `dockerfile` (string) optional
- `dockerContextPath` (string) **required**
- `dockerBuildStage` (string) **required**
- `herokuVersion` (string) optional
- `railpackVersion` (string) optional
- `publishDirectory` (string) optional
- `isStaticSpa` (boolean) optional

**Response:** 200 OK

---

### `POST /application.saveDockerProvider`

**Application save Docker Provider**

**Request body:**

- `dockerImage` (string) optional
- `applicationId` (string) **required**
- `username` (string) optional
- `password` (string) optional
- `registryUrl` (string) optional

**Response:** 200 OK

---

### `POST /application.saveEnvironment`

**Application save Environment**

**Request body:**

- `applicationId` (string) **required**
- `env` (string) optional
- `buildArgs` (string) optional
- `buildSecrets` (string) optional
- `createEnvFile` (boolean) optional

**Response:** 200 OK

---

### `POST /application.saveGiteaProvider`

**Application save Gitea Provider**

**Request body:**

- `applicationId` (string) **required**
- `giteaBranch` (string) **required**
- `giteaBuildPath` (string) **required**
- `giteaOwner` (string) **required**
- `giteaRepository` (string) **required**
- `giteaId` (string) **required**
- `watchPaths` (array) optional
- `enableSubmodules` (boolean) **required**

**Response:** 200 OK

---

### `POST /application.saveGithubProvider`

**Application save Github Provider**

**Request body:**

- `applicationId` (string) **required**
- `repository` (string) optional
- `branch` (string) optional
- `owner` (string) **required**
- `buildPath` (string) optional
- `githubId` (string) **required**
- `watchPaths` (array) optional
- `enableSubmodules` (boolean) **required**
- `triggerType` (string) optional

**Response:** 200 OK

---

### `POST /application.saveGitlabProvider`

**Application save Gitlab Provider**

**Request body:**

- `applicationId` (string) **required**
- `gitlabBranch` (string) **required**
- `gitlabBuildPath` (string) **required**
- `gitlabOwner` (string) **required**
- `gitlabRepository` (string) **required**
- `gitlabId` (string) **required**
- `gitlabProjectId` (number) **required**
- `gitlabPathNamespace` (string) **required**
- `watchPaths` (array) optional
- `enableSubmodules` (boolean) **required**

**Response:** 200 OK

---

### `POST /application.saveGitProvider`

**Application save Git Provider**

**Request body:**

- `customGitBranch` (string) optional
- `applicationId` (string) **required**
- `customGitBuildPath` (string) optional
- `customGitUrl` (string) optional
- `watchPaths` (array) optional
- `enableSubmodules` (boolean) **required**
- `customGitSSHKeyId` (string) optional

**Response:** 200 OK

---

### `POST /application.start`

**Application start**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.stop`

**Application stop**

**Request body:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /application.update`

**Application update**

**Request body:**

- `applicationId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `env` (string) optional
- `previewEnv` (string) optional
- `watchPaths` (array) optional
- `previewBuildArgs` (string) optional
- `previewBuildSecrets` (string) optional
- `previewLabels` (array) optional
- `previewWildcard` (string) optional
- `previewPort` (number) optional
- `previewHttps` (boolean) optional
- `previewPath` (string) optional
- `previewCertificateType` (string) optional
- `previewCustomCertResolver` (string) optional
- `previewLimit` (number) optional
- `isPreviewDeploymentsActive` (boolean) optional
- `previewRequireCollaboratorPermissions` (boolean) optional
- `rollbackActive` (boolean) optional
- `buildArgs` (string) optional
- `buildSecrets` (string) optional
- `memoryReservation` (string) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `title` (string) optional
- `enabled` (boolean) optional
- `subtitle` (string) optional
- `command` (string) optional
- `args` (array) optional
- `refreshToken` (string) optional
- `sourceType` (string) optional
- `cleanCache` (boolean) optional
- `repository` (string) optional
- `owner` (string) optional
- `branch` (string) optional
- `buildPath` (string) optional
- `triggerType` (string) optional
- `autoDeploy` (boolean) optional
- `gitlabProjectId` (number) optional
- `gitlabRepository` (string) optional
- `gitlabOwner` (string) optional
- `gitlabBranch` (string) optional
- `gitlabBuildPath` (string) optional
- `gitlabPathNamespace` (string) optional
- `giteaRepository` (string) optional
- `giteaOwner` (string) optional
- `giteaBranch` (string) optional
- `giteaBuildPath` (string) optional
- `bitbucketRepository` (string) optional
- `bitbucketRepositorySlug` (string) optional
- `bitbucketOwner` (string) optional
- `bitbucketBranch` (string) optional
- `bitbucketBuildPath` (string) optional
- `username` (string) optional
- `password` (string) optional
- `dockerImage` (string) optional
- `registryUrl` (string) optional
- `customGitUrl` (string) optional
- `customGitBranch` (string) optional
- `customGitBuildPath` (string) optional
- `customGitSSHKeyId` (string) optional
- `enableSubmodules` (boolean) optional
- `dockerfile` (string) optional
- `dockerContextPath` (string) optional
- `dockerBuildStage` (string) optional
- `dropBuildPath` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `applicationStatus` (string) optional
- `buildType` (string) optional
- `railpackVersion` (string) optional
- `herokuVersion` (string) optional
- `publishDirectory` (string) optional
- `isStaticSpa` (boolean) optional
- `createEnvFile` (boolean) optional
- `createdAt` (string) optional
- `registryId` (string) optional
- `rollbackRegistryId` (string) optional
- `environmentId` (string) optional
- `githubId` (string) optional
- `gitlabId` (string) optional
- `giteaId` (string) optional
- `bitbucketId` (string) optional
- `buildServerId` (string) optional
- `buildRegistryId` (string) optional

**Response:** 200 OK

---

### `POST /application.updateTraefikConfig`

**Application update Traefik Config**

**Request body:**

- `applicationId` (string) **required**
- `traefikConfig` (string) **required**

**Response:** 200 OK

---

## Compose

### `POST /compose.cancelDeployment`

**Compose cancel Deployment**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.cleanQueues`

**Compose clean Queues**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.clearDeployments`

**Compose clear Deployments**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.create`

**Compose create**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `environmentId` (string) **required**
- `composeType` (string) optional
- `appName` (string) optional
- `serverId` (string) optional
- `composeFile` (string) optional

**Response:** 200 OK

---

### `POST /compose.delete`

**Compose delete**

**Request body:**

- `composeId` (string) **required**
- `deleteVolumes` (boolean) **required**

**Response:** 200 OK

---

### `POST /compose.deploy`

**Compose deploy**

**Request body:**

- `composeId` (string) **required**
- `title` (string) optional
- `description` (string) optional

**Response:** 200 OK

---

### `POST /compose.deployTemplate`

**Compose deploy Template**

**Request body:**

- `environmentId` (string) **required**
- `serverId` (string) optional
- `id` (string) **required**
- `baseUrl` (string) optional

**Response:** 200 OK

---

### `POST /compose.disconnectGitProvider`

**Compose disconnect Git Provider**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.fetchSourceType`

**Compose fetch Source Type**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.getConvertedCompose`

**Compose get Converted Compose**

**Parameters:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.getDefaultCommand`

**Compose get Default Command**

**Parameters:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.getTags`

**Compose get Tags**

**Parameters:**

- `baseUrl` (string) optional

**Response:** 200 OK

---

### `POST /compose.import`

**Compose import**

**Request body:**

- `base64` (string) **required**
- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.isolatedDeployment`

**Compose isolated Deployment**

**Request body:**

- `composeId` (string) **required**
- `suffix` (string) optional

**Response:** 200 OK

---

### `POST /compose.killBuild`

**Compose kill Build**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.loadMountsByService`

**Compose load Mounts By Service**

**Parameters:**

- `composeId` (string) **required**
- `serviceName` (string) **required**

**Response:** 200 OK

---

### `GET /compose.loadServices`

**Compose load Services**

**Parameters:**

- `composeId` (string) **required**
- `type` () optional

**Response:** 200 OK

---

### `POST /compose.move`

**Compose move**

**Request body:**

- `composeId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.one`

**Compose one**

**Parameters:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.processTemplate`

**Compose process Template**

**Request body:**

- `base64` (string) **required**
- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.randomizeCompose`

**Compose randomize Compose**

**Request body:**

- `composeId` (string) **required**
- `suffix` (string) optional

**Response:** 200 OK

---

### `POST /compose.redeploy`

**Compose redeploy**

**Request body:**

- `composeId` (string) **required**
- `title` (string) optional
- `description` (string) optional

**Response:** 200 OK

---

### `POST /compose.refreshToken`

**Compose refresh Token**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.start`

**Compose start**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `POST /compose.stop`

**Compose stop**

**Request body:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /compose.templates`

**Compose templates**

**Parameters:**

- `baseUrl` (string) optional

**Response:** 200 OK

---

### `POST /compose.update`

**Compose update**

**Request body:**

- `composeId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `env` (string) optional
- `composeFile` (string) optional
- `refreshToken` (string) optional
- `sourceType` (string) optional
- `composeType` (string) optional
- `repository` (string) optional
- `owner` (string) optional
- `branch` (string) optional
- `autoDeploy` (boolean) optional
- `gitlabProjectId` (number) optional
- `gitlabRepository` (string) optional
- `gitlabOwner` (string) optional
- `gitlabBranch` (string) optional
- `gitlabPathNamespace` (string) optional
- `bitbucketRepository` (string) optional
- `bitbucketRepositorySlug` (string) optional
- `bitbucketOwner` (string) optional
- `bitbucketBranch` (string) optional
- `giteaRepository` (string) optional
- `giteaOwner` (string) optional
- `giteaBranch` (string) optional
- `customGitUrl` (string) optional
- `customGitBranch` (string) optional
- `customGitSSHKeyId` (string) optional
- `command` (string) optional
- `enableSubmodules` (boolean) optional
- `composePath` (string) optional
- `suffix` (string) optional
- `randomize` (boolean) optional
- `isolatedDeployment` (boolean) optional
- `isolatedDeploymentsVolume` (boolean) optional
- `triggerType` (string) optional
- `composeStatus` (string) optional
- `environmentId` (string) optional
- `createdAt` (string) optional
- `watchPaths` (array) optional
- `githubId` (string) optional
- `gitlabId` (string) optional
- `bitbucketId` (string) optional
- `giteaId` (string) optional

**Response:** 200 OK

---

## Domain

### `GET /domain.byApplicationId`

**Domain by Application Id**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `GET /domain.byComposeId`

**Domain by Compose Id**

**Parameters:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /domain.canGenerateTraefikMeDomains`

**Domain can Generate Traefik Me Domains**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `POST /domain.create`

**Domain create**

**Request body:**

- `host` (string) **required**
- `path` (string) optional
- `port` (number) optional
- `https` (boolean) optional
- `applicationId` (string) optional
- `certificateType` (string) optional
- `customCertResolver` (string) optional
- `composeId` (string) optional
- `serviceName` (string) optional
- `domainType` (string) optional
- `previewDeploymentId` (string) optional
- `internalPath` (string) optional
- `stripPath` (boolean) optional

**Response:** 200 OK

---

### `POST /domain.delete`

**Domain delete**

**Request body:**

- `domainId` (string) **required**

**Response:** 200 OK

---

### `POST /domain.generateDomain`

**Domain generate Domain**

**Request body:**

- `appName` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /domain.one`

**Domain one**

**Parameters:**

- `domainId` (string) **required**

**Response:** 200 OK

---

### `POST /domain.update`

**Domain update**

**Request body:**

- `host` (string) **required**
- `path` (string) optional
- `port` (number) optional
- `https` (boolean) optional
- `certificateType` (string) optional
- `customCertResolver` (string) optional
- `serviceName` (string) optional
- `domainType` (string) optional
- `internalPath` (string) optional
- `stripPath` (boolean) optional
- `domainId` (string) **required**

**Response:** 200 OK

---

### `POST /domain.validateDomain`

**Domain validate Domain**

**Request body:**

- `domain` (string) **required**
- `serverIp` (string) optional

**Response:** 200 OK

---

## Postgres

### `POST /postgres.changeStatus`

**Postgres change Status**

**Request body:**

- `postgresId` (string) **required**
- `applicationStatus` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.create`

**Postgres create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `databaseName` (string) **required**
- `databaseUser` (string) **required**
- `databasePassword` (string) **required**
- `dockerImage` (string) optional
- `environmentId` (string) **required**
- `description` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /postgres.deploy`

**Postgres deploy**

**Request body:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.move`

**Postgres move**

**Request body:**

- `postgresId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /postgres.one`

**Postgres one**

**Parameters:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.rebuild`

**Postgres rebuild**

**Request body:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.reload`

**Postgres reload**

**Request body:**

- `postgresId` (string) **required**
- `appName` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.remove`

**Postgres remove**

**Request body:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.saveEnvironment`

**Postgres save Environment**

**Request body:**

- `postgresId` (string) **required**
- `env` (string) optional

**Response:** 200 OK

---

### `POST /postgres.saveExternalPort`

**Postgres save External Port**

**Request body:**

- `postgresId` (string) **required**
- `externalPort` (number) **required**

**Response:** 200 OK

---

### `POST /postgres.start`

**Postgres start**

**Request body:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.stop`

**Postgres stop**

**Request body:**

- `postgresId` (string) **required**

**Response:** 200 OK

---

### `POST /postgres.update`

**Postgres update**

**Request body:**

- `postgresId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `databaseName` (string) optional
- `databaseUser` (string) optional
- `databasePassword` (string) optional
- `description` (string) optional
- `dockerImage` (string) optional
- `command` (string) optional
- `args` (array) optional
- `env` (string) optional
- `memoryReservation` (string) optional
- `externalPort` (number) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `applicationStatus` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `createdAt` (string) optional
- `environmentId` (string) optional

**Response:** 200 OK

---

## Mysql

### `POST /mysql.changeStatus`

**Mysql change Status**

**Request body:**

- `mysqlId` (string) **required**
- `applicationStatus` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.create`

**Mysql create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `dockerImage` (string) optional
- `environmentId` (string) **required**
- `description` (string) optional
- `databaseName` (string) **required**
- `databaseUser` (string) **required**
- `databasePassword` (string) **required**
- `databaseRootPassword` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /mysql.deploy`

**Mysql deploy**

**Request body:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.move`

**Mysql move**

**Request body:**

- `mysqlId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /mysql.one`

**Mysql one**

**Parameters:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.rebuild`

**Mysql rebuild**

**Request body:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.reload`

**Mysql reload**

**Request body:**

- `mysqlId` (string) **required**
- `appName` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.remove`

**Mysql remove**

**Request body:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.saveEnvironment`

**Mysql save Environment**

**Request body:**

- `mysqlId` (string) **required**
- `env` (string) optional

**Response:** 200 OK

---

### `POST /mysql.saveExternalPort`

**Mysql save External Port**

**Request body:**

- `mysqlId` (string) **required**
- `externalPort` (number) **required**

**Response:** 200 OK

---

### `POST /mysql.start`

**Mysql start**

**Request body:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.stop`

**Mysql stop**

**Request body:**

- `mysqlId` (string) **required**

**Response:** 200 OK

---

### `POST /mysql.update`

**Mysql update**

**Request body:**

- `mysqlId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `databaseName` (string) optional
- `databaseUser` (string) optional
- `databasePassword` (string) optional
- `databaseRootPassword` (string) optional
- `dockerImage` (string) optional
- `command` (string) optional
- `args` (array) optional
- `env` (string) optional
- `memoryReservation` (string) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `externalPort` (number) optional
- `applicationStatus` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `createdAt` (string) optional
- `environmentId` (string) optional

**Response:** 200 OK

---

## Mariadb

### `POST /mariadb.changeStatus`

**Mariadb change Status**

**Request body:**

- `mariadbId` (string) **required**
- `applicationStatus` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.create`

**Mariadb create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `dockerImage` (string) optional
- `databaseRootPassword` (string) optional
- `environmentId` (string) **required**
- `description` (string) optional
- `databaseName` (string) **required**
- `databaseUser` (string) **required**
- `databasePassword` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /mariadb.deploy`

**Mariadb deploy**

**Request body:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.move`

**Mariadb move**

**Request body:**

- `mariadbId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /mariadb.one`

**Mariadb one**

**Parameters:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.rebuild`

**Mariadb rebuild**

**Request body:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.reload`

**Mariadb reload**

**Request body:**

- `mariadbId` (string) **required**
- `appName` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.remove`

**Mariadb remove**

**Request body:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.saveEnvironment`

**Mariadb save Environment**

**Request body:**

- `mariadbId` (string) **required**
- `env` (string) optional

**Response:** 200 OK

---

### `POST /mariadb.saveExternalPort`

**Mariadb save External Port**

**Request body:**

- `mariadbId` (string) **required**
- `externalPort` (number) **required**

**Response:** 200 OK

---

### `POST /mariadb.start`

**Mariadb start**

**Request body:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.stop`

**Mariadb stop**

**Request body:**

- `mariadbId` (string) **required**

**Response:** 200 OK

---

### `POST /mariadb.update`

**Mariadb update**

**Request body:**

- `mariadbId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `databaseName` (string) optional
- `databaseUser` (string) optional
- `databasePassword` (string) optional
- `databaseRootPassword` (string) optional
- `dockerImage` (string) optional
- `command` (string) optional
- `args` (array) optional
- `env` (string) optional
- `memoryReservation` (string) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `externalPort` (number) optional
- `applicationStatus` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `createdAt` (string) optional
- `environmentId` (string) optional

**Response:** 200 OK

---

## Mongo

### `POST /mongo.changeStatus`

**Mongo change Status**

**Request body:**

- `mongoId` (string) **required**
- `applicationStatus` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.create`

**Mongo create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `dockerImage` (string) optional
- `environmentId` (string) **required**
- `description` (string) optional
- `databaseUser` (string) **required**
- `databasePassword` (string) **required**
- `serverId` (string) optional
- `replicaSets` (boolean) optional

**Response:** 200 OK

---

### `POST /mongo.deploy`

**Mongo deploy**

**Request body:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.move`

**Mongo move**

**Request body:**

- `mongoId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /mongo.one`

**Mongo one**

**Parameters:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.rebuild`

**Mongo rebuild**

**Request body:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.reload`

**Mongo reload**

**Request body:**

- `mongoId` (string) **required**
- `appName` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.remove`

**Mongo remove**

**Request body:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.saveEnvironment`

**Mongo save Environment**

**Request body:**

- `mongoId` (string) **required**
- `env` (string) optional

**Response:** 200 OK

---

### `POST /mongo.saveExternalPort`

**Mongo save External Port**

**Request body:**

- `mongoId` (string) **required**
- `externalPort` (number) **required**

**Response:** 200 OK

---

### `POST /mongo.start`

**Mongo start**

**Request body:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.stop`

**Mongo stop**

**Request body:**

- `mongoId` (string) **required**

**Response:** 200 OK

---

### `POST /mongo.update`

**Mongo update**

**Request body:**

- `mongoId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `databaseUser` (string) optional
- `databasePassword` (string) optional
- `dockerImage` (string) optional
- `command` (string) optional
- `args` (array) optional
- `env` (string) optional
- `memoryReservation` (string) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `externalPort` (number) optional
- `applicationStatus` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `createdAt` (string) optional
- `environmentId` (string) optional
- `replicaSets` (boolean) optional

**Response:** 200 OK

---

## Redis

### `POST /redis.changeStatus`

**Redis change Status**

**Request body:**

- `redisId` (string) **required**
- `applicationStatus` (string) **required**

**Response:** 200 OK

---

### `POST /redis.create`

**Redis create**

**Request body:**

- `name` (string) **required**
- `appName` (string) optional
- `databasePassword` (string) **required**
- `dockerImage` (string) optional
- `environmentId` (string) **required**
- `description` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /redis.deploy`

**Redis deploy**

**Request body:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.move`

**Redis move**

**Request body:**

- `redisId` (string) **required**
- `targetEnvironmentId` (string) **required**

**Response:** 200 OK

---

### `GET /redis.one`

**Redis one**

**Parameters:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.rebuild`

**Redis rebuild**

**Request body:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.reload`

**Redis reload**

**Request body:**

- `redisId` (string) **required**
- `appName` (string) **required**

**Response:** 200 OK

---

### `POST /redis.remove`

**Redis remove**

**Request body:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.saveEnvironment`

**Redis save Environment**

**Request body:**

- `redisId` (string) **required**
- `env` (string) optional

**Response:** 200 OK

---

### `POST /redis.saveExternalPort`

**Redis save External Port**

**Request body:**

- `redisId` (string) **required**
- `externalPort` (number) **required**

**Response:** 200 OK

---

### `POST /redis.start`

**Redis start**

**Request body:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.stop`

**Redis stop**

**Request body:**

- `redisId` (string) **required**

**Response:** 200 OK

---

### `POST /redis.update`

**Redis update**

**Request body:**

- `redisId` (string) **required**
- `name` (string) optional
- `appName` (string) optional
- `description` (string) optional
- `databasePassword` (string) optional
- `dockerImage` (string) optional
- `command` (string) optional
- `args` (array) optional
- `env` (string) optional
- `memoryReservation` (string) optional
- `memoryLimit` (string) optional
- `cpuReservation` (string) optional
- `cpuLimit` (string) optional
- `externalPort` (number) optional
- `createdAt` (string) optional
- `applicationStatus` (string) optional
- `healthCheckSwarm` (object) optional
- `restartPolicySwarm` (object) optional
- `placementSwarm` (object) optional
- `updateConfigSwarm` (object) optional
- `rollbackConfigSwarm` (object) optional
- `modeSwarm` (object) optional
- `labelsSwarm` (object) optional
- `networkSwarm` (array) optional
- `stopGracePeriodSwarm` (integer) optional
- `endpointSpecSwarm` (object) optional
- `ulimitsSwarm` (array) optional
- `replicas` (number) optional
- `environmentId` (string) optional

**Response:** 200 OK

---

## Deployment

### `GET /deployment.all`

**Deployment all**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `GET /deployment.allByCompose`

**Deployment all By Compose**

**Parameters:**

- `composeId` (string) **required**

**Response:** 200 OK

---

### `GET /deployment.allByServer`

**Deployment all By Server**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `GET /deployment.allByType`

**Deployment all By Type**

**Parameters:**

- `id` (string) **required**
- `type` (string) **required**

**Response:** 200 OK

---

### `POST /deployment.killProcess`

**Deployment kill Process**

**Request body:**

- `deploymentId` (string) **required**

**Response:** 200 OK

---

### `POST /deployment.removeDeployment`

**Deployment remove Deployment**

**Request body:**

- `deploymentId` (string) **required**

**Response:** 200 OK

---

## Docker

### `GET /docker.getConfig`

**Docker get Config**

**Parameters:**

- `containerId` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /docker.getContainers`

**Docker get Containers**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /docker.getContainersByAppLabel`

**Docker get Containers By App Label**

**Parameters:**

- `appName` (string) **required**
- `serverId` (string) optional
- `type` (string) **required**

**Response:** 200 OK

---

### `GET /docker.getContainersByAppNameMatch`

**Docker get Containers By App Name Match**

**Parameters:**

- `appType` () optional
- `appName` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /docker.getServiceContainersByAppName`

**Docker get Service Containers By App Name**

**Parameters:**

- `appName` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /docker.getStackContainersByAppName`

**Docker get Stack Containers By App Name**

**Parameters:**

- `appName` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /docker.restartContainer`

**Docker restart Container**

**Request body:**

- `containerId` (string) **required**

**Response:** 200 OK

---

## Certificates

### `GET /certificates.all`

**Certificates all**

**Response:** 200 OK

---

### `POST /certificates.create`

**Certificates create**

**Request body:**

- `certificateId` (string) optional
- `name` (string) **required**
- `certificateData` (string) **required**
- `privateKey` (string) **required**
- `certificatePath` (string) optional
- `autoRenew` (boolean) optional
- `organizationId` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /certificates.one`

**Certificates one**

**Parameters:**

- `certificateId` (string) **required**

**Response:** 200 OK

---

### `POST /certificates.remove`

**Certificates remove**

**Request body:**

- `certificateId` (string) **required**

**Response:** 200 OK

---

## Registry

### `GET /registry.all`

**Registry all**

**Response:** 200 OK

---

### `POST /registry.create`

**Registry create**

**Request body:**

- `registryName` (string) **required**
- `username` (string) **required**
- `password` (string) **required**
- `registryUrl` (string) **required**
- `registryType` (string) **required**
- `imagePrefix` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /registry.one`

**Registry one**

**Parameters:**

- `registryId` (string) **required**

**Response:** 200 OK

---

### `POST /registry.remove`

**Registry remove**

**Request body:**

- `registryId` (string) **required**

**Response:** 200 OK

---

### `POST /registry.testRegistry`

**Registry test Registry**

**Request body:**

- `registryName` (string) optional
- `username` (string) **required**
- `password` (string) **required**
- `registryUrl` (string) **required**
- `registryType` (string) **required**
- `imagePrefix` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /registry.testRegistryById`

**Registry test Registry By Id**

**Request body:**

- `registryId` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /registry.update`

**Registry update**

**Request body:**

- `registryId` (string) **required**
- `registryName` (string) optional
- `imagePrefix` (string) optional
- `username` (string) optional
- `password` (string) optional
- `registryUrl` (string) optional
- `createdAt` (string) optional
- `registryType` (string) optional
- `organizationId` (string) optional
- `serverId` (string) optional

**Response:** 200 OK

---

## Destination

### `GET /destination.all`

**Destination all**

**Response:** 200 OK

---

### `POST /destination.create`

**Destination create**

**Request body:**

- `name` (string) **required**
- `provider` (string) **required**
- `accessKey` (string) **required**
- `bucket` (string) **required**
- `region` (string) **required**
- `endpoint` (string) **required**
- `secretAccessKey` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /destination.one`

**Destination one**

**Parameters:**

- `destinationId` (string) **required**

**Response:** 200 OK

---

### `POST /destination.remove`

**Destination remove**

**Request body:**

- `destinationId` (string) **required**

**Response:** 200 OK

---

### `POST /destination.testConnection`

**Destination test Connection**

**Request body:**

- `name` (string) **required**
- `provider` (string) **required**
- `accessKey` (string) **required**
- `bucket` (string) **required**
- `region` (string) **required**
- `endpoint` (string) **required**
- `secretAccessKey` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /destination.update`

**Destination update**

**Request body:**

- `name` (string) **required**
- `accessKey` (string) **required**
- `bucket` (string) **required**
- `region` (string) **required**
- `endpoint` (string) **required**
- `secretAccessKey` (string) **required**
- `destinationId` (string) **required**
- `provider` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

## Backup

### `POST /backup.create`

**Backup create**

**Request body:**

- `schedule` (string) **required**
- `enabled` (boolean) optional
- `prefix` (string) **required**
- `destinationId` (string) **required**
- `keepLatestCount` (number) optional
- `database` (string) **required**
- `mariadbId` (string) optional
- `mysqlId` (string) optional
- `postgresId` (string) optional
- `mongoId` (string) optional
- `databaseType` (string) **required**
- `userId` (string) optional
- `backupType` (string) optional
- `composeId` (string) optional
- `serviceName` (string) optional
- `metadata` (any) optional

**Response:** 200 OK

---

### `GET /backup.listBackupFiles`

**Backup list Backup Files**

**Parameters:**

- `destinationId` (string) **required**
- `search` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /backup.manualBackupCompose`

**Backup manual Backup Compose**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.manualBackupMariadb`

**Backup manual Backup Mariadb**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.manualBackupMongo`

**Backup manual Backup Mongo**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.manualBackupMySql`

**Backup manual Backup My Sql**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.manualBackupPostgres`

**Backup manual Backup Postgres**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.manualBackupWebServer`

**Backup manual Backup Web Server**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `GET /backup.one`

**Backup one**

**Parameters:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.remove`

**Backup remove**

**Request body:**

- `backupId` (string) **required**

**Response:** 200 OK

---

### `POST /backup.update`

**Backup update**

**Request body:**

- `schedule` (string) **required**
- `enabled` (boolean) optional
- `prefix` (string) **required**
- `backupId` (string) **required**
- `destinationId` (string) **required**
- `database` (string) **required**
- `keepLatestCount` (number) optional
- `serviceName` (string) **required**
- `metadata` (any) optional
- `databaseType` (string) **required**

**Response:** 200 OK

---

## Mounts

### `GET /mounts.allNamedByApplicationId`

**Mounts all Named By Application Id**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /mounts.create`

**Mounts create**

**Request body:**

- `type` (string) **required**
- `hostPath` (string) optional
- `volumeName` (string) optional
- `content` (string) optional
- `mountPath` (string) **required**
- `serviceType` (string) optional
- `filePath` (string) optional
- `serviceId` (string) **required**

**Response:** 200 OK

---

### `GET /mounts.one`

**Mounts one**

**Parameters:**

- `mountId` (string) **required**

**Response:** 200 OK

---

### `POST /mounts.remove`

**Mounts remove**

**Request body:**

- `mountId` (string) **required**

**Response:** 200 OK

---

### `POST /mounts.update`

**Mounts update**

**Request body:**

- `mountId` (string) **required**
- `type` (string) optional
- `hostPath` (string) optional
- `volumeName` (string) optional
- `filePath` (string) optional
- `content` (string) optional
- `serviceType` (string) optional
- `mountPath` (string) optional
- `applicationId` (string) optional
- `postgresId` (string) optional
- `mariadbId` (string) optional
- `mongoId` (string) optional
- `mysqlId` (string) optional
- `redisId` (string) optional
- `composeId` (string) optional

**Response:** 200 OK

---

## Port

### `POST /port.create`

**Port create**

**Request body:**

- `publishedPort` (number) **required**
- `publishMode` (string) optional
- `targetPort` (number) **required**
- `protocol` (string) optional
- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /port.delete`

**Port delete**

**Request body:**

- `portId` (string) **required**

**Response:** 200 OK

---

### `GET /port.one`

**Port one**

**Parameters:**

- `portId` (string) **required**

**Response:** 200 OK

---

### `POST /port.update`

**Port update**

**Request body:**

- `portId` (string) **required**
- `publishedPort` (number) **required**
- `publishMode` (string) optional
- `targetPort` (number) **required**
- `protocol` (string) optional

**Response:** 200 OK

---

## Redirects

### `POST /redirects.create`

**Redirects create**

**Request body:**

- `regex` (string) **required**
- `replacement` (string) **required**
- `permanent` (boolean) **required**
- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /redirects.delete`

**Redirects delete**

**Request body:**

- `redirectId` (string) **required**

**Response:** 200 OK

---

### `GET /redirects.one`

**Redirects one**

**Parameters:**

- `redirectId` (string) **required**

**Response:** 200 OK

---

### `POST /redirects.update`

**Redirects update**

**Request body:**

- `redirectId` (string) **required**
- `regex` (string) **required**
- `replacement` (string) **required**
- `permanent` (boolean) **required**

**Response:** 200 OK

---

## Security

### `POST /security.create`

**Security create**

**Request body:**

- `applicationId` (string) **required**
- `username` (string) **required**
- `password` (string) **required**

**Response:** 200 OK

---

### `POST /security.delete`

**Security delete**

**Request body:**

- `securityId` (string) **required**

**Response:** 200 OK

---

### `GET /security.one`

**Security one**

**Parameters:**

- `securityId` (string) **required**

**Response:** 200 OK

---

### `POST /security.update`

**Security update**

**Request body:**

- `securityId` (string) **required**
- `username` (string) **required**
- `password` (string) **required**

**Response:** 200 OK

---

## Cluster

### `GET /cluster.addManager`

**Cluster add Manager**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /cluster.addWorker`

**Cluster add Worker**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /cluster.getNodes`

**Cluster get Nodes**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /cluster.removeWorker`

**Cluster remove Worker**

**Request body:**

- `nodeId` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

## Settings

### `POST /settings.assignDomainServer`

**Settings assign Domain Server**

**Request body:**

- `host` (string) **required**
- `certificateType` (string) **required**
- `letsEncryptEmail` (any) optional
- `https` (boolean) optional

**Response:** 200 OK

---

### `GET /settings.checkGPUStatus`

**Settings check GPUStatus**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanAll`

**Settings clean All**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanAllDeploymentQueue`

**Settings clean All Deployment Queue**

**Response:** 200 OK

---

### `POST /settings.cleanDockerBuilder`

**Settings clean Docker Builder**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanDockerPrune`

**Settings clean Docker Prune**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanMonitoring`

**Settings clean Monitoring**

**Response:** 200 OK

---

### `POST /settings.cleanRedis`

**Settings clean Redis**

**Response:** 200 OK

---

### `POST /settings.cleanSSHPrivateKey`

**Settings clean SSHPrivate Key**

**Response:** 200 OK

---

### `POST /settings.cleanStoppedContainers`

**Settings clean Stopped Containers**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanUnusedImages`

**Settings clean Unused Images**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.cleanUnusedVolumes`

**Settings clean Unused Volumes**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /settings.getDokployCloudIps`

**Settings get Dokploy Cloud Ips**

**Response:** 200 OK

---

### `GET /settings.getDokployVersion`

**Settings get Dokploy Version**

**Response:** 200 OK

---

### `GET /settings.getIp`

**Settings get Ip**

**Response:** 200 OK

---

### `GET /settings.getLogCleanupStatus`

**Settings get Log Cleanup Status**

**Response:** 200 OK

---

### `GET /settings.getOpenApiDocument`

**Settings get Open Api Document**

**Response:** 200 OK

---

### `GET /settings.getReleaseTag`

**Settings get Release Tag**

**Response:** 200 OK

---

### `GET /settings.getTraefikPorts`

**Settings get Traefik Ports**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.getUpdateData`

**Settings get Update Data**

**Response:** 200 OK

---

### `GET /settings.getWebServerSettings`

**Settings get Web Server Settings**

**Response:** 200 OK

---

### `GET /settings.haveActivateRequests`

**Settings have Activate Requests**

**Response:** 200 OK

---

### `GET /settings.haveTraefikDashboardPortEnabled`

**Settings have Traefik Dashboard Port Enabled**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /settings.health`

**Settings health**

**Response:** 200 OK

---

### `GET /settings.isCloud`

**Settings is Cloud**

**Response:** 200 OK

---

### `GET /settings.isUserSubscribed`

**Settings is User Subscribed**

**Response:** 200 OK

---

### `GET /settings.readDirectories`

**Settings read Directories**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /settings.readMiddlewareTraefikConfig`

**Settings read Middleware Traefik Config**

**Response:** 200 OK

---

### `GET /settings.readTraefikConfig`

**Settings read Traefik Config**

**Response:** 200 OK

---

### `GET /settings.readTraefikEnv`

**Settings read Traefik Env**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /settings.readTraefikFile`

**Settings read Traefik File**

**Parameters:**

- `path` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /settings.readWebServerTraefikConfig`

**Settings read Web Server Traefik Config**

**Response:** 200 OK

---

### `POST /settings.reloadRedis`

**Settings reload Redis**

**Response:** 200 OK

---

### `POST /settings.reloadServer`

**Settings reload Server**

**Response:** 200 OK

---

### `POST /settings.reloadTraefik`

**Settings reload Traefik**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.saveSSHPrivateKey`

**Settings save SSHPrivate Key**

**Request body:**

- `sshPrivateKey` (string) **required**

**Response:** 200 OK

---

### `POST /settings.setupGPU`

**Settings setup GPU**

**Request body:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.toggleDashboard`

**Settings toggle Dashboard**

**Request body:**

- `enableDashboard` (boolean) optional
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.toggleRequests`

**Settings toggle Requests**

**Request body:**

- `enable` (boolean) **required**

**Response:** 200 OK

---

### `POST /settings.updateDockerCleanup`

**Settings update Docker Cleanup**

**Request body:**

- `enableDockerCleanup` (boolean) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.updateLogCleanup`

**Settings update Log Cleanup**

**Request body:**

- `cronExpression` (string) **required**

**Response:** 200 OK

---

### `POST /settings.updateMiddlewareTraefikConfig`

**Settings update Middleware Traefik Config**

**Request body:**

- `traefikConfig` (string) **required**

**Response:** 200 OK

---

### `POST /settings.updateServer`

**Settings update Server**

**Response:** 200 OK

---

### `POST /settings.updateServerIp`

**Settings update Server Ip**

**Request body:**

- `serverIp` (string) **required**

**Response:** 200 OK

---

### `POST /settings.updateTraefikConfig`

**Settings update Traefik Config**

**Request body:**

- `traefikConfig` (string) **required**

**Response:** 200 OK

---

### `POST /settings.updateTraefikFile`

**Settings update Traefik File**

**Request body:**

- `path` (string) **required**
- `traefikConfig` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /settings.updateTraefikPorts`

**Settings update Traefik Ports**

**Request body:**

- `serverId` (string) optional
- `additionalPorts` (array) **required**

**Response:** 200 OK

---

### `POST /settings.updateWebServerTraefikConfig`

**Settings update Web Server Traefik Config**

**Request body:**

- `traefikConfig` (string) **required**

**Response:** 200 OK

---

### `POST /settings.writeTraefikEnv`

**Settings write Traefik Env**

**Request body:**

- `env` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

## User

### `GET /user.all`

**User all**

**Response:** 200 OK

---

### `POST /user.assignPermissions`

**User assign Permissions**

**Request body:**

- `id` (string) **required**
- `accessedProjects` (array) **required**
- `accessedEnvironments` (array) **required**
- `accessedServices` (array) **required**
- `canCreateProjects` (boolean) **required**
- `canCreateServices` (boolean) **required**
- `canDeleteProjects` (boolean) **required**
- `canDeleteServices` (boolean) **required**
- `canAccessToDocker` (boolean) **required**
- `canAccessToTraefikFiles` (boolean) **required**
- `canAccessToAPI` (boolean) **required**
- `canAccessToSSHKeys` (boolean) **required**
- `canAccessToGitProviders` (boolean) **required**
- `canDeleteEnvironments` (boolean) **required**
- `canCreateEnvironments` (boolean) **required**

**Response:** 200 OK

---

### `GET /user.checkUserOrganizations`

**User check User Organizations**

**Parameters:**

- `userId` (string) **required**

**Response:** 200 OK

---

### `POST /user.createApiKey`

**User create Api Key**

**Request body:**

- `name` (string) **required**
- `prefix` (string) optional
- `expiresIn` (number) optional
- `metadata` (object) **required**
- `rateLimitEnabled` (boolean) optional
- `rateLimitTimeWindow` (number) optional
- `rateLimitMax` (number) optional
- `remaining` (number) optional
- `refillAmount` (number) optional
- `refillInterval` (number) optional

**Response:** 200 OK

---

### `POST /user.deleteApiKey`

**User delete Api Key**

**Request body:**

- `apiKeyId` (string) **required**

**Response:** 200 OK

---

### `POST /user.generateToken`

**User generate Token**

**Response:** 200 OK

---

### `GET /user.get`

**User get**

**Response:** 200 OK

---

### `GET /user.getBackups`

**User get Backups**

**Response:** 200 OK

---

### `GET /user.getContainerMetrics`

**User get Container Metrics**

**Parameters:**

- `url` (string) **required**
- `token` (string) **required**
- `appName` (string) **required**
- `dataPoints` (string) **required**

**Response:** 200 OK

---

### `GET /user.getInvitations`

**User get Invitations**

**Response:** 200 OK

---

### `GET /user.getMetricsToken`

**User get Metrics Token**

**Response:** 200 OK

---

### `GET /user.getServerMetrics`

**User get Server Metrics**

**Response:** 200 OK

---

### `GET /user.getUserByToken`

**User get User By Token**

**Parameters:**

- `token` (string) **required**

**Response:** 200 OK

---

### `GET /user.haveRootAccess`

**User have Root Access**

**Response:** 200 OK

---

### `GET /user.one`

**User one**

**Parameters:**

- `userId` (string) **required**

**Response:** 200 OK

---

### `POST /user.remove`

**User remove**

**Request body:**

- `userId` (string) **required**

**Response:** 200 OK

---

### `POST /user.sendInvitation`

**User send Invitation**

**Request body:**

- `invitationId` (string) **required**
- `notificationId` (string) **required**

**Response:** 200 OK

---

### `POST /user.update`

**User update**

**Request body:**

- `id` (string) optional
- `firstName` (string) optional
- `lastName` (string) optional
- `isRegistered` (boolean) optional
- `expirationDate` (string) optional
- `createdAt2` (string) optional
- `createdAt` (string) optional
- `twoFactorEnabled` (boolean) optional
- `email` (string) optional
- `emailVerified` (boolean) optional
- `image` (string) optional
- `banned` (boolean) optional
- `banReason` (string) optional
- `banExpires` (string) optional
- `updatedAt` (string) optional
- `enablePaidFeatures` (boolean) optional
- `allowImpersonation` (boolean) optional
- `enableEnterpriseFeatures` (boolean) optional
- `licenseKey` (string) optional
- `stripeCustomerId` (string) optional
- `stripeSubscriptionId` (string) optional
- `serversQuantity` (number) optional
- `password` (string) optional
- `currentPassword` (string) optional

**Response:** 200 OK

---

## Ai

### `POST /ai.create`

**Ai create**

**Request body:**

- `name` (string) **required**
- `apiUrl` (string) **required**
- `apiKey` (string) **required**
- `model` (string) **required**
- `isEnabled` (boolean) **required**

**Response:** 200 OK

---

### `POST /ai.delete`

**Ai delete**

**Request body:**

- `aiId` (string) **required**

**Response:** 200 OK

---

### `POST /ai.deploy`

**Ai deploy**

**Request body:**

- `environmentId` (string) **required**
- `id` (string) **required**
- `dockerCompose` (string) **required**
- `envVariables` (string) **required**
- `serverId` (string) optional
- `name` (string) **required**
- `description` (string) **required**
- `domains` (array) optional
- `configFiles` (array) optional

**Response:** 200 OK

---

### `GET /ai.get`

**Ai get**

**Parameters:**

- `aiId` (string) **required**

**Response:** 200 OK

---

### `GET /ai.getAll`

**Ai get All**

**Response:** 200 OK

---

### `GET /ai.getModels`

**Ai get Models**

**Parameters:**

- `apiUrl` (string) **required**
- `apiKey` (string) **required**

**Response:** 200 OK

---

### `GET /ai.one`

**Ai one**

**Parameters:**

- `aiId` (string) **required**

**Response:** 200 OK

---

### `POST /ai.suggest`

**Ai suggest**

**Request body:**

- `aiId` (string) **required**
- `input` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `POST /ai.update`

**Ai update**

**Request body:**

- `aiId` (string) **required**
- `name` (string) optional
- `apiUrl` (string) optional
- `apiKey` (string) optional
- `model` (string) optional
- `isEnabled` (boolean) optional
- `createdAt` (string) optional

**Response:** 200 OK

---

## Environment

### `GET /environment.byProjectId`

**Environment by Project Id**

**Parameters:**

- `projectId` (string) **required**

**Response:** 200 OK

---

### `POST /environment.create`

**Environment create**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `projectId` (string) **required**

**Response:** 200 OK

---

### `POST /environment.duplicate`

**Environment duplicate**

**Request body:**

- `environmentId` (string) **required**
- `name` (string) **required**
- `description` (string) optional

**Response:** 200 OK

---

### `GET /environment.one`

**Environment one**

**Parameters:**

- `environmentId` (string) **required**

**Response:** 200 OK

---

### `POST /environment.remove`

**Environment remove**

**Request body:**

- `environmentId` (string) **required**

**Response:** 200 OK

---

### `POST /environment.update`

**Environment update**

**Request body:**

- `environmentId` (string) **required**
- `name` (string) optional
- `description` (string) optional
- `createdAt` (string) optional
- `env` (string) optional
- `projectId` (string) optional

**Response:** 200 OK

---

## GitProvider

### `GET /gitProvider.getAll`

**Git Provider get All**

**Response:** 200 OK

---

### `POST /gitProvider.remove`

**Git Provider remove**

**Request body:**

- `gitProviderId` (string) **required**

**Response:** 200 OK

---

## Gitea

### `POST /gitea.create`

**Gitea create**

**Request body:**

- `giteaId` (string) optional
- `giteaUrl` (string) **required**
- `giteaInternalUrl` (string) optional
- `redirectUri` (string) optional
- `clientId` (string) optional
- `clientSecret` (string) optional
- `gitProviderId` (string) optional
- `accessToken` (string) optional
- `refreshToken` (string) optional
- `expiresAt` (number) optional
- `scopes` (string) optional
- `lastAuthenticatedAt` (number) optional
- `name` (string) **required**
- `giteaUsername` (string) optional
- `organizationName` (string) optional

**Response:** 200 OK

---

### `GET /gitea.getGiteaBranches`

**Gitea get Gitea Branches**

**Parameters:**

- `owner` (string) **required**
- `repositoryName` (string) **required**
- `giteaId` (string) optional

**Response:** 200 OK

---

### `GET /gitea.getGiteaRepositories`

**Gitea get Gitea Repositories**

**Parameters:**

- `giteaId` (string) **required**

**Response:** 200 OK

---

### `GET /gitea.getGiteaUrl`

**Gitea get Gitea Url**

**Parameters:**

- `giteaId` (string) **required**

**Response:** 200 OK

---

### `GET /gitea.giteaProviders`

**Gitea gitea Providers**

**Response:** 200 OK

---

### `GET /gitea.one`

**Gitea one**

**Parameters:**

- `giteaId` (string) **required**

**Response:** 200 OK

---

### `POST /gitea.testConnection`

**Gitea test Connection**

**Request body:**

- `giteaId` (string) optional
- `organizationName` (string) optional

**Response:** 200 OK

---

### `POST /gitea.update`

**Gitea update**

**Request body:**

- `giteaId` (string) **required**
- `giteaUrl` (string) **required**
- `giteaInternalUrl` (string) optional
- `redirectUri` (string) optional
- `clientId` (string) optional
- `clientSecret` (string) optional
- `gitProviderId` (string) **required**
- `accessToken` (string) optional
- `refreshToken` (string) optional
- `expiresAt` (number) optional
- `scopes` (string) optional
- `lastAuthenticatedAt` (number) optional
- `name` (string) **required**
- `giteaUsername` (string) optional
- `organizationName` (string) optional

**Response:** 200 OK

---

## Github

### `GET /github.getGithubBranches`

**Github get Github Branches**

**Parameters:**

- `repo` (string) **required**
- `owner` (string) **required**
- `githubId` (string) optional

**Response:** 200 OK

---

### `GET /github.getGithubRepositories`

**Github get Github Repositories**

**Parameters:**

- `githubId` (string) **required**

**Response:** 200 OK

---

### `GET /github.githubProviders`

**Github github Providers**

**Response:** 200 OK

---

### `GET /github.one`

**Github one**

**Parameters:**

- `githubId` (string) **required**

**Response:** 200 OK

---

### `POST /github.testConnection`

**Github test Connection**

**Request body:**

- `githubId` (string) **required**

**Response:** 200 OK

---

### `POST /github.update`

**Github update**

**Request body:**

- `githubId` (string) **required**
- `githubAppName` (string) **required**
- `githubAppId` (number) optional
- `githubClientId` (string) optional
- `githubClientSecret` (string) optional
- `githubInstallationId` (string) optional
- `githubPrivateKey` (string) optional
- `githubWebhookSecret` (string) optional
- `gitProviderId` (string) **required**
- `name` (string) **required**

**Response:** 200 OK

---

## Gitlab

### `POST /gitlab.create`

**Gitlab create**

**Request body:**

- `gitlabId` (string) optional
- `gitlabUrl` (string) **required**
- `gitlabInternalUrl` (string) optional
- `applicationId` (string) optional
- `redirectUri` (string) optional
- `secret` (string) optional
- `accessToken` (string) optional
- `refreshToken` (string) optional
- `groupName` (string) optional
- `expiresAt` (number) optional
- `gitProviderId` (string) optional
- `authId` (string) **required**
- `name` (string) **required**

**Response:** 200 OK

---

### `GET /gitlab.getGitlabBranches`

**Gitlab get Gitlab Branches**

**Parameters:**

- `id` (number) optional
- `owner` (string) **required**
- `repo` (string) **required**
- `gitlabId` (string) optional

**Response:** 200 OK

---

### `GET /gitlab.getGitlabRepositories`

**Gitlab get Gitlab Repositories**

**Parameters:**

- `gitlabId` (string) **required**

**Response:** 200 OK

---

### `GET /gitlab.gitlabProviders`

**Gitlab gitlab Providers**

**Response:** 200 OK

---

### `GET /gitlab.one`

**Gitlab one**

**Parameters:**

- `gitlabId` (string) **required**

**Response:** 200 OK

---

### `POST /gitlab.testConnection`

**Gitlab test Connection**

**Request body:**

- `gitlabId` (string) optional
- `groupName` (string) optional

**Response:** 200 OK

---

### `POST /gitlab.update`

**Gitlab update**

**Request body:**

- `gitlabId` (string) **required**
- `gitlabUrl` (string) **required**
- `gitlabInternalUrl` (string) optional
- `applicationId` (string) optional
- `redirectUri` (string) optional
- `secret` (string) optional
- `accessToken` (string) optional
- `refreshToken` (string) optional
- `groupName` (string) optional
- `expiresAt` (number) optional
- `gitProviderId` (string) **required**
- `name` (string) **required**

**Response:** 200 OK

---

## Bitbucket

### `GET /bitbucket.bitbucketProviders`

**Bitbucket bitbucket Providers**

**Response:** 200 OK

---

### `POST /bitbucket.create`

**Bitbucket create**

**Request body:**

- `bitbucketId` (string) optional
- `bitbucketUsername` (string) optional
- `bitbucketEmail` (string) optional
- `appPassword` (string) optional
- `apiToken` (string) optional
- `bitbucketWorkspaceName` (string) optional
- `gitProviderId` (string) optional
- `authId` (string) **required**
- `name` (string) **required**

**Response:** 200 OK

---

### `GET /bitbucket.getBitbucketBranches`

**Bitbucket get Bitbucket Branches**

**Parameters:**

- `owner` (string) **required**
- `repo` (string) **required**
- `bitbucketId` (string) optional

**Response:** 200 OK

---

### `GET /bitbucket.getBitbucketRepositories`

**Bitbucket get Bitbucket Repositories**

**Parameters:**

- `bitbucketId` (string) **required**

**Response:** 200 OK

---

### `GET /bitbucket.one`

**Bitbucket one**

**Parameters:**

- `bitbucketId` (string) **required**

**Response:** 200 OK

---

### `POST /bitbucket.testConnection`

**Bitbucket test Connection**

**Request body:**

- `bitbucketId` (string) **required**
- `bitbucketUsername` (string) optional
- `bitbucketEmail` (string) optional
- `workspaceName` (string) optional
- `apiToken` (string) optional
- `appPassword` (string) optional

**Response:** 200 OK

---

### `POST /bitbucket.update`

**Bitbucket update**

**Request body:**

- `bitbucketId` (string) **required**
- `bitbucketUsername` (string) optional
- `bitbucketEmail` (string) optional
- `appPassword` (string) optional
- `apiToken` (string) optional
- `bitbucketWorkspaceName` (string) optional
- `gitProviderId` (string) **required**
- `name` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

## Organization

### `GET /organization.all`

**Organization all**

**Response:** 200 OK

---

### `GET /organization.allInvitations`

**Organization all Invitations**

**Response:** 200 OK

---

### `POST /organization.create`

**Organization create**

**Request body:**

- `name` (string) **required**
- `logo` (string) optional

**Response:** 200 OK

---

### `POST /organization.delete`

**Organization delete**

**Request body:**

- `organizationId` (string) **required**

**Response:** 200 OK

---

### `GET /organization.one`

**Organization one**

**Parameters:**

- `organizationId` (string) **required**

**Response:** 200 OK

---

### `POST /organization.removeInvitation`

**Organization remove Invitation**

**Request body:**

- `invitationId` (string) **required**

**Response:** 200 OK

---

### `POST /organization.setDefault`

**Organization set Default**

**Request body:**

- `organizationId` (string) **required**

**Response:** 200 OK

---

### `POST /organization.update`

**Organization update**

**Request body:**

- `organizationId` (string) **required**
- `name` (string) **required**
- `logo` (string) optional

**Response:** 200 OK

---

### `POST /organization.updateMemberRole`

**Organization update Member Role**

**Request body:**

- `memberId` (string) **required**
- `role` (string) **required**

**Response:** 200 OK

---

## Sso

### `POST /sso.addTrustedOrigin`

**Sso add Trusted Origin**

**Request body:**

- `origin` (string) **required**

**Response:** 200 OK

---

### `POST /sso.deleteProvider`

**Sso delete Provider**

**Request body:**

- `providerId` (string) **required**

**Response:** 200 OK

---

### `GET /sso.getTrustedOrigins`

**Sso get Trusted Origins**

**Response:** 200 OK

---

### `GET /sso.listProviders`

**Sso list Providers**

**Response:** 200 OK

---

### `GET /sso.one`

**Sso one**

**Parameters:**

- `providerId` (string) **required**

**Response:** 200 OK

---

### `POST /sso.register`

**Sso register**

**Request body:**

- `providerId` (string) **required**
- `issuer` (string) **required**
- `domains` (array) **required**
- `oidcConfig` (object) optional
- `samlConfig` (object) optional
- `organizationId` (string) optional
- `overrideUserInfo` (boolean) optional

**Response:** 200 OK

---

### `POST /sso.removeTrustedOrigin`

**Sso remove Trusted Origin**

**Request body:**

- `origin` (string) **required**

**Response:** 200 OK

---

### `GET /sso.showSignInWithSSO`

**Sso show Sign In With SSO**

**Response:** 200 OK

---

### `POST /sso.update`

**Sso update**

**Request body:**

- `providerId` (string) **required**
- `issuer` (string) **required**
- `domains` (array) **required**
- `oidcConfig` (object) optional
- `samlConfig` (object) optional
- `organizationId` (string) optional
- `overrideUserInfo` (boolean) optional

**Response:** 200 OK

---

### `POST /sso.updateTrustedOrigin`

**Sso update Trusted Origin**

**Request body:**

- `oldOrigin` (string) **required**
- `newOrigin` (string) **required**

**Response:** 200 OK

---

## Notification

### `GET /notification.all`

**Notification all**

**Response:** 200 OK

---

### `POST /notification.createCustom`

**Notification create Custom**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) **required**
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `endpoint` (string) **required**
- `headers` (object) optional

**Response:** 200 OK

---

### `POST /notification.createDiscord`

**Notification create Discord**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `webhookUrl` (string) **required**
- `decoration` (boolean) **required**

**Response:** 200 OK

---

### `POST /notification.createEmail`

**Notification create Email**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `smtpServer` (string) **required**
- `smtpPort` (number) **required**
- `username` (string) **required**
- `password` (string) **required**
- `fromAddress` (string) **required**
- `toAddresses` (array) **required**

**Response:** 200 OK

---

### `POST /notification.createGotify`

**Notification create Gotify**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverUrl` (string) **required**
- `appToken` (string) **required**
- `priority` (number) **required**
- `decoration` (boolean) **required**

**Response:** 200 OK

---

### `POST /notification.createLark`

**Notification create Lark**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `webhookUrl` (string) **required**

**Response:** 200 OK

---

### `POST /notification.createNtfy`

**Notification create Ntfy**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverUrl` (string) **required**
- `topic` (string) **required**
- `accessToken` (string) **required**
- `priority` (number) **required**

**Response:** 200 OK

---

### `POST /notification.createPushover`

**Notification create Pushover**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) **required**
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `userKey` (string) **required**
- `apiToken` (string) **required**
- `priority` (number) optional
- `retry` (number) optional
- `expire` (number) optional

**Response:** 200 OK

---

### `POST /notification.createResend`

**Notification create Resend**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `apiKey` (string) **required**
- `fromAddress` (string) **required**
- `toAddresses` (array) **required**

**Response:** 200 OK

---

### `POST /notification.createSlack`

**Notification create Slack**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `webhookUrl` (string) **required**
- `channel` (string) **required**

**Response:** 200 OK

---

### `POST /notification.createTeams`

**Notification create Teams**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `webhookUrl` (string) **required**

**Response:** 200 OK

---

### `POST /notification.createTelegram`

**Notification create Telegram**

**Request body:**

- `appBuildError` (boolean) **required**
- `databaseBackup` (boolean) **required**
- `volumeBackup` (boolean) **required**
- `dokployRestart` (boolean) **required**
- `name` (string) **required**
- `appDeploy` (boolean) **required**
- `dockerCleanup` (boolean) **required**
- `serverThreshold` (boolean) **required**
- `botToken` (string) **required**
- `chatId` (string) **required**
- `messageThreadId` (string) **required**

**Response:** 200 OK

---

### `GET /notification.getEmailProviders`

**Notification get Email Providers**

**Response:** 200 OK

---

### `GET /notification.one`

**Notification one**

**Parameters:**

- `notificationId` (string) **required**

**Response:** 200 OK

---

### `POST /notification.receiveNotification`

**Notification receive Notification**

**Request body:**

- `ServerType` (string) optional
- `Type` (string) **required**
- `Value` (number) **required**
- `Threshold` (number) **required**
- `Message` (string) **required**
- `Timestamp` (string) **required**
- `Token` (string) **required**

**Response:** 200 OK

---

### `POST /notification.remove`

**Notification remove**

**Request body:**

- `notificationId` (string) **required**

**Response:** 200 OK

---

### `POST /notification.testCustomConnection`

**Notification test Custom Connection**

**Request body:**

- `endpoint` (string) **required**
- `headers` (object) optional

**Response:** 200 OK

---

### `POST /notification.testDiscordConnection`

**Notification test Discord Connection**

**Request body:**

- `webhookUrl` (string) **required**
- `decoration` (boolean) optional

**Response:** 200 OK

---

### `POST /notification.testEmailConnection`

**Notification test Email Connection**

**Request body:**

- `smtpServer` (string) **required**
- `smtpPort` (number) **required**
- `username` (string) **required**
- `password` (string) **required**
- `toAddresses` (array) **required**
- `fromAddress` (string) **required**

**Response:** 200 OK

---

### `POST /notification.testGotifyConnection`

**Notification test Gotify Connection**

**Request body:**

- `serverUrl` (string) **required**
- `appToken` (string) **required**
- `priority` (number) **required**
- `decoration` (boolean) optional

**Response:** 200 OK

---

### `POST /notification.testLarkConnection`

**Notification test Lark Connection**

**Request body:**

- `webhookUrl` (string) **required**

**Response:** 200 OK

---

### `POST /notification.testNtfyConnection`

**Notification test Ntfy Connection**

**Request body:**

- `serverUrl` (string) **required**
- `topic` (string) **required**
- `accessToken` (string) **required**
- `priority` (number) **required**

**Response:** 200 OK

---

### `POST /notification.testPushoverConnection`

**Notification test Pushover Connection**

**Request body:**

- `userKey` (string) **required**
- `apiToken` (string) **required**
- `priority` (number) **required**
- `retry` (number) optional
- `expire` (number) optional

**Response:** 200 OK

---

### `POST /notification.testResendConnection`

**Notification test Resend Connection**

**Request body:**

- `apiKey` (string) **required**
- `fromAddress` (string) **required**
- `toAddresses` (array) **required**

**Response:** 200 OK

---

### `POST /notification.testSlackConnection`

**Notification test Slack Connection**

**Request body:**

- `webhookUrl` (string) **required**
- `channel` (string) **required**

**Response:** 200 OK

---

### `POST /notification.testTeamsConnection`

**Notification test Teams Connection**

**Request body:**

- `webhookUrl` (string) **required**

**Response:** 200 OK

---

### `POST /notification.testTelegramConnection`

**Notification test Telegram Connection**

**Request body:**

- `botToken` (string) **required**
- `chatId` (string) **required**
- `messageThreadId` (string) **required**

**Response:** 200 OK

---

### `POST /notification.updateCustom`

**Notification update Custom**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `endpoint` (string) optional
- `headers` (object) optional
- `notificationId` (string) **required**
- `customId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateDiscord`

**Notification update Discord**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `webhookUrl` (string) optional
- `decoration` (boolean) optional
- `notificationId` (string) **required**
- `discordId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateEmail`

**Notification update Email**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `smtpServer` (string) optional
- `smtpPort` (number) optional
- `username` (string) optional
- `password` (string) optional
- `fromAddress` (string) optional
- `toAddresses` (array) optional
- `notificationId` (string) **required**
- `emailId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateGotify`

**Notification update Gotify**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverUrl` (string) optional
- `appToken` (string) optional
- `priority` (number) optional
- `decoration` (boolean) optional
- `notificationId` (string) **required**
- `gotifyId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateLark`

**Notification update Lark**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `webhookUrl` (string) optional
- `notificationId` (string) **required**
- `larkId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateNtfy`

**Notification update Ntfy**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverUrl` (string) optional
- `topic` (string) optional
- `accessToken` (string) optional
- `priority` (number) optional
- `notificationId` (string) **required**
- `ntfyId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updatePushover`

**Notification update Pushover**

**Request body:**

- `notificationId` (string) **required**
- `pushoverId` (string) **required**
- `organizationId` (string) optional
- `userKey` (string) optional
- `apiToken` (string) optional
- `priority` (number) optional
- `retry` (number) optional
- `expire` (number) optional
- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional

**Response:** 200 OK

---

### `POST /notification.updateResend`

**Notification update Resend**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `apiKey` (string) optional
- `fromAddress` (string) optional
- `toAddresses` (array) optional
- `notificationId` (string) **required**
- `resendId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateSlack`

**Notification update Slack**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `webhookUrl` (string) optional
- `channel` (string) optional
- `notificationId` (string) **required**
- `slackId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateTeams`

**Notification update Teams**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `webhookUrl` (string) optional
- `notificationId` (string) **required**
- `teamsId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

### `POST /notification.updateTelegram`

**Notification update Telegram**

**Request body:**

- `appBuildError` (boolean) optional
- `databaseBackup` (boolean) optional
- `volumeBackup` (boolean) optional
- `dokployRestart` (boolean) optional
- `name` (string) optional
- `appDeploy` (boolean) optional
- `dockerCleanup` (boolean) optional
- `serverThreshold` (boolean) optional
- `botToken` (string) optional
- `chatId` (string) optional
- `messageThreadId` (string) optional
- `notificationId` (string) **required**
- `telegramId` (string) **required**
- `organizationId` (string) optional

**Response:** 200 OK

---

## LicenseKey

### `POST /licenseKey.activate`

**License Key activate**

**Request body:**

- `licenseKey` (string) **required**

**Response:** 200 OK

---

### `POST /licenseKey.deactivate`

**License Key deactivate**

**Response:** 200 OK

---

### `GET /licenseKey.getEnterpriseSettings`

**License Key get Enterprise Settings**

**Response:** 200 OK

---

### `GET /licenseKey.haveValidLicenseKey`

**License Key have Valid License Key**

**Response:** 200 OK

---

### `POST /licenseKey.updateEnterpriseSettings`

**License Key update Enterprise Settings**

**Request body:**

- `enableEnterpriseFeatures` (boolean) optional

**Response:** 200 OK

---

### `POST /licenseKey.validate`

**License Key validate**

**Response:** 200 OK

---

## Stripe

### `GET /stripe.canCreateMoreServers`

**Stripe can Create More Servers**

**Response:** 200 OK

---

### `POST /stripe.createCheckoutSession`

**Stripe create Checkout Session**

**Request body:**

- `productId` (string) **required**
- `serverQuantity` (number) **required**
- `isAnnual` (boolean) **required**

**Response:** 200 OK

---

### `POST /stripe.createCustomerPortalSession`

**Stripe create Customer Portal Session**

**Response:** 200 OK

---

### `GET /stripe.getInvoices`

**Stripe get Invoices**

**Response:** 200 OK

---

### `GET /stripe.getProducts`

**Stripe get Products**

**Response:** 200 OK

---

## Schedule

### `POST /schedule.create`

**Schedule create**

**Request body:**

- `scheduleId` (string) optional
- `name` (string) **required**
- `cronExpression` (string) **required**
- `appName` (string) optional
- `serviceName` (string) optional
- `shellType` (string) optional
- `scheduleType` (string) optional
- `command` (string) **required**
- `script` (string) optional
- `applicationId` (string) optional
- `composeId` (string) optional
- `serverId` (string) optional
- `userId` (string) optional
- `enabled` (boolean) optional
- `timezone` (string) optional
- `createdAt` (string) optional

**Response:** 200 OK

---

### `POST /schedule.delete`

**Schedule delete**

**Request body:**

- `scheduleId` (string) **required**

**Response:** 200 OK

---

### `GET /schedule.list`

**Schedule list**

**Parameters:**

- `id` (string) **required**
- `scheduleType` (string) **required**

**Response:** 200 OK

---

### `GET /schedule.one`

**Schedule one**

**Parameters:**

- `scheduleId` (string) **required**

**Response:** 200 OK

---

### `POST /schedule.runManually`

**Schedule run Manually**

**Request body:**

- `scheduleId` (string) **required**

**Response:** 200 OK

---

### `POST /schedule.update`

**Schedule update**

**Request body:**

- `scheduleId` (string) **required**
- `name` (string) **required**
- `cronExpression` (string) **required**
- `appName` (string) optional
- `serviceName` (string) optional
- `shellType` (string) optional
- `scheduleType` (string) optional
- `command` (string) **required**
- `script` (string) optional
- `applicationId` (string) optional
- `composeId` (string) optional
- `serverId` (string) optional
- `userId` (string) optional
- `enabled` (boolean) optional
- `timezone` (string) optional
- `createdAt` (string) optional

**Response:** 200 OK

---

## Rollback

### `POST /rollback.delete`

**Rollback delete**

**Request body:**

- `rollbackId` (string) **required**

**Response:** 200 OK

---

### `POST /rollback.rollback`

**Rollback rollback**

**Request body:**

- `rollbackId` (string) **required**

**Response:** 200 OK

---

## PreviewDeployment

### `GET /previewDeployment.all`

**Preview Deployment all**

**Parameters:**

- `applicationId` (string) **required**

**Response:** 200 OK

---

### `POST /previewDeployment.delete`

**Preview Deployment delete**

**Request body:**

- `previewDeploymentId` (string) **required**

**Response:** 200 OK

---

### `GET /previewDeployment.one`

**Preview Deployment one**

**Parameters:**

- `previewDeploymentId` (string) **required**

**Response:** 200 OK

---

### `POST /previewDeployment.redeploy`

**Preview Deployment redeploy**

**Request body:**

- `previewDeploymentId` (string) **required**
- `title` (string) optional
- `description` (string) optional

**Response:** 200 OK

---

## Server

### `GET /server.all`

**Server all**

**Response:** 200 OK

---

### `GET /server.buildServers`

**Server build Servers**

**Response:** 200 OK

---

### `GET /server.count`

**Server count**

**Response:** 200 OK

---

### `POST /server.create`

**Server create**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `ipAddress` (string) **required**
- `port` (number) **required**
- `username` (string) **required**
- `sshKeyId` (string) **required**
- `serverType` (string) **required**

**Response:** 200 OK

---

### `GET /server.getDefaultCommand`

**Server get Default Command**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `GET /server.getServerMetrics`

**Server get Server Metrics**

**Parameters:**

- `url` (string) **required**
- `token` (string) **required**
- `dataPoints` (string) **required**

**Response:** 200 OK

---

### `GET /server.getServerTime`

**Server get Server Time**

**Response:** 200 OK

---

### `GET /server.one`

**Server one**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `GET /server.publicIp`

**Server public Ip**

**Response:** 200 OK

---

### `POST /server.remove`

**Server remove**

**Request body:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `GET /server.security`

**Server security**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `POST /server.setup`

**Server setup**

**Request body:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `POST /server.setupMonitoring`

**Server setup Monitoring**

**Request body:**

- `serverId` (string) **required**
- `metricsConfig` (object) **required**

**Response:** 200 OK

---

### `POST /server.update`

**Server update**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `serverId` (string) **required**
- `ipAddress` (string) **required**
- `port` (number) **required**
- `username` (string) **required**
- `sshKeyId` (string) **required**
- `serverType` (string) **required**
- `command` (string) optional

**Response:** 200 OK

---

### `GET /server.validate`

**Server validate**

**Parameters:**

- `serverId` (string) **required**

**Response:** 200 OK

---

### `GET /server.withSSHKey`

**Server with SSHKey**

**Response:** 200 OK

---

## VolumeBackups

### `POST /volumeBackups.create`

**Volume Backups create**

**Request body:**

- `name` (string) **required**
- `volumeName` (string) **required**
- `prefix` (string) **required**
- `serviceType` (string) optional
- `appName` (string) optional
- `serviceName` (string) optional
- `turnOff` (boolean) optional
- `cronExpression` (string) **required**
- `keepLatestCount` (number) optional
- `enabled` (boolean) optional
- `applicationId` (string) optional
- `postgresId` (string) optional
- `mariadbId` (string) optional
- `mongoId` (string) optional
- `mysqlId` (string) optional
- `redisId` (string) optional
- `composeId` (string) optional
- `createdAt` (string) optional
- `destinationId` (string) **required**

**Response:** 200 OK

---

### `POST /volumeBackups.delete`

**Volume Backups delete**

**Request body:**

- `volumeBackupId` (string) **required**

**Response:** 200 OK

---

### `GET /volumeBackups.list`

**Volume Backups list**

**Parameters:**

- `id` (string) **required**
- `volumeBackupType` (string) **required**

**Response:** 200 OK

---

### `GET /volumeBackups.one`

**Volume Backups one**

**Parameters:**

- `volumeBackupId` (string) **required**

**Response:** 200 OK

---

### `POST /volumeBackups.runManually`

**Volume Backups run Manually**

**Request body:**

- `volumeBackupId` (string) **required**

**Response:** 200 OK

---

### `POST /volumeBackups.update`

**Volume Backups update**

**Request body:**

- `name` (string) **required**
- `volumeName` (string) **required**
- `prefix` (string) **required**
- `serviceType` (string) optional
- `appName` (string) optional
- `serviceName` (string) optional
- `turnOff` (boolean) optional
- `cronExpression` (string) **required**
- `keepLatestCount` (number) optional
- `enabled` (boolean) optional
- `applicationId` (string) optional
- `postgresId` (string) optional
- `mariadbId` (string) optional
- `mongoId` (string) optional
- `mysqlId` (string) optional
- `redisId` (string) optional
- `composeId` (string) optional
- `createdAt` (string) optional
- `destinationId` (string) **required**
- `volumeBackupId` (string) **required**

**Response:** 200 OK

---

## SshKey

### `GET /sshKey.all`

**Ssh Key all**

**Response:** 200 OK

---

### `POST /sshKey.create`

**Ssh Key create**

**Request body:**

- `name` (string) **required**
- `description` (string) optional
- `privateKey` (string) **required**
- `publicKey` (string) **required**
- `organizationId` (string) **required**

**Response:** 200 OK

---

### `POST /sshKey.generate`

**Ssh Key generate**

**Request body:**

- `type` (string) optional

**Response:** 200 OK

---

### `GET /sshKey.one`

**Ssh Key one**

**Parameters:**

- `sshKeyId` (string) **required**

**Response:** 200 OK

---

### `POST /sshKey.remove`

**Ssh Key remove**

**Request body:**

- `sshKeyId` (string) **required**

**Response:** 200 OK

---

### `POST /sshKey.update`

**Ssh Key update**

**Request body:**

- `name` (string) optional
- `description` (string) optional
- `lastUsedAt` (string) optional
- `sshKeyId` (string) **required**

**Response:** 200 OK

---

## Swarm

### `GET /swarm.getNodeApps`

**Swarm get Node Apps**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /swarm.getNodeInfo`

**Swarm get Node Info**

**Parameters:**

- `nodeId` (string) **required**
- `serverId` (string) optional

**Response:** 200 OK

---

### `GET /swarm.getNodes`

**Swarm get Nodes**

**Parameters:**

- `serverId` (string) optional

**Response:** 200 OK

---
