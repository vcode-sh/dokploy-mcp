# Tool Reference

Complete reference for all 196 tools in dokploy-mcp, organized by module.

**Legend:**

- **Read-only**: annotated with `readOnlyHint: true` and `idempotentHint: true` -- safe to call without side effects
- **Mutating**: performs a write operation (create, update, deploy, etc.)
- **Destructive**: annotated with `destructiveHint: true` -- irreversible operation that deletes data or causes downtime

---

## Table of Contents

1. [Project](#project) (6 tools)
2. [Application](#application) (26 tools)
3. [Compose](#compose) (14 tools)
4. [Domain](#domain) (8 tools)
5. [PostgreSQL](#postgresql) (13 tools)
6. [MySQL](#mysql) (13 tools)
7. [MariaDB](#mariadb) (13 tools)
8. [MongoDB](#mongodb) (13 tools)
9. [Redis](#redis) (13 tools)
10. [Deployment](#deployment) (2 tools)
11. [Docker](#docker) (4 tools)
12. [Certificates](#certificates) (4 tools)
13. [Registry](#registry) (6 tools)
14. [Destination](#destination) (6 tools)
15. [Backup](#backup) (8 tools)
16. [Mounts](#mounts) (4 tools)
17. [Port](#port) (4 tools)
18. [Redirects](#redirects) (4 tools)
19. [Security](#security) (4 tools)
20. [Cluster](#cluster) (4 tools)
21. [Settings](#settings) (25 tools)
22. [Admin](#admin) (1 tool)
23. [User](#user) (1 tool)

---

## Project

Tools for managing Dokploy projects. Projects are top-level containers that organize applications, databases, and compose services.

### `dokploy_project_all`

**Title:** List All Projects
**Type:** Read-only

List all projects in the Dokploy instance. Returns an array of project objects, each containing the project ID, name, description, and associated services.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_project_one`

**Title:** Get Project Details
**Type:** Read-only

Retrieve detailed information about a single Dokploy project by its unique ID. Returns the full project object including its name, description, environment variables, and all associated services such as applications, databases, and compose stacks.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | The unique project ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_project_create`

**Title:** Create Project
**Type:** Mutating

Create a new project in Dokploy. Projects serve as organizational containers for applications, databases, and other services. Returns the newly created project object with its generated ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | The name of the project |
| `description` | string \| null | No | Optional project description |

---

### `dokploy_project_update`

**Title:** Update Project
**Type:** Mutating

Update an existing Dokploy project. Only the provided fields will be updated; omitted fields remain unchanged. Returns the updated project object.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | The unique project ID |
| `name` | string | No | New project name |
| `description` | string \| null | No | New project description |
| `env` | string \| null | No | Environment variables for the project |

---

### `dokploy_project_duplicate`

**Title:** Duplicate Project
**Type:** Mutating

Duplicate an existing Dokploy project, creating a new project with the same configuration. Optionally include services from the original project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `sourceProjectId` | string | Yes | The ID of the project to duplicate |
| `name` | string | Yes | The name for the duplicated project |
| `description` | string | No | Description for the duplicated project |
| `includeServices` | boolean | No | Whether to include services in the duplicate |
| `selectedServices` | array | No | Specific services to include (objects with `id` and `type`) |

---

### `dokploy_project_remove`

**Title:** Remove Project
**Type:** Destructive

Permanently remove a Dokploy project and all its associated resources including applications, databases, and compose stacks. This action is irreversible.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | The unique project ID to remove |

**Annotations:** `destructiveHint`

---

## Application

Tools for managing application lifecycle -- creation, deployment, configuration, source providers, and monitoring.

### `dokploy_application_create`

**Title:** Create Application
**Type:** Mutating

Create a new application within a Dokploy project. Returns the created application object with its generated ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | The name of the application |
| `projectId` | string | Yes | The project ID to create the application in |
| `appName` | string | No | Custom app name (auto-generated if not provided) |
| `description` | string \| null | No | Application description |
| `serverId` | string \| null | No | Target server ID for deployment |

---

### `dokploy_application_one`

**Title:** Get Application Details
**Type:** Read-only

Retrieve detailed information about a single Dokploy application by its unique ID. Returns the full application object including its configuration, build settings, source provider, environment variables, resource limits, deployment status, and associated domains.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_application_update`

**Title:** Update Application
**Type:** Mutating

Update an existing application's configuration in Dokploy. Only provided fields are modified; omitted fields remain unchanged.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `name` | string | No | Application name |
| `appName` | string | No | Internal app name |
| `description` | string \| null | No | Application description |
| `env` | string \| null | No | Environment variables |
| `buildArgs` | string \| null | No | Docker build arguments |
| `memoryReservation` | number \| null | No | Memory reservation in bytes |
| `memoryLimit` | number \| null | No | Memory limit in bytes |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `title` | string \| null | No | Display title |
| `enabled` | boolean | No | Whether the application is enabled |
| `subtitle` | string \| null | No | Display subtitle |
| `command` | string \| null | No | Custom start command |
| `publishDirectory` | string \| null | No | Publish directory for static builds |
| `dockerfile` | string \| null | No | Dockerfile path or content |
| `dockerContextPath` | string | No | Docker build context path |
| `dockerBuildStage` | string | No | Docker multi-stage build target |
| `replicas` | number | No | Number of replicas to run |
| `applicationStatus` | string | No | Application status |
| `buildType` | string | No | Build type |
| `autoDeploy` | boolean | No | Whether auto-deploy is enabled |
| `createdAt` | string | No | Creation timestamp |
| `registryId` | string \| null | No | Docker registry ID |
| `projectId` | string | No | Project ID |
| `sourceType` | string | No | Source type (github, docker, git, etc.) |
| `healthCheckSwarm` | object \| null | No | Swarm health check configuration |
| `restartPolicySwarm` | object \| null | No | Swarm restart policy configuration |
| `placementSwarm` | object \| null | No | Swarm placement configuration |
| `updateConfigSwarm` | object \| null | No | Swarm update configuration |
| `rollbackConfigSwarm` | object \| null | No | Swarm rollback configuration |
| `modeSwarm` | object \| null | No | Swarm mode configuration |
| `labelsSwarm` | object \| null | No | Swarm labels configuration |
| `networkSwarm` | array \| null | No | Swarm network configuration |
| `resourcesSwarm` | object \| null | No | Swarm resources configuration |

---

### `dokploy_application_delete`

**Title:** Delete Application
**Type:** Destructive

Permanently delete an application from Dokploy. This action is irreversible and will remove all associated data including deployments, logs, environment variables, and domain configurations.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to delete |

**Annotations:** `destructiveHint`

---

### `dokploy_application_move`

**Title:** Move Application
**Type:** Mutating

Move an application from its current project to a different Dokploy project. The application retains all its configuration and deployment settings after the move.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to move |
| `targetProjectId` | string | Yes | The target project ID |

---

### `dokploy_application_deploy`

**Title:** Deploy Application
**Type:** Mutating

Trigger a new deployment for an application in Dokploy. Builds the application from its configured source and deploys it to the target server.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to deploy |

---

### `dokploy_application_redeploy`

**Title:** Redeploy Application
**Type:** Mutating

Force a full redeploy of an application, rebuilding it from source and restarting all containers. Always triggers a fresh build regardless of whether the source has changed.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to redeploy |

---

### `dokploy_application_start`

**Title:** Start Application
**Type:** Mutating

Start a previously stopped application. Brings up the application containers using the last successful deployment configuration. The application must have been deployed at least once.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to start |

---

### `dokploy_application_stop`

**Title:** Stop Application
**Type:** Destructive

Stop a running application, shutting down all its containers. The application configuration and data are preserved. This is destructive as it causes downtime.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID to stop |

**Annotations:** `destructiveHint`

---

### `dokploy_application_cancel_deployment`

**Title:** Cancel Deployment
**Type:** Mutating

Cancel an in-progress deployment for an application. Stops the current build or deployment process and leaves the application in its previous state.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

### `dokploy_application_reload`

**Title:** Reload Application
**Type:** Mutating

Reload an application without performing a full redeploy. Restarts the application containers using the existing built image.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `appName` | string | Yes | The app name to reload |

---

### `dokploy_application_mark_running`

**Title:** Mark Application Running
**Type:** Mutating

Manually mark an application as running. Administrative action used to correct the application status when it becomes out of sync with the actual container state.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

### `dokploy_application_clean_queues`

**Title:** Clean Deployment Queues
**Type:** Mutating

Clean the deployment queues for an application. Removes any pending or stuck deployment jobs from the queue.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

### `dokploy_application_refresh_token`

**Title:** Refresh Webhook Token
**Type:** Mutating

Refresh the webhook token for an application. Generates a new unique token; the previous token is invalidated immediately.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

### `dokploy_application_save_build_type`

**Title:** Save Build Type
**Type:** Mutating

Set the build type and related build settings for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `buildType` | enum | Yes | The build type: `dockerfile`, `heroku`, `nixpacks`, `buildpacks`, or `docker` |
| `dockerContextPath` | string | No | Docker build context path |
| `dockerBuildStage` | string | No | Docker multi-stage build target |

---

### `dokploy_application_save_environment`

**Title:** Save Environment Variables
**Type:** Mutating

Save environment variables and Docker build arguments for an application. Both fields accept newline-separated key=value pairs.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `env` | string \| null | No | Environment variables |
| `buildArgs` | string \| null | No | Docker build arguments |

---

### `dokploy_application_save_github_provider`

**Title:** Configure GitHub Provider
**Type:** Mutating

Configure a GitHub repository as the source for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `owner` | string | Yes | GitHub repository owner |
| `repository` | string | No | GitHub repository name |
| `branch` | string | No | Branch to deploy from |
| `buildPath` | string | No | Build path within the repo |
| `githubId` | number | No | GitHub App installation ID |
| `enableSubmodules` | boolean | No | Whether to initialize git submodules |
| `watchPaths` | string[] | No | Paths to watch for auto-deploy triggers |
| `triggerType` | enum | No | Event type that triggers deployment: `push` or `tag` |

---

### `dokploy_application_save_gitlab_provider`

**Title:** Configure GitLab Provider
**Type:** Mutating

Configure a GitLab repository as the source for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `gitlabBranch` | string | No | GitLab branch |
| `gitlabBuildPath` | string | No | Build path within the repo |
| `gitlabOwner` | string | No | GitLab repository owner |
| `gitlabRepository` | string | No | GitLab repository name |
| `gitlabId` | number | No | GitLab integration ID |
| `gitlabProjectId` | number | No | GitLab project ID |
| `gitlabPathNamespace` | string | No | GitLab path namespace |
| `enableSubmodules` | boolean | No | Whether to initialize git submodules |
| `watchPaths` | string[] | No | Paths to watch for auto-deploy triggers |

---

### `dokploy_application_save_bitbucket_provider`

**Title:** Configure Bitbucket Provider
**Type:** Mutating

Configure a Bitbucket repository as the source for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `bitbucketBranch` | string | No | Bitbucket branch |
| `bitbucketBuildPath` | string | No | Build path within the repo |
| `bitbucketOwner` | string | No | Bitbucket repository owner |
| `bitbucketRepository` | string | No | Bitbucket repository name |
| `bitbucketId` | string | No | Bitbucket integration ID |
| `enableSubmodules` | boolean | No | Whether to initialize git submodules |
| `watchPaths` | string[] | No | Paths to watch for auto-deploy triggers |

---

### `dokploy_application_save_gitea_provider`

**Title:** Configure Gitea Provider
**Type:** Mutating

Configure a Gitea repository as the source for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `giteaBranch` | string | No | Gitea branch |
| `giteaBuildPath` | string | No | Build path within the repo |
| `giteaOwner` | string | No | Gitea repository owner |
| `giteaRepository` | string | No | Gitea repository name |
| `giteaId` | number | No | Gitea integration ID |
| `enableSubmodules` | boolean | No | Whether to initialize git submodules |
| `watchPaths` | string[] | No | Paths to watch for auto-deploy triggers |

---

### `dokploy_application_save_git_provider`

**Title:** Configure Custom Git Provider
**Type:** Mutating

Configure a custom Git repository as the source for an application. Supports any Git-compatible repository.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `customGitUrl` | string | No | Custom Git repository URL |
| `customGitBranch` | string | No | Branch to deploy from |
| `customGitBuildPath` | string | No | Build path within the repo |
| `customGitSSHKeyId` | string \| null | No | SSH key ID for authentication |
| `enableSubmodules` | boolean | No | Whether to initialize git submodules |
| `watchPaths` | string[] | No | Paths to watch for auto-deploy triggers |

---

### `dokploy_application_save_docker_provider`

**Title:** Configure Docker Provider
**Type:** Mutating

Configure a Docker image as the source for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `dockerImage` | string | Yes | Docker image name (e.g., `nginx:latest`) |
| `username` | string | No | Registry username for private images |
| `password` | string | No | Registry password for private images |

---

### `dokploy_application_disconnect_git_provider`

**Title:** Disconnect Git Provider
**Type:** Mutating

Disconnect the current Git provider from an application. The application will need a new source configured before it can be deployed again.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

### `dokploy_application_read_app_monitoring`

**Title:** Read Application Monitoring
**Type:** Read-only

Read monitoring data for an application including CPU utilization, memory consumption, network I/O, and disk usage.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `appName` | string | Yes | The app name to read monitoring for |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_application_read_traefik_config`

**Title:** Read Traefik Configuration
**Type:** Read-only

Read the Traefik reverse proxy configuration for an application including routing rules, middleware settings, and TLS configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_application_update_traefik_config`

**Title:** Update Traefik Configuration
**Type:** Mutating

Update the Traefik reverse proxy configuration for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |
| `traefikConfig` | string | Yes | The new Traefik configuration content |

---

## Compose

Tools for managing Docker Compose services -- creation, deployment, templates, and Git integration.

### `dokploy_compose_create`

**Title:** Create Compose Service
**Type:** Mutating

Create a new Docker Compose service within a project. Returns the newly created compose service object.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | The name of the compose service |
| `projectId` | string | Yes | The project ID to create the compose service in |
| `description` | string \| null | No | Compose service description |
| `composeType` | enum | No | Compose type: `docker-compose` or `stack` |
| `appName` | string | No | Custom app name (auto-generated if not provided) |
| `serverId` | string \| null | No | Target server ID for deployment |

---

### `dokploy_compose_one`

**Title:** Get Compose Service
**Type:** Read-only

Get detailed information about a single compose service by its ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_compose_update`

**Title:** Update Compose Service
**Type:** Mutating

Update an existing compose service configuration. Only provided fields are modified.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |
| `name` | string | No | Compose service name |
| `appName` | string | No | Internal app name |
| `description` | string \| null | No | Service description |
| `env` | string \| null | No | Environment variables |
| `composeFile` | string \| null | No | Docker Compose file content |
| `sourceType` | enum | No | Source type: `git`, `github`, or `raw` |
| `composeType` | enum | No | Compose type: `docker-compose` or `stack` |
| `repository` | string | No | Git repository name |
| `owner` | string | No | Git repository owner |
| `branch` | string | No | Git branch |
| `autoDeploy` | boolean | No | Whether auto-deploy is enabled |
| `customGitUrl` | string | No | Custom Git repository URL |
| `customGitBranch` | string | No | Custom Git branch |
| `customGitSSHKey` | string \| null | No | SSH key for custom Git authentication |
| `command` | string \| null | No | Custom command override |
| `composePath` | string | No | Path to the compose file within the repo |
| `composeStatus` | string | No | Compose service status |
| `projectId` | string | No | Project ID |

---

### `dokploy_compose_delete`

**Title:** Delete Compose Service
**Type:** Destructive

Permanently delete a compose service and all of its associated data, including containers, volumes, and configuration. This action is irreversible.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID to delete |

**Annotations:** `destructiveHint`

---

### `dokploy_compose_deploy`

**Title:** Deploy Compose Service
**Type:** Mutating

Deploy a Docker Compose service by triggering a build and run cycle.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID to deploy |

---

### `dokploy_compose_redeploy`

**Title:** Redeploy Compose Service
**Type:** Mutating

Redeploy a compose service by rebuilding all containers and restarting them.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID to redeploy |

---

### `dokploy_compose_stop`

**Title:** Stop Compose Service
**Type:** Destructive

Stop all running containers in a compose service. The containers and their data are preserved but will no longer serve traffic.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID to stop |

**Annotations:** `destructiveHint`

---

### `dokploy_compose_clean_queues`

**Title:** Clean Compose Queues
**Type:** Mutating

Clean the pending deployment queues for a compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

---

### `dokploy_compose_randomize`

**Title:** Randomize Compose Names
**Type:** Mutating

Randomize the service names within a compose deployment to avoid naming conflicts.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |
| `prefix` | string | No | Optional prefix for randomized names |

---

### `dokploy_compose_get_default_command`

**Title:** Get Default Command
**Type:** Read-only

Retrieve the default deployment command for a compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_compose_refresh_token`

**Title:** Refresh Webhook Token
**Type:** Mutating

Refresh the webhook token for a compose service. Invalidates the previous webhook URL.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

---

### `dokploy_compose_deploy_template`

**Title:** Deploy Compose Template
**Type:** Mutating

Deploy a compose service from a predefined template. Templates provide pre-configured compose stacks for common applications.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `projectId` | string | Yes | The project ID to deploy the template in |
| `id` | string | Yes | The template ID to deploy |

---

### `dokploy_compose_templates`

**Title:** List Compose Templates
**Type:** Read-only

List all available compose templates that can be deployed.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_compose_save_environment`

**Title:** Save Environment Variables
**Type:** Mutating

Save environment variables and Docker build arguments for a compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |
| `env` | string \| null | No | Environment variables |
| `buildArgs` | string \| null | No | Docker build arguments |

---

## Domain

Tools for managing domain configurations, DNS validation, and domain generation.

### `dokploy_domain_create`

**Title:** Create Domain
**Type:** Mutating

Create a new domain configuration for an application or compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `host` | string | Yes | The domain hostname (e.g., `app.example.com`) |
| `https` | boolean | Yes | Whether to enable HTTPS |
| `certificateType` | enum | Yes | SSL certificate type: `letsencrypt`, `none`, or `custom` |
| `stripPath` | boolean | Yes | Whether to strip the path prefix when forwarding |
| `path` | string | No | URL path prefix for routing |
| `port` | number \| null | No | Target port on the container |
| `applicationId` | string | No | Application ID to attach the domain to |
| `composeId` | string | No | Compose service ID to attach the domain to |
| `serviceName` | string | No | Service name within a compose deployment |
| `customCertResolver` | string \| null | No | Custom certificate resolver name |
| `domainType` | string | No | Domain type |
| `previewDeploymentId` | string | No | Preview deployment ID |
| `internalPath` | string | No | Internal path for routing |

---

### `dokploy_domain_one`

**Title:** Get Domain
**Type:** Read-only

Get detailed information about a single domain by its ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | The unique domain ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_domain_by_application_id`

**Title:** List Domains by Application
**Type:** Read-only

List all domains attached to a specific application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_domain_by_compose_id`

**Title:** List Domains by Compose Service
**Type:** Read-only

List all domains attached to a specific compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_domain_update`

**Title:** Update Domain
**Type:** Mutating

Update an existing domain configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | The unique domain ID |
| `host` | string | Yes | The domain hostname |
| `https` | boolean | Yes | Whether to enable HTTPS |
| `certificateType` | enum | Yes | SSL certificate type: `letsencrypt`, `none`, or `custom` |
| `stripPath` | boolean | Yes | Whether to strip the path prefix |
| `path` | string | No | URL path prefix for routing |
| `port` | number \| null | No | Target port on the container |
| `customCertResolver` | string \| null | No | Custom certificate resolver name |
| `serviceName` | string | No | Service name within a compose deployment |
| `domainType` | string | No | Domain type |
| `internalPath` | string | No | Internal path for routing |

---

### `dokploy_domain_delete`

**Title:** Delete Domain
**Type:** Destructive

Permanently delete a domain configuration. This removes the domain routing and any associated SSL certificates.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `domainId` | string | Yes | The unique domain ID to delete |

**Annotations:** `destructiveHint`

---

### `dokploy_domain_validate`

**Title:** Validate Domain DNS
**Type:** Mutating

Validate that a domain's DNS records are correctly configured and pointing to the expected server.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `domain` | string | Yes | The domain name to validate |
| `serverIp` | string | No | Expected server IP address for DNS validation |

---

### `dokploy_domain_generate`

**Title:** Generate Domain
**Type:** Mutating

Generate a default domain for an application using the server's configured base domain.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

---

## PostgreSQL

Tools for managing PostgreSQL databases -- creation, deployment, lifecycle, and configuration.

### `dokploy_postgres_one`

**Title:** Get Postgres Details
**Type:** Read-only

Retrieve detailed information about a specific Postgres database. Returns the full configuration including connection settings, resource limits, environment variables, and current status.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_postgres_create`

**Title:** Create Postgres Database
**Type:** Mutating

Create a new Postgres database instance inside a Dokploy project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the database |
| `appName` | string | Yes | Unique app-level identifier |
| `databaseName` | string | Yes | Name of the database to create |
| `databaseUser` | string | Yes | Database user |
| `databasePassword` | string | Yes | Database password |
| `projectId` | string | Yes | Project ID to create the database in |
| `dockerImage` | string | No | Docker image (default: postgres:15) |
| `description` | string \| null | No | Optional description |
| `serverId` | string \| null | No | Target server ID (null for local) |

---

### `dokploy_postgres_update`

**Title:** Update Postgres Database
**Type:** Mutating

Update the configuration of an existing Postgres database. Only the provided fields are updated.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `name` | string | No | Display name |
| `appName` | string | No | App-level identifier |
| `description` | string \| null | No | Description |
| `dockerImage` | string | No | Docker image |
| `memoryReservation` | number \| null | No | Memory reservation in MB |
| `memoryLimit` | number \| null | No | Memory limit in MB |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `command` | string \| null | No | Custom start command |
| `env` | string \| null | No | Environment variables |
| `externalPort` | number \| null | No | External port |

---

### `dokploy_postgres_remove`

**Title:** Remove Postgres Database
**Type:** Destructive

Permanently delete a Postgres database. Removes the container, its data, and all associated configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_postgres_move`

**Title:** Move Postgres Database
**Type:** Mutating

Move a Postgres database to a different project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `targetProjectId` | string | Yes | Destination project ID |

---

### `dokploy_postgres_deploy`

**Title:** Deploy Postgres Database
**Type:** Mutating

Deploy a Postgres database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

---

### `dokploy_postgres_start`

**Title:** Start Postgres Database
**Type:** Mutating

Start a previously stopped Postgres database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

---

### `dokploy_postgres_stop`

**Title:** Stop Postgres Database
**Type:** Destructive

Stop a running Postgres database container. The data is preserved but the container will no longer accept connections.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_postgres_reload`

**Title:** Reload Postgres Database
**Type:** Mutating

Reload the Postgres database container without a full restart.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `appName` | string | Yes | App-level identifier |

---

### `dokploy_postgres_rebuild`

**Title:** Rebuild Postgres Database
**Type:** Mutating

Rebuild the Postgres database container from scratch. Tears down the existing container and recreates it.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |

---

### `dokploy_postgres_change_status`

**Title:** Change Postgres Status
**Type:** Mutating

Manually set the application status of a Postgres database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `applicationStatus` | enum | Yes | New status: `idle`, `running`, `done`, or `error` |

---

### `dokploy_postgres_save_external_port`

**Title:** Save Postgres External Port
**Type:** Mutating

Set or clear the external port mapping for a Postgres database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `externalPort` | number \| null | Yes | External port number (null to remove) |

---

### `dokploy_postgres_save_environment`

**Title:** Save Postgres Environment
**Type:** Mutating

Overwrite the environment variables for a Postgres database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `postgresId` | string | Yes | Unique Postgres database ID |
| `env` | string \| null | No | Environment variables as a string |

---

## MySQL

Tools for managing MySQL databases -- creation, deployment, lifecycle, and configuration.

### `dokploy_mysql_one`

**Title:** Get MySQL Details
**Type:** Read-only

Retrieve detailed information about a specific MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_mysql_create`

**Title:** Create MySQL Database
**Type:** Mutating

Create a new MySQL database instance inside a Dokploy project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the database |
| `appName` | string | Yes | Unique app-level identifier |
| `databaseName` | string | Yes | Name of the database to create |
| `databaseUser` | string | Yes | Database user |
| `databasePassword` | string | Yes | Database password |
| `databaseRootPassword` | string | Yes | Root password for MySQL |
| `projectId` | string | Yes | Project ID to create the database in |
| `dockerImage` | string | No | Docker image (default: mysql:8) |
| `description` | string \| null | No | Optional description |
| `serverId` | string \| null | No | Target server ID (null for local) |

---

### `dokploy_mysql_update`

**Title:** Update MySQL Database
**Type:** Mutating

Update the configuration of an existing MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `name` | string | No | Display name |
| `appName` | string | No | App-level identifier |
| `description` | string \| null | No | Description |
| `dockerImage` | string | No | Docker image |
| `memoryReservation` | number \| null | No | Memory reservation in MB |
| `memoryLimit` | number \| null | No | Memory limit in MB |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `command` | string \| null | No | Custom start command |
| `env` | string \| null | No | Environment variables |
| `externalPort` | number \| null | No | External port |

---

### `dokploy_mysql_remove`

**Title:** Remove MySQL Database
**Type:** Destructive

Permanently delete a MySQL database. Removes the container, its data, and all configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mysql_move`

**Title:** Move MySQL Database
**Type:** Mutating

Move a MySQL database to a different project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `targetProjectId` | string | Yes | Destination project ID |

---

### `dokploy_mysql_deploy`

**Title:** Deploy MySQL Database
**Type:** Mutating

Deploy a MySQL database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

---

### `dokploy_mysql_start`

**Title:** Start MySQL Database
**Type:** Mutating

Start a previously stopped MySQL database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

---

### `dokploy_mysql_stop`

**Title:** Stop MySQL Database
**Type:** Destructive

Stop a running MySQL database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mysql_reload`

**Title:** Reload MySQL Database
**Type:** Mutating

Reload the MySQL database container without a full restart.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `appName` | string | Yes | App-level identifier |

---

### `dokploy_mysql_rebuild`

**Title:** Rebuild MySQL Database
**Type:** Mutating

Rebuild the MySQL database container from scratch.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |

---

### `dokploy_mysql_change_status`

**Title:** Change MySQL Status
**Type:** Mutating

Manually set the application status of a MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `applicationStatus` | enum | Yes | New status: `idle`, `running`, `done`, or `error` |

---

### `dokploy_mysql_save_external_port`

**Title:** Save MySQL External Port
**Type:** Mutating

Set or clear the external port mapping for a MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `externalPort` | number \| null | Yes | External port number (null to remove) |

---

### `dokploy_mysql_save_environment`

**Title:** Save MySQL Environment
**Type:** Mutating

Overwrite the environment variables for a MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mysqlId` | string | Yes | Unique MySQL database ID |
| `env` | string \| null | No | Environment variables as a string |

---

## MariaDB

Tools for managing MariaDB databases -- creation, deployment, lifecycle, and configuration.

### `dokploy_mariadb_one`

**Title:** Get MariaDB Details
**Type:** Read-only

Retrieve the full configuration and status details of a MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_mariadb_create`

**Title:** Create MariaDB Database
**Type:** Mutating

Create a new MariaDB database instance inside a Dokploy project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the database |
| `appName` | string | Yes | Unique app-level identifier |
| `databaseName` | string | Yes | Name of the database to create |
| `databaseUser` | string | Yes | Database user |
| `databasePassword` | string | Yes | Database password |
| `databaseRootPassword` | string | Yes | Root password for MariaDB |
| `projectId` | string | Yes | Project ID to create the database in |
| `dockerImage` | string | No | Docker image (default: mariadb:11) |
| `description` | string \| null | No | Optional description |
| `serverId` | string \| null | No | Target server ID (null for local) |

---

### `dokploy_mariadb_update`

**Title:** Update MariaDB Database
**Type:** Mutating

Update the configuration of an existing MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `name` | string | No | Display name |
| `appName` | string | No | App-level identifier |
| `description` | string \| null | No | Description |
| `dockerImage` | string | No | Docker image |
| `memoryReservation` | number \| null | No | Memory reservation in MB |
| `memoryLimit` | number \| null | No | Memory limit in MB |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `command` | string \| null | No | Custom start command |
| `env` | string \| null | No | Environment variables |
| `externalPort` | number \| null | No | External port |

---

### `dokploy_mariadb_remove`

**Title:** Remove MariaDB Database
**Type:** Destructive

Permanently delete a MariaDB database. Removes the container, all associated data, and configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mariadb_move`

**Title:** Move MariaDB Database
**Type:** Mutating

Move a MariaDB database to a different project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `targetProjectId` | string | Yes | Destination project ID |

---

### `dokploy_mariadb_deploy`

**Title:** Deploy MariaDB Database
**Type:** Mutating

Deploy a MariaDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

---

### `dokploy_mariadb_start`

**Title:** Start MariaDB Database
**Type:** Mutating

Start a previously stopped MariaDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

---

### `dokploy_mariadb_stop`

**Title:** Stop MariaDB Database
**Type:** Destructive

Stop a running MariaDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mariadb_reload`

**Title:** Reload MariaDB Database
**Type:** Mutating

Reload the MariaDB database container without a full rebuild.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `appName` | string | Yes | App-level identifier |

---

### `dokploy_mariadb_rebuild`

**Title:** Rebuild MariaDB Database
**Type:** Mutating

Rebuild the MariaDB database container from scratch.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |

---

### `dokploy_mariadb_change_status`

**Title:** Change MariaDB Status
**Type:** Mutating

Manually set the application status of a MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `applicationStatus` | enum | Yes | New status: `idle`, `running`, `done`, or `error` |

---

### `dokploy_mariadb_save_external_port`

**Title:** Save MariaDB External Port
**Type:** Mutating

Set or clear the external port mapping for a MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `externalPort` | number \| null | Yes | External port number (null to remove) |

---

### `dokploy_mariadb_save_environment`

**Title:** Save MariaDB Environment
**Type:** Mutating

Overwrite the environment variables for a MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mariadbId` | string | Yes | Unique MariaDB database ID |
| `env` | string \| null | No | Environment variables as a string |

---

## MongoDB

Tools for managing MongoDB databases -- creation, deployment, lifecycle, and configuration.

### `dokploy_mongo_one`

**Title:** Get MongoDB Details
**Type:** Read-only

Retrieve the full configuration and status details of a MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_mongo_create`

**Title:** Create MongoDB Database
**Type:** Mutating

Create a new MongoDB database instance inside a Dokploy project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the database |
| `appName` | string | Yes | Unique app-level identifier |
| `databaseUser` | string | Yes | Database user |
| `databasePassword` | string | Yes | Database password |
| `projectId` | string | Yes | Project ID to create the database in |
| `dockerImage` | string | No | Docker image (default: mongo:6) |
| `description` | string \| null | No | Optional description |
| `serverId` | string \| null | No | Target server ID (null for local) |

---

### `dokploy_mongo_update`

**Title:** Update MongoDB Database
**Type:** Mutating

Update the configuration of an existing MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `name` | string | No | Display name |
| `appName` | string | No | App-level identifier |
| `description` | string \| null | No | Description |
| `dockerImage` | string | No | Docker image |
| `memoryReservation` | number \| null | No | Memory reservation in MB |
| `memoryLimit` | number \| null | No | Memory limit in MB |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `command` | string \| null | No | Custom start command |
| `env` | string \| null | No | Environment variables |
| `externalPort` | number \| null | No | External port |

---

### `dokploy_mongo_remove`

**Title:** Remove MongoDB Database
**Type:** Destructive

Permanently delete a MongoDB database. Removes the container, all associated data, and configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mongo_move`

**Title:** Move MongoDB Database
**Type:** Mutating

Move a MongoDB database to a different project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `targetProjectId` | string | Yes | Destination project ID |

---

### `dokploy_mongo_deploy`

**Title:** Deploy MongoDB Database
**Type:** Mutating

Deploy a MongoDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

---

### `dokploy_mongo_start`

**Title:** Start MongoDB Database
**Type:** Mutating

Start a previously stopped MongoDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

---

### `dokploy_mongo_stop`

**Title:** Stop MongoDB Database
**Type:** Destructive

Stop a running MongoDB database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_mongo_reload`

**Title:** Reload MongoDB Database
**Type:** Mutating

Reload the MongoDB database container without a full rebuild.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `appName` | string | Yes | App-level identifier |

---

### `dokploy_mongo_rebuild`

**Title:** Rebuild MongoDB Database
**Type:** Mutating

Rebuild the MongoDB database container from scratch.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |

---

### `dokploy_mongo_change_status`

**Title:** Change MongoDB Status
**Type:** Mutating

Manually set the application status of a MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `applicationStatus` | enum | Yes | New status: `idle`, `running`, `done`, or `error` |

---

### `dokploy_mongo_save_external_port`

**Title:** Save MongoDB External Port
**Type:** Mutating

Set or clear the external port mapping for a MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `externalPort` | number \| null | Yes | External port number (null to remove) |

---

### `dokploy_mongo_save_environment`

**Title:** Save MongoDB Environment
**Type:** Mutating

Overwrite the environment variables for a MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mongoId` | string | Yes | Unique MongoDB database ID |
| `env` | string \| null | No | Environment variables as a string |

---

## Redis

Tools for managing Redis databases -- creation, deployment, lifecycle, and configuration.

### `dokploy_redis_one`

**Title:** Get Redis Details
**Type:** Read-only

Retrieve the full configuration and status details of a Redis database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_redis_create`

**Title:** Create Redis Database
**Type:** Mutating

Create a new Redis database instance inside a Dokploy project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the database |
| `appName` | string | Yes | Unique app-level identifier |
| `databasePassword` | string | Yes | Database password |
| `projectId` | string | Yes | Project ID to create the database in |
| `dockerImage` | string | No | Docker image (default: redis:7) |
| `description` | string \| null | No | Optional description |
| `serverId` | string \| null | No | Target server ID (null for local) |

---

### `dokploy_redis_update`

**Title:** Update Redis Database
**Type:** Mutating

Update the configuration of an existing Redis database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `name` | string | No | Display name |
| `appName` | string | No | App-level identifier |
| `description` | string \| null | No | Description |
| `dockerImage` | string | No | Docker image |
| `memoryReservation` | number \| null | No | Memory reservation in MB |
| `memoryLimit` | number \| null | No | Memory limit in MB |
| `cpuReservation` | number \| null | No | CPU reservation |
| `cpuLimit` | number \| null | No | CPU limit |
| `command` | string \| null | No | Custom start command |
| `env` | string \| null | No | Environment variables |
| `externalPort` | number \| null | No | External port |

---

### `dokploy_redis_remove`

**Title:** Remove Redis Database
**Type:** Destructive

Permanently delete a Redis database. Removes the container, all associated data, and configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_redis_move`

**Title:** Move Redis Database
**Type:** Mutating

Move a Redis database to a different project.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `targetProjectId` | string | Yes | Destination project ID |

---

### `dokploy_redis_deploy`

**Title:** Deploy Redis Database
**Type:** Mutating

Deploy a Redis database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

---

### `dokploy_redis_start`

**Title:** Start Redis Database
**Type:** Mutating

Start a previously stopped Redis database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

---

### `dokploy_redis_stop`

**Title:** Stop Redis Database
**Type:** Destructive

Stop a running Redis database container.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

**Annotations:** `destructiveHint`

---

### `dokploy_redis_reload`

**Title:** Reload Redis Database
**Type:** Mutating

Reload the Redis database container without a full rebuild.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `appName` | string | Yes | App-level identifier |

---

### `dokploy_redis_rebuild`

**Title:** Rebuild Redis Database
**Type:** Mutating

Rebuild the Redis database container from scratch.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |

---

### `dokploy_redis_change_status`

**Title:** Change Redis Status
**Type:** Mutating

Manually set the application status of a Redis database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `applicationStatus` | enum | Yes | New status: `idle`, `running`, `done`, or `error` |

---

### `dokploy_redis_save_external_port`

**Title:** Save Redis External Port
**Type:** Mutating

Set or clear the external port mapping for a Redis database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `externalPort` | number \| null | Yes | External port number (null to remove) |

---

### `dokploy_redis_save_environment`

**Title:** Save Redis Environment
**Type:** Mutating

Overwrite the environment variables for a Redis database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redisId` | string | Yes | Unique Redis database ID |
| `env` | string \| null | No | Environment variables as a string |

---

## Deployment

Tools for viewing deployment history for applications and compose services.

### `dokploy_deployment_all`

**Title:** List Application Deployments
**Type:** Read-only

List all deployment records for a specific application. Each deployment includes build logs, status, timestamps, and the triggering event.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | The unique application ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_deployment_all_by_compose`

**Title:** List Compose Deployments
**Type:** Read-only

List all deployment records for a specific Docker Compose service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `composeId` | string | Yes | The unique compose service ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

## Docker

Tools for inspecting Docker containers running on the Dokploy server.

### `dokploy_docker_get_containers`

**Title:** List Docker Containers
**Type:** Read-only

List all Docker containers running on the Dokploy server. Returns container metadata including names, images, status, ports, and resource usage.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_docker_get_config`

**Title:** Get Docker Container Config
**Type:** Read-only

Get the full configuration of a specific Docker container by its ID. Returns detailed container settings including environment variables, volumes, network configuration, and resource limits.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `containerId` | string | Yes | The Docker container ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_docker_get_containers_by_app_name_match`

**Title:** Find Containers by App Name
**Type:** Read-only

Find Docker containers whose name matches the given application name (substring match).

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `appName` | string | Yes | The app name to match against container names |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_docker_get_containers_by_app_label`

**Title:** Find Containers by App Label
**Type:** Read-only

Find Docker containers by their application label metadata. This is the recommended way to identify containers managed by Dokploy.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `appName` | string | Yes | The app name label to search for |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

## Certificates

Tools for managing SSL/TLS certificates.

### `dokploy_certificate_all`

**Title:** List Certificates
**Type:** Read-only

List all SSL/TLS certificates managed by Dokploy.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_certificate_one`

**Title:** Get Certificate Details
**Type:** Read-only

Get the full details of a specific SSL/TLS certificate by its unique ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `certificateId` | string | Yes | Unique certificate ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_certificate_create`

**Title:** Create Certificate
**Type:** Mutating

Create a new SSL/TLS certificate in Dokploy.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Display name for the certificate |
| `certificateData` | string | Yes | The certificate data (PEM format) |
| `privateKey` | string | Yes | The private key for the certificate |
| `certificateId` | string | No | Optional certificate ID to assign |
| `certificatePath` | string | No | Optional filesystem path for the certificate |
| `autoRenew` | boolean | No | Whether to automatically renew the certificate |

---

### `dokploy_certificate_remove`

**Title:** Remove Certificate
**Type:** Destructive

Permanently remove an SSL/TLS certificate. Any domains using this certificate will lose their TLS configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `certificateId` | string | Yes | Unique certificate ID to remove |

**Annotations:** `destructiveHint`

---

## Registry

Tools for managing Docker container registries.

### `dokploy_registry_all`

**Title:** List Registries
**Type:** Read-only

List all container registries configured in Dokploy.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_registry_one`

**Title:** Get Registry Details
**Type:** Read-only

Get the full details of a specific container registry by its unique ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `registryId` | string | Yes | Unique registry ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_registry_create`

**Title:** Create Registry
**Type:** Mutating

Create a new container registry configuration in Dokploy.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `registryName` | string | Yes | Name of the registry |
| `username` | string | Yes | Registry username |
| `password` | string | Yes | Registry password |
| `registryUrl` | string | Yes | Registry URL |
| `registryType` | enum | Yes | Registry type: `selfHosted` or `cloud` |
| `imagePrefix` | string \| null | No | Optional image prefix for the registry |

---

### `dokploy_registry_update`

**Title:** Update Registry
**Type:** Mutating

Update an existing container registry configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `registryId` | string | Yes | Unique registry ID to update |
| `registryName` | string | Yes | Name of the registry |
| `username` | string | Yes | Registry username |
| `password` | string | Yes | Registry password |
| `registryUrl` | string | Yes | Registry URL |
| `registryType` | enum | Yes | Registry type: `selfHosted` or `cloud` |
| `imagePrefix` | string \| null | No | Optional image prefix for the registry |

---

### `dokploy_registry_remove`

**Title:** Remove Registry
**Type:** Destructive

Permanently remove a container registry configuration. Applications referencing this registry will need to be reconfigured.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `registryId` | string | Yes | Unique registry ID to remove |

**Annotations:** `destructiveHint`

---

### `dokploy_registry_test`

**Title:** Test Registry Connection
**Type:** Mutating

Test the connection to a container registry using the provided credentials.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `registryName` | string | Yes | Name of the registry |
| `username` | string | Yes | Registry username |
| `password` | string | Yes | Registry password |
| `registryUrl` | string | Yes | Registry URL |
| `registryType` | enum | Yes | Registry type: `selfHosted` or `cloud` |
| `imagePrefix` | string \| null | No | Optional image prefix for the registry |

---

## Destination

Tools for managing S3-compatible backup destinations.

### `dokploy_destination_all`

**Title:** List Backup Destinations
**Type:** Read-only

List all S3-compatible backup destinations configured in Dokploy.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_destination_one`

**Title:** Get Backup Destination
**Type:** Read-only

Retrieve the full configuration of a specific backup destination by its unique ID.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `destinationId` | string | Yes | Unique destination ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_destination_create`

**Title:** Create Backup Destination
**Type:** Mutating

Create a new S3-compatible backup destination.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Name for the S3 destination |
| `accessKey` | string | Yes | S3 access key |
| `bucket` | string | Yes | S3 bucket name |
| `region` | string | Yes | S3 region |
| `endpoint` | string | Yes | S3 endpoint URL |
| `secretAccessKey` | string | Yes | S3 secret access key |

---

### `dokploy_destination_update`

**Title:** Update Backup Destination
**Type:** Mutating

Update an existing S3-compatible backup destination configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `destinationId` | string | Yes | Unique destination ID to update |
| `name` | string | Yes | Name for the S3 destination |
| `accessKey` | string | Yes | S3 access key |
| `bucket` | string | Yes | S3 bucket name |
| `region` | string | Yes | S3 region |
| `endpoint` | string | Yes | S3 endpoint URL |
| `secretAccessKey` | string | Yes | S3 secret access key |

---

### `dokploy_destination_remove`

**Title:** Remove Backup Destination
**Type:** Destructive

Permanently remove a backup destination. Backup schedules referencing this destination should be updated first.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `destinationId` | string | Yes | Unique destination ID to remove |

**Annotations:** `destructiveHint`

---

### `dokploy_destination_test_connection`

**Title:** Test Destination Connection
**Type:** Mutating

Test the connection to an S3-compatible backup destination.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Name for the S3 destination |
| `accessKey` | string | Yes | S3 access key |
| `bucket` | string | Yes | S3 bucket name |
| `region` | string | Yes | S3 region |
| `endpoint` | string | Yes | S3 endpoint URL |
| `secretAccessKey` | string | Yes | S3 secret access key |

---

## Backup

Tools for managing database backup schedules and triggering manual backups.

### `dokploy_backup_one`

**Title:** Get Backup Configuration
**Type:** Read-only

Retrieve the full details of a specific backup configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_backup_create`

**Title:** Create Backup Schedule
**Type:** Mutating

Create a new scheduled backup configuration for a database service.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `schedule` | string | Yes | Cron schedule expression for the backup |
| `prefix` | string | Yes | Prefix for backup file names |
| `destinationId` | string | Yes | Destination ID where backups will be stored |
| `database` | string | Yes | Name of the database to back up |
| `databaseType` | enum | Yes | Type of database: `postgres`, `mariadb`, `mysql`, or `mongo` |
| `enabled` | boolean | No | Whether the backup is enabled |
| `postgresId` | string | No | Postgres database ID (when databaseType is postgres) |
| `mysqlId` | string | No | MySQL database ID (when databaseType is mysql) |
| `mariadbId` | string | No | MariaDB database ID (when databaseType is mariadb) |
| `mongoId` | string | No | MongoDB database ID (when databaseType is mongo) |

---

### `dokploy_backup_update`

**Title:** Update Backup Schedule
**Type:** Mutating

Update an existing backup schedule configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |
| `schedule` | string | Yes | Cron schedule expression for the backup |
| `prefix` | string | Yes | Prefix for backup file names |
| `destinationId` | string | Yes | Destination ID where backups will be stored |
| `database` | string | Yes | Name of the database to back up |
| `enabled` | boolean | No | Whether the backup is enabled |

---

### `dokploy_backup_remove`

**Title:** Remove Backup Schedule
**Type:** Destructive

Permanently remove a backup schedule configuration. Previously created backup files at the destination are not deleted.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

**Annotations:** `destructiveHint`

---

### `dokploy_backup_manual_postgres`

**Title:** Manual Postgres Backup
**Type:** Mutating

Trigger an immediate manual backup of a PostgreSQL database using an existing backup configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

---

### `dokploy_backup_manual_mysql`

**Title:** Manual MySQL Backup
**Type:** Mutating

Trigger an immediate manual backup of a MySQL database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

---

### `dokploy_backup_manual_mariadb`

**Title:** Manual MariaDB Backup
**Type:** Mutating

Trigger an immediate manual backup of a MariaDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

---

### `dokploy_backup_manual_mongo`

**Title:** Manual MongoDB Backup
**Type:** Mutating

Trigger an immediate manual backup of a MongoDB database.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `backupId` | string | Yes | Unique backup ID |

---

## Mounts

Tools for managing volume mounts on Dokploy services.

### `dokploy_mount_one`

**Title:** Get Mount
**Type:** Read-only

Retrieve the full configuration of a specific mount.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mountId` | string | Yes | Unique mount ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_mount_create`

**Title:** Create Mount
**Type:** Mutating

Create a new mount for a Dokploy service. Supports bind mounts, volume mounts, and file mounts.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `type` | enum | Yes | Mount type: `bind`, `volume`, or `file` |
| `mountPath` | string | Yes | Path inside the container where the mount is attached |
| `serviceId` | string | Yes | ID of the service to attach the mount to |
| `hostPath` | string | No | Host path for bind mounts |
| `volumeName` | string | No | Volume name for volume mounts |
| `content` | string | No | File content for file mounts |
| `serviceType` | enum | No | Type of service: `application`, `postgres`, `mysql`, `mariadb`, `mongo`, `redis`, or `compose` (default: `application`) |

---

### `dokploy_mount_update`

**Title:** Update Mount
**Type:** Mutating

Update an existing mount configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mountId` | string | Yes | Unique mount ID |
| `type` | enum | No | New mount type: `bind`, `volume`, or `file` |
| `mountPath` | string | No | New path inside the container |
| `hostPath` | string | No | New host path for bind mounts |
| `volumeName` | string | No | New volume name for volume mounts |
| `content` | string | No | New file content for file mounts |

---

### `dokploy_mount_remove`

**Title:** Remove Mount
**Type:** Destructive

Permanently remove a mount from a Dokploy service. The underlying host path, volume, or file content is not automatically deleted.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `mountId` | string | Yes | Unique mount ID |

**Annotations:** `destructiveHint`

---

## Port

Tools for managing port mappings on Dokploy applications.

### `dokploy_port_one`

**Title:** Get Port Mapping
**Type:** Read-only

Retrieve the full configuration of a specific port mapping.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `portId` | string | Yes | Unique port mapping ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_port_create`

**Title:** Create Port Mapping
**Type:** Mutating

Create a new port mapping for a Dokploy application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `publishedPort` | number | Yes | The externally published port number |
| `targetPort` | number | Yes | The target port inside the container |
| `applicationId` | string | Yes | ID of the application to add the port mapping to |
| `protocol` | enum | No | Network protocol: `tcp` (default) or `udp` |

---

### `dokploy_port_update`

**Title:** Update Port Mapping
**Type:** Mutating

Update an existing port mapping configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `portId` | string | Yes | Unique port mapping ID |
| `publishedPort` | number | No | New externally published port number |
| `targetPort` | number | No | New target port inside the container |
| `protocol` | enum | No | New network protocol: `tcp` or `udp` |

---

### `dokploy_port_delete`

**Title:** Delete Port Mapping
**Type:** Destructive

Permanently delete a port mapping from a Dokploy application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `portId` | string | Yes | Unique port mapping ID |

**Annotations:** `destructiveHint`

---

## Redirects

Tools for managing URL redirect rules on Dokploy applications.

### `dokploy_redirect_one`

**Title:** Get Redirect Rule
**Type:** Read-only

Get details of a specific redirect rule including regex pattern, replacement URL, and redirect type (301/302).

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redirectId` | string | Yes | Unique redirect rule ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_redirect_create`

**Title:** Create Redirect Rule
**Type:** Mutating

Create a new redirect rule for an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `regex` | string | Yes | Regular expression pattern to match incoming requests |
| `replacement` | string | Yes | Replacement URL or path for matched requests |
| `permanent` | boolean | Yes | Whether the redirect is permanent (301) or temporary (302) |
| `applicationId` | string | Yes | ID of the application to add the redirect to |

---

### `dokploy_redirect_update`

**Title:** Update Redirect Rule
**Type:** Mutating

Update an existing redirect rule.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redirectId` | string | Yes | Unique redirect rule ID |
| `regex` | string | No | New regular expression pattern |
| `replacement` | string | No | New replacement URL or path |
| `permanent` | boolean | No | Whether the redirect is permanent (301) or temporary (302) |

---

### `dokploy_redirect_delete`

**Title:** Delete Redirect Rule
**Type:** Destructive

Delete a redirect rule permanently. The redirect will stop being applied immediately.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `redirectId` | string | Yes | Unique redirect rule ID |

**Annotations:** `destructiveHint`

---

## Security

Tools for managing HTTP basic-auth security entries on Dokploy applications.

### `dokploy_security_one`

**Title:** Get Security Entry
**Type:** Read-only

Get details of a specific HTTP basic-auth security entry.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `securityId` | string | Yes | Unique security entry ID |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_security_create`

**Title:** Create Security Entry
**Type:** Mutating

Create a new HTTP basic-auth security entry to protect an application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `applicationId` | string | Yes | ID of the application to protect |
| `username` | string | Yes | Username for basic-auth access |
| `password` | string | Yes | Password for basic-auth access |

---

### `dokploy_security_update`

**Title:** Update Security Entry
**Type:** Mutating

Update an existing HTTP basic-auth security entry.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `securityId` | string | Yes | Unique security entry ID |
| `username` | string | No | New username for basic-auth access |
| `password` | string | No | New password for basic-auth access |

---

### `dokploy_security_delete`

**Title:** Delete Security Entry
**Type:** Destructive

Delete an HTTP basic-auth security entry permanently. Immediately removes authentication protection from the associated application.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `securityId` | string | Yes | Unique security entry ID |

**Annotations:** `destructiveHint`

---

## Cluster

Tools for managing Docker Swarm cluster nodes.

### `dokploy_cluster_get_nodes`

**Title:** List Cluster Nodes
**Type:** Read-only

List all nodes in the Docker Swarm cluster including node IDs, hostnames, roles, availability status, and resource information.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_cluster_add_worker`

**Title:** Get Add Worker Command
**Type:** Read-only

Get the Docker Swarm join command to add a new worker node to the cluster.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_cluster_add_manager`

**Title:** Get Add Manager Command
**Type:** Read-only

Get the Docker Swarm join command to add a new manager node to the cluster.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_cluster_remove_worker`

**Title:** Remove Worker Node
**Type:** Destructive

Remove a worker node from the Docker Swarm cluster. Services running on the node will be rescheduled to other available nodes.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `nodeId` | string | Yes | ID of the worker node to remove from the cluster |

**Annotations:** `destructiveHint`

---

## Settings

Tools for managing Dokploy server settings, Traefik configuration, Docker cleanup, and system maintenance.

### `dokploy_settings_reload_server`

**Title:** Reload Server
**Type:** Mutating

Reload the Dokploy server process to apply configuration changes.

**Parameters:** None

---

### `dokploy_settings_reload_traefik`

**Title:** Reload Traefik
**Type:** Mutating

Reload the Traefik reverse proxy to apply routing and configuration changes.

**Parameters:** None

---

### `dokploy_settings_clean_unused_images`

**Title:** Clean Unused Images
**Type:** Mutating

Remove unused Docker images to free disk space. Only removes images not referenced by any container.

**Parameters:** None

---

### `dokploy_settings_clean_unused_volumes`

**Title:** Clean Unused Volumes
**Type:** Destructive

Remove unused Docker volumes to free disk space. May delete persistent data stored in unattached volumes.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_clean_stopped_containers`

**Title:** Clean Stopped Containers
**Type:** Destructive

Remove all stopped Docker containers from the server.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_clean_docker_builder`

**Title:** Clean Docker Builder
**Type:** Mutating

Clean the Docker builder cache to free disk space used by intermediate build layers.

**Parameters:** None

---

### `dokploy_settings_clean_docker_prune`

**Title:** Docker System Prune
**Type:** Destructive

Run a full Docker system prune to remove all unused resources including stopped containers, dangling images, unused networks, and build cache.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_clean_all`

**Title:** Clean All Docker Resources
**Type:** Destructive

Clean all unused Docker resources at once: images, volumes, stopped containers, and builder cache. This is the most aggressive cleanup option.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_clean_monitoring`

**Title:** Clean Monitoring Data
**Type:** Destructive

Clear all stored monitoring data including metrics and historical performance information.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_save_ssh_private_key`

**Title:** Save SSH Private Key
**Type:** Mutating

Save an SSH private key for server access and remote operations.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `sshPrivateKey` | string \| null | Yes | The SSH private key content, or null to clear |

---

### `dokploy_settings_clean_ssh_private_key`

**Title:** Clean SSH Private Key
**Type:** Destructive

Remove the stored SSH private key from the server.

**Parameters:** None

**Annotations:** `destructiveHint`

---

### `dokploy_settings_assign_domain_server`

**Title:** Assign Domain to Server
**Type:** Mutating

Assign a domain to the Dokploy server with optional SSL certificate configuration.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `letsEncryptEmail` | string | No | Email for Let's Encrypt certificate registration |
| `certificateType` | enum | No | Type of SSL certificate: `letsencrypt` or `none` |

---

### `dokploy_settings_update_docker_cleanup`

**Title:** Update Docker Cleanup Schedule
**Type:** Mutating

Configure automatic Docker cleanup scheduling.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `enabled` | boolean | Yes | Whether automatic cleanup is enabled |
| `schedule` | string | No | Cron schedule expression for the cleanup job |

---

### `dokploy_settings_read_traefik_config`

**Title:** Read Traefik Config
**Type:** Read-only

Read the current main Traefik configuration file content.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_update_traefik_config`

**Title:** Update Traefik Config
**Type:** Mutating

Update the main Traefik configuration file with new content.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `traefikConfig` | string | Yes | The new Traefik configuration content |

---

### `dokploy_settings_read_web_server_traefik_config`

**Title:** Read Web Server Traefik Config
**Type:** Read-only

Read the Traefik configuration specific to the Dokploy web server.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_update_web_server_traefik_config`

**Title:** Update Web Server Traefik Config
**Type:** Mutating

Update the Traefik configuration for the Dokploy web server.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `traefikConfig` | string | Yes | The new web server Traefik configuration content |

---

### `dokploy_settings_read_middleware_traefik_config`

**Title:** Read Middleware Traefik Config
**Type:** Read-only

Read the Traefik middleware configuration that defines request processing rules.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_update_middleware_traefik_config`

**Title:** Update Middleware Traefik Config
**Type:** Mutating

Update the Traefik middleware configuration that controls request processing rules.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `traefikConfig` | string | Yes | The new middleware Traefik configuration content |

---

### `dokploy_settings_update_server`

**Title:** Update Server
**Type:** Mutating

Update the Dokploy server to the latest available version. Will restart the server process.

**Parameters:** None

---

### `dokploy_settings_get_version`

**Title:** Get Dokploy Version
**Type:** Read-only

Get the currently running Dokploy server version.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_read_directories`

**Title:** Read Server Directories
**Type:** Read-only

Read the server directory listing to inspect the file system structure used by Dokploy.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_get_openapi_document`

**Title:** Get OpenAPI Document
**Type:** Read-only

Get the Dokploy OpenAPI specification document describing all available API endpoints.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_read_traefik_file`

**Title:** Read Traefik File
**Type:** Read-only

Read a specific Traefik configuration file from the server file system. Useful for inspecting individual Traefik config files beyond the main config.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Path to the Traefik configuration file to read |

**Annotations:** `readOnlyHint`, `idempotentHint`

---

### `dokploy_settings_update_traefik_file`

**Title:** Update Traefik File
**Type:** Mutating

Update a specific Traefik configuration file on the server. A Traefik reload may be needed to apply changes.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `path` | string | Yes | Path to the Traefik configuration file to update |
| `traefikConfig` | string | Yes | The new file content |

---

## Admin

Tools for Dokploy admin operations.

### `dokploy_admin_setup_monitoring`

**Title:** Setup Monitoring
**Type:** Mutating

Configure server and container monitoring metrics. Sets up refresh rates, retention policies, callback URLs, resource thresholds, and container service filters.

**Parameters:**

| Name | Type | Required | Description |
|---|---|---|---|
| `metricsConfig` | object | Yes | Top-level monitoring configuration object |
| `metricsConfig.server` | object | Yes | Server-level metrics settings |
| `metricsConfig.server.refreshRate` | number | Yes | Metrics refresh rate in seconds (minimum 2) |
| `metricsConfig.server.port` | number | Yes | Monitoring port number |
| `metricsConfig.server.token` | string | Yes | Authentication token for metrics endpoint |
| `metricsConfig.server.urlCallback` | string | Yes | Callback URL for metrics data |
| `metricsConfig.server.retentionDays` | number | Yes | Number of days to retain metrics data |
| `metricsConfig.server.cronJob` | string | Yes | Cron expression for scheduled metrics collection |
| `metricsConfig.server.thresholds` | object | Yes | Resource usage thresholds |
| `metricsConfig.server.thresholds.cpu` | number | Yes | CPU usage threshold percentage |
| `metricsConfig.server.thresholds.memory` | number | Yes | Memory usage threshold percentage |
| `metricsConfig.containers` | object | Yes | Container-level metrics settings |
| `metricsConfig.containers.refreshRate` | number | Yes | Container metrics refresh rate in seconds (minimum 2) |
| `metricsConfig.containers.services` | object | Yes | Service filter configuration |
| `metricsConfig.containers.services.include` | string[] | No | Service names to include in monitoring |
| `metricsConfig.containers.services.exclude` | string[] | No | Service names to exclude from monitoring |

---

## User

Tools for reading user information.

### `dokploy_user_all`

**Title:** List All Users
**Type:** Read-only

List all users registered in the Dokploy instance. Returns an array of user objects including IDs, emails, roles, and permissions.

**Parameters:** None

**Annotations:** `readOnlyHint`, `idempotentHint`
