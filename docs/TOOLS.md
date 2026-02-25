# Tool Reference

196 tools across 23 modules. All tool names are prefixed with `dokploy_` (omitted below for sanity). The 5 database modules share the same interface, so they're grouped into one section below.

**Types:** Read (safe, no side effects) -- Write (creates or changes things) -- Destroy (irreversible -- deletes data or stops services)

## Contents

- [Project](#project) (6)
- [Application](#application) (26)
- [Compose](#compose) (14)
- [Domain](#domain) (8)
- [Databases](#databases) (65 -- 13 each for Postgres, MySQL, MariaDB, MongoDB, Redis)
- [Deployment](#deployment) (2)
- [Docker](#docker) (4)
- [Certificates](#certificates) (4)
- [Registry](#registry) (6)
- [Destination](#destination) (6)
- [Backup](#backup) (8)
- [Mounts](#mounts) (4)
- [Ports](#ports) (4)
- [Redirects](#redirects) (4)
- [Security](#security) (4)
- [Cluster](#cluster) (4)
- [Settings](#settings) (25)
- [Admin](#admin) (1)
- [User](#user) (1)

---

## Project

Where it all begins. Everything lives inside a project -- think of it as a folder that got ideas above its station.

| Tool | Type | Description |
|------|------|-------------|
| `project_all` | Read | List all projects |
| `project_one` | Read | Get project details |
| `project_create` | Write | Create a project. Params: `name`, `description?` |
| `project_update` | Write | Update a project. Params: `projectId`, `name?`, `description?`, `env?` |
| `project_duplicate` | Write | Duplicate a project. Params: `sourceEnvironmentId`, `name` + duplication options |
| `project_remove` | Destroy | Delete a project and everything in it |

## Application

The main event. Build it, ship it, break it, redeploy it at 3am.

| Tool | Type | Description |
|------|------|-------------|
| `application_create` | Write | Create an application. Params: `name`, `projectId`, `appName?`, `description?`, `serverId?` |
| `application_one` | Read | Get application details |
| `application_update` | Write | Update application config. Params: `applicationId` + config fields (env, resources, Docker, Swarm, etc.) |
| `application_delete` | Destroy | Delete an application and all its data |
| `application_move` | Write | Move application to another project. Params: `applicationId`, `targetProjectId` |
| `application_deploy` | Write | Trigger a deployment |
| `application_redeploy` | Write | Force a full rebuild and deploy |
| `application_start` | Write | Start a stopped application |
| `application_stop` | Destroy | Stop a running application (causes downtime) |
| `application_cancel_deployment` | Write | Cancel an in-progress deployment |
| `application_reload` | Write | Restart containers without rebuilding. Params: `applicationId`, `appName` |
| `application_mark_running` | Write | Manually mark status as running |
| `application_clean_queues` | Destroy | Clear stuck deployment queues |
| `application_refresh_token` | Write | Regenerate the webhook token |
| `application_save_build_type` | Write | Set build type. Params: `applicationId`, `buildType`, `dockerContextPath?`, `dockerBuildStage?` |
| `application_save_environment` | Write | Save env vars and build args. Params: `applicationId`, `env?`, `buildArgs?` |
| `application_save_github_provider` | Write | Configure GitHub source. Params: `applicationId`, `owner` + repo settings |
| `application_save_gitlab_provider` | Write | Configure GitLab source. Params: `applicationId` + GitLab settings |
| `application_save_bitbucket_provider` | Write | Configure Bitbucket source. Params: `applicationId` + Bitbucket settings |
| `application_save_gitea_provider` | Write | Configure Gitea source. Params: `applicationId` + Gitea settings |
| `application_save_git_provider` | Write | Configure custom Git source. Params: `applicationId`, `customGitUrl?`, `customGitBranch?` + options |
| `application_save_docker_provider` | Write | Configure Docker image source. Params: `applicationId`, `dockerImage`, `username?`, `password?` |
| `application_disconnect_git_provider` | Destroy | Disconnect the current Git source |
| `application_read_app_monitoring` | Read | Get resource usage metrics. Params: `appName` |
| `application_read_traefik_config` | Read | Read Traefik routing config |
| `application_update_traefik_config` | Write | Update Traefik routing config. Params: `applicationId`, `traefikConfig` |

## Compose

For when one container just isn't enough drama.

| Tool | Type | Description |
|------|------|-------------|
| `compose_create` | Write | Create a compose service. Params: `name`, `projectId`, `composeType?`, `appName?`, `serverId?` |
| `compose_one` | Read | Get compose service details |
| `compose_update` | Write | Update compose config. Params: `composeId` + config fields (env, composeFile, source, Git, etc.) |
| `compose_delete` | Destroy | Delete a compose service and all its containers |
| `compose_deploy` | Write | Deploy the compose stack |
| `compose_redeploy` | Write | Rebuild and redeploy all containers |
| `compose_stop` | Destroy | Stop all containers in the stack |
| `compose_clean_queues` | Destroy | Clear stuck deployment queues |
| `compose_randomize` | Write | Randomize service names to avoid conflicts. Params: `composeId`, `prefix?` |
| `compose_get_default_command` | Read | Get the default deployment command |
| `compose_refresh_token` | Write | Regenerate the webhook token |
| `compose_deploy_template` | Write | Deploy from a template. Params: `projectId`, `id` |
| `compose_templates` | Read | List available compose templates |
| `compose_save_environment` | Write | Save env vars and build args. Params: `composeId`, `env?`, `buildArgs?` |

## Domain

Because `localhost:3000` is not a production strategy.

| Tool | Type | Description |
|------|------|-------------|
| `domain_create` | Write | Create a domain. Params: `host`, `https`, `certificateType`, `stripPath` + routing options |
| `domain_one` | Read | Get domain details |
| `domain_by_application_id` | Read | List domains for an application |
| `domain_by_compose_id` | Read | List domains for a compose service |
| `domain_update` | Write | Update domain config. Params: `domainId`, `host`, `https`, `certificateType`, `stripPath` + options |
| `domain_delete` | Destroy | Delete a domain and its SSL config |
| `domain_validate` | Write | Validate DNS records. Params: `domain`, `serverIp?` |
| `domain_generate` | Write | Auto-generate a subdomain for an application |

## Databases

Postgres, MySQL, MariaDB, MongoDB, Redis -- same 13 tools each, same interface. Swap the prefix to pick your poison: `postgres_`, `mysql_`, `mariadb_`, `mongo_`, `redis_`.

The ID param follows the same pattern: `postgresId`, `mysqlId`, `mariadbId`, `mongoId`, `redisId`.

| Tool | Type | Description |
|------|------|-------------|
| `{db}_one` | Read | Get database details |
| `{db}_create` | Write | Create a database. Params: `name`, `appName`, `projectId`, credentials + `dockerImage?`, `serverId?` |
| `{db}_update` | Write | Update database config. Params: `{db}Id` + name, image, resources, env, externalPort |
| `{db}_remove` | Destroy | Delete database, container, and all data |
| `{db}_move` | Write | Move to another project. Params: `{db}Id`, `targetProjectId` |
| `{db}_deploy` | Write | Deploy the database container |
| `{db}_start` | Write | Start a stopped database |
| `{db}_stop` | Destroy | Stop the database (kills active connections) |
| `{db}_reload` | Write | Restart container without rebuild. Params: `{db}Id`, `appName` |
| `{db}_rebuild` | Write | Tear down and recreate the container |
| `{db}_change_status` | Write | Override status manually. Params: `{db}Id`, `applicationStatus` |
| `{db}_save_external_port` | Write | Set or clear external port. Params: `{db}Id`, `externalPort` |
| `{db}_save_environment` | Write | Overwrite env vars. Params: `{db}Id`, `env?` |

> **Note on `create` params:** Postgres needs `databaseName`, `databaseUser`, `databasePassword`. MySQL and MariaDB add `databaseRootPassword`. MongoDB needs `databaseUser`, `databasePassword` (no database name). Redis just needs `databasePassword`.

## Deployment

Read-only. Deployments are created by deploying things, not by asking politely.

| Tool | Type | Description |
|------|------|-------------|
| `deployment_all` | Read | List deployments for an application |
| `deployment_all_by_compose` | Read | List deployments for a compose service |

## Docker

Peek behind the curtain at what's actually running.

| Tool | Type | Description |
|------|------|-------------|
| `docker_get_containers` | Read | List all Docker containers on the server |
| `docker_get_config` | Read | Get full container config. Params: `containerId` |
| `docker_get_containers_by_app_name_match` | Read | Find containers by name substring. Params: `appName` |
| `docker_get_containers_by_app_label` | Read | Find containers by app label. Params: `appName` |

## Certificates

SSL/TLS management -- because browsers get very judgy about padlock icons.

| Tool | Type | Description |
|------|------|-------------|
| `certificate_all` | Read | List all certificates |
| `certificate_one` | Read | Get certificate details |
| `certificate_create` | Write | Upload a certificate. Params: `name`, `certificateData`, `privateKey`, `autoRenew?` |
| `certificate_remove` | Destroy | Delete a certificate |

## Registry

Where your container images live. Docker Hub, self-hosted, whatever keeps you up at night.

| Tool | Type | Description |
|------|------|-------------|
| `registry_all` | Read | List all configured registries |
| `registry_one` | Read | Get registry details |
| `registry_create` | Write | Add a registry. Params: `registryName`, `username`, `password`, `registryUrl`, `registryType`, `imagePrefix?` |
| `registry_update` | Write | Update a registry. Params: `registryId` + all registry fields |
| `registry_remove` | Destroy | Delete a registry config |
| `registry_test` | Write | Test registry connection. Params: same as create |

## Destination

S3-compatible backup destinations. Because your data should exist in at least two places you can't remember.

| Tool | Type | Description |
|------|------|-------------|
| `destination_all` | Read | List all backup destinations |
| `destination_one` | Read | Get destination details |
| `destination_create` | Write | Create a destination. Params: `name`, `accessKey`, `secretAccessKey`, `bucket`, `region`, `endpoint` |
| `destination_update` | Write | Update a destination. Params: `destinationId` + all destination fields |
| `destination_remove` | Destroy | Delete a destination config |
| `destination_test_connection` | Write | Test S3 connectivity. Params: same as create |

## Backup

Scheduled and manual backups. Future you will be grateful, or at least less furious.

| Tool | Type | Description |
|------|------|-------------|
| `backup_one` | Read | Get backup schedule details |
| `backup_create` | Write | Create a backup schedule. Params: `schedule`, `prefix`, `destinationId`, `database`, `databaseType` + db ID |
| `backup_update` | Write | Update a backup schedule. Params: `backupId`, `schedule`, `prefix`, `destinationId`, `database`, `enabled?` |
| `backup_remove` | Destroy | Delete a backup schedule (existing backup files are kept) |
| `backup_manual_postgres` | Write | Trigger immediate Postgres backup |
| `backup_manual_mysql` | Write | Trigger immediate MySQL backup |
| `backup_manual_mariadb` | Write | Trigger immediate MariaDB backup |
| `backup_manual_mongo` | Write | Trigger immediate MongoDB backup |

## Mounts

Bind mounts, volumes, and file mounts. Attach storage to your services like sticky notes to a monitor.

| Tool | Type | Description |
|------|------|-------------|
| `mount_one` | Read | Get mount details |
| `mount_create` | Write | Create a mount. Params: `type`, `mountPath`, `serviceId`, `hostPath?`, `volumeName?`, `content?`, `serviceType?` |
| `mount_update` | Write | Update a mount. Params: `mountId` + type, paths, content |
| `mount_remove` | Destroy | Detach a mount from its service |

## Ports

Expose container ports to the outside world. What could possibly go wrong.

| Tool | Type | Description |
|------|------|-------------|
| `port_one` | Read | Get port mapping details |
| `port_create` | Write | Create a port mapping. Params: `publishedPort`, `targetPort`, `applicationId`, `protocol?` |
| `port_update` | Write | Update a port mapping. Params: `portId`, `publishedPort?`, `targetPort?`, `protocol?` |
| `port_delete` | Destroy | Delete a port mapping |

## Redirects

URL redirect rules. For when you move things and don't want the internet to notice.

| Tool | Type | Description |
|------|------|-------------|
| `redirect_one` | Read | Get redirect rule details |
| `redirect_create` | Write | Create a redirect. Params: `regex`, `replacement`, `permanent`, `applicationId` |
| `redirect_update` | Write | Update a redirect. Params: `redirectId`, `regex?`, `replacement?`, `permanent?` |
| `redirect_delete` | Destroy | Delete a redirect rule |

## Security

HTTP basic-auth protection. Not glamorous, but it keeps the riffraff out.

| Tool | Type | Description |
|------|------|-------------|
| `security_one` | Read | Get security entry details |
| `security_create` | Write | Add basic-auth. Params: `applicationId`, `username`, `password` |
| `security_update` | Write | Update credentials. Params: `securityId`, `username?`, `password?` |
| `security_delete` | Destroy | Remove basic-auth protection |

## Cluster

Docker Swarm cluster management. For when one server just isn't enough responsibility.

| Tool | Type | Description |
|------|------|-------------|
| `cluster_get_nodes` | Read | List all Swarm nodes |
| `cluster_add_worker` | Read | Get the join command for a new worker node |
| `cluster_add_manager` | Read | Get the join command for a new manager node |
| `cluster_remove_worker` | Destroy | Remove a worker node from the cluster |

## Settings

Server-wide settings, Traefik config, and Docker cleanup. The control panel for the control panel.

| Tool | Type | Description |
|------|------|-------------|
| `settings_reload_server` | Write | Reload the Dokploy server process |
| `settings_reload_traefik` | Write | Reload Traefik to apply config changes |
| `settings_clean_unused_images` | Destroy | Remove unused Docker images |
| `settings_clean_unused_volumes` | Destroy | Remove unused Docker volumes |
| `settings_clean_stopped_containers` | Destroy | Remove stopped containers |
| `settings_clean_docker_builder` | Destroy | Clean Docker builder cache |
| `settings_clean_docker_prune` | Destroy | Full Docker system prune |
| `settings_clean_all` | Destroy | Nuclear option -- clean everything unused |
| `settings_clean_monitoring` | Destroy | Clear all monitoring history |
| `settings_save_ssh_private_key` | Write | Save SSH key for remote ops. Params: `sshPrivateKey` |
| `settings_clean_ssh_private_key` | Destroy | Delete the stored SSH key |
| `settings_assign_domain_server` | Write | Assign domain to server. Params: `letsEncryptEmail?`, `certificateType?` |
| `settings_update_docker_cleanup` | Write | Configure auto-cleanup schedule. Params: `enabled`, `schedule?` |
| `settings_read_traefik_config` | Read | Read main Traefik config |
| `settings_update_traefik_config` | Write | Update main Traefik config. Params: `traefikConfig` |
| `settings_read_web_server_traefik_config` | Read | Read Dokploy web server Traefik config |
| `settings_update_web_server_traefik_config` | Write | Update web server Traefik config. Params: `traefikConfig` |
| `settings_read_middleware_traefik_config` | Read | Read Traefik middleware config |
| `settings_update_middleware_traefik_config` | Write | Update Traefik middleware config. Params: `traefikConfig` |
| `settings_update_server` | Write | Update Dokploy to latest version (causes brief downtime) |
| `settings_get_version` | Read | Get current Dokploy version |
| `settings_read_directories` | Read | List server directory structure |
| `settings_get_openapi_document` | Read | Get the full OpenAPI spec |
| `settings_read_traefik_file` | Read | Read a specific Traefik file. Params: `path` |
| `settings_update_traefik_file` | Write | Update a specific Traefik file. Params: `path`, `traefikConfig` |

## Admin

Just the one. Handle with care.

| Tool | Type | Description |
|------|------|-------------|
| `admin_setup_monitoring` | Write | Configure monitoring system. Params: `metricsConfig` (nested: server thresholds, retention, container filters) |

## User

Also just the one. Democracy wasn't the goal here.

| Tool | Type | Description |
|------|------|-------------|
| `user_all` | Read | List all users |
