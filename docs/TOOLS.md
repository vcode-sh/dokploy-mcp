# Tool Reference

377 tools across 38 modules. All tool names are prefixed with `dokploy_` (omitted below for sanity). The 5 database modules share the same interface, so they're grouped into one section below.

**Types:** Read (safe, no side effects) -- Write (creates or changes things) -- Destroy (irreversible -- deletes data or stops services)

## Contents

- [Project](#project) (8)
- [Environment](#environment) (7)
- [Application](#application) (29)
- [Compose](#compose) (28)
- [Domain](#domain) (9)
- [Databases](#databases) (70 -- 14 each for Postgres, MySQL, MariaDB, MongoDB, Redis)
- [Deployment](#deployment) (8)
- [Docker](#docker) (7)
- [Certificates](#certificates) (4)
- [Registry](#registry) (6)
- [Destination](#destination) (6)
- [Backup](#backup) (11)
- [Mounts](#mounts) (6)
- [Volume Backups](#volume-backups) (6)
- [Rollback](#rollback) (2)
- [Ports](#ports) (4)
- [Redirects](#redirects) (4)
- [Security](#security) (4)
- [Cluster](#cluster) (4)
- [Settings](#settings) (49)
- [Admin](#admin) (1)
- [User](#user) (7)
- [Server](#server) (16)
- [SSH Key](#ssh-key) (6)
- [Git Provider](#git-provider) (2)
- [GitHub](#github) (6)
- [GitLab](#gitlab) (7)
- [Notification](#notification) (38)
- [Preview Deployment](#preview-deployment) (4)
- [Schedule](#schedule) (6)
- [Patch](#patch) (12)

---

## Project

Where it all begins. Everything lives inside a project -- think of it as a folder that got ideas above its station.

| Tool | Type | Description |
|------|------|-------------|
| `project_all` | Read | List all projects |
| `project_one` | Read | Get project details |
| `project_search` | Read | Search projects by name/text. Params: `q?`, `name?`, `limit?`, `offset?` |
| `project_all_for_permissions` | Read | List projects in permission-assignment format |
| `project_create` | Write | Create a project. Params: `name`, `description?` |
| `project_update` | Write | Update a project. Params: `projectId`, `name?`, `description?`, `env?` |
| `project_duplicate` | Write | Duplicate a project. Params: `sourceEnvironmentId`, `name` + duplication options |
| `project_remove` | Destroy | Delete a project and everything in it |

## Environment

The layer between projects and services. Every project has at least one.

| Tool | Type | Description |
|------|------|-------------|
| `environment_one` | Read | Get environment details |
| `environment_by_project_id` | Read | List environments for a project |
| `environment_search` | Read | Search environments |
| `environment_create` | Write | Create an environment. Params: `name`, `projectId`, `description?` |
| `environment_update` | Write | Update an environment. Params: `environmentId`, `name?`, `description?`, `env?` |
| `environment_duplicate` | Write | Duplicate an environment. Params: `environmentId` |
| `environment_remove` | Destroy | Delete an environment and all its services |

## Application

The main event. Build it, ship it, break it, redeploy it at 3am.

| Tool | Type | Description |
|------|------|-------------|
| `application_create` | Write | Create an application. Params: `name`, `environmentId`, `appName?`, `description?`, `serverId?` |
| `application_one` | Read | Get application details |
| `application_search` | Read | Search applications |
| `application_update` | Write | Update application config. Params: `applicationId` + config fields (env, resources, Docker, Swarm, etc.). Resource limits: `memoryLimit`/`memoryReservation` in bytes (e.g. `"268435456"` for 256MB), `cpuLimit`/`cpuReservation` in nanoCPUs (e.g. `"500000000"` for 0.5 CPU). Ulimits: `ulimitsSwarm` as `[{"Name":"nofile","Soft":65535,"Hard":65535}]` |
| `application_delete` | Destroy | Delete an application and all its data |
| `application_move` | Write | Move application to another environment. Params: `applicationId`, `targetEnvironmentId` |
| `application_deploy` | Write | Trigger a deployment |
| `application_redeploy` | Write | Force a full rebuild and deploy |
| `application_start` | Write | Start a stopped application |
| `application_stop` | Destroy | Stop a running application (causes downtime) |
| `application_cancel_deployment` | Write | Cancel an in-progress deployment |
| `application_reload` | Write | Restart containers without rebuilding. Params: `applicationId`, `appName` |
| `application_mark_running` | Write | Manually mark status as running |
| `application_clean_queues` | Destroy | Clear stuck deployment queues |
| `application_clear_deployments` | Destroy | Clear all deployment history |
| `application_kill_build` | Destroy | Kill a running build process |
| `application_refresh_token` | Write | Regenerate the webhook token |
| `application_save_build_type` | Write | Set build type. Params: `applicationId`, `buildType`, `dockerContextPath?`, `dockerBuildStage?` |
| `application_save_environment` | Write | Save env vars and build args. Params: `applicationId`, `env`, `buildArgs`, `buildSecrets`, `createEnvFile` |
| `application_save_github_provider` | Write | Configure GitHub source |
| `application_save_gitlab_provider` | Write | Configure GitLab source |
| `application_save_bitbucket_provider` | Write | Configure Bitbucket source |
| `application_save_gitea_provider` | Write | Configure Gitea source |
| `application_save_git_provider` | Write | Configure custom Git source |
| `application_save_docker_provider` | Write | Configure Docker image source |
| `application_disconnect_git_provider` | Destroy | Disconnect the current Git source |
| `application_read_app_monitoring` | Read | Get resource usage metrics. Params: `appName` |
| `application_read_traefik_config` | Read | Read Traefik routing config |
| `application_update_traefik_config` | Write | Update Traefik routing config |

## Compose

For when one container just isn't enough drama.

| Tool | Type | Description |
|------|------|-------------|
| `compose_create` | Write | Create a compose service. Params: `name`, `environmentId`, `composeType?`, `appName?`, `serverId?` |
| `compose_one` | Read | Get compose service details |
| `compose_search` | Read | Search compose services |
| `compose_update` | Write | Update compose config. Params: `composeId` + config fields (env, composeFile, source, Git, etc.) |
| `compose_delete` | Destroy | Delete a compose service. Params: `composeId`, `deleteVolumes` |
| `compose_deploy` | Write | Deploy the compose stack |
| `compose_redeploy` | Write | Rebuild and redeploy all containers |
| `compose_start` | Write | Start stopped compose containers |
| `compose_stop` | Destroy | Stop all containers in the stack |
| `compose_move` | Write | Move to another environment. Params: `composeId`, `targetEnvironmentId` |
| `compose_cancel_deployment` | Write | Cancel an in-progress deployment |
| `compose_kill_build` | Destroy | Kill a running build |
| `compose_clear_deployments` | Destroy | Clear deployment history |
| `compose_disconnect_git_provider` | Destroy | Disconnect Git source |
| `compose_clean_queues` | Destroy | Clear stuck deployment queues |
| `compose_randomize` | Write | Randomize service names |
| `compose_get_default_command` | Read | Get the default deployment command |
| `compose_refresh_token` | Write | Regenerate the webhook token |
| `compose_deploy_template` | Write | Deploy from a template. Params: `environmentId`, `id` |
| `compose_templates` | Read | List available compose templates |
| `compose_load_services` | Read | List services within a compose stack |
| `compose_load_mounts_by_service` | Read | List mounts for a specific service in a compose |
| `compose_get_converted_compose` | Read | Get processed/converted compose file |
| `compose_get_tags` | Read | List available tags |
| `compose_fetch_source_type` | Write | Detect source type from repo |
| `compose_isolated_deployment` | Write | Run an isolated deployment |
| `compose_process_template` | Write | Process a compose template |
| `compose_import` | Write | Import a compose configuration |

## Domain

Because `localhost:3000` is not a production strategy.

| Tool | Type | Description |
|------|------|-------------|
| `domain_create` | Write | Create a domain. Params: `host`, `https`, `certificateType`, `stripPath` + routing options |
| `domain_one` | Read | Get domain details |
| `domain_by_application_id` | Read | List domains for an application |
| `domain_by_compose_id` | Read | List domains for a compose service |
| `domain_can_generate_traefik_me_domains` | Read | Check if Traefik.me domain generation is available |
| `domain_update` | Write | Update domain config |
| `domain_delete` | Destroy | Delete a domain and its SSL config |
| `domain_validate` | Write | Validate DNS records |
| `domain_generate` | Write | Auto-generate a subdomain |

## Databases

Postgres, MySQL, MariaDB, MongoDB, Redis -- same 14 tools each, same interface. Swap the prefix to pick your poison: `postgres_`, `mysql_`, `mariadb_`, `mongo_`, `redis_`.

The ID param follows the same pattern: `postgresId`, `mysqlId`, `mariadbId`, `mongoId`, `redisId`.

| Tool | Type | Description |
|------|------|-------------|
| `{db}_one` | Read | Get database details |
| `{db}_search` | Read | Search databases |
| `{db}_create` | Write | Create a database. Params: `name`, `appName`, `environmentId`, credentials + `dockerImage?`, `serverId?` |
| `{db}_update` | Write | Update database config. Params: `{db}Id` + name, image, resources, env, externalPort |
| `{db}_remove` | Destroy | Delete database, container, and all data |
| `{db}_move` | Write | Move to another environment. Params: `{db}Id`, `targetEnvironmentId` |
| `{db}_deploy` | Write | Deploy the database container |
| `{db}_start` | Write | Start a stopped database |
| `{db}_stop` | Destroy | Stop the database (kills active connections) |
| `{db}_reload` | Write | Restart container without rebuild |
| `{db}_rebuild` | Write | Tear down and recreate the container |
| `{db}_change_status` | Write | Override status manually |
| `{db}_save_external_port` | Write | Set or clear external port |
| `{db}_save_environment` | Write | Overwrite env vars |

> **Note on `create` params:** Postgres needs `databaseName`, `databaseUser`, `databasePassword`. MySQL and MariaDB add `databaseRootPassword`. MongoDB needs `databaseUser`, `databasePassword` (no database name). Redis just needs `databasePassword`.

## Deployment

Inspect what went where and when. Deployments are created by deploying things, not by asking politely.

| Tool | Type | Description |
|------|------|-------------|
| `deployment_all` | Read | List deployments for an application |
| `deployment_all_by_compose` | Read | List deployments for a compose service |
| `deployment_all_by_server` | Read | List deployments for a server |
| `deployment_all_centralized` | Read | List all deployments across the instance |
| `deployment_all_by_type` | Read | List deployments filtered by type |
| `deployment_queue_list` | Read | List queued deployment jobs |
| `deployment_kill_process` | Destroy | Kill a running deployment process |
| `deployment_remove_deployment` | Destroy | Remove a deployment record |

## Docker

Peek behind the curtain at what's actually running.

| Tool | Type | Description |
|------|------|-------------|
| `docker_get_containers` | Read | List all Docker containers on the server |
| `docker_get_config` | Read | Get full container config. Params: `containerId` |
| `docker_get_containers_by_app_name_match` | Read | Find containers by name substring |
| `docker_get_containers_by_app_label` | Read | Find containers by app label |
| `docker_get_stack_containers_by_app_name` | Read | List stack containers for an app |
| `docker_get_service_containers_by_app_name` | Read | List service containers for an app |
| `docker_restart_container` | Write | Restart a specific container |

## Certificates

SSL/TLS management -- because browsers get very judgy about padlock icons.

| Tool | Type | Description |
|------|------|-------------|
| `certificate_all` | Read | List all certificates |
| `certificate_one` | Read | Get certificate details |
| `certificate_create` | Write | Upload a certificate |
| `certificate_remove` | Destroy | Delete a certificate |

## Registry

Where your container images live. Docker Hub, self-hosted, whatever keeps you up at night.

| Tool | Type | Description |
|------|------|-------------|
| `registry_all` | Read | List all configured registries |
| `registry_one` | Read | Get registry details |
| `registry_create` | Write | Add a registry |
| `registry_update` | Write | Update a registry |
| `registry_remove` | Destroy | Delete a registry config |
| `registry_test` | Write | Test registry connection |

## Destination

S3-compatible backup destinations. Because your data should exist in at least two places you can't remember.

| Tool | Type | Description |
|------|------|-------------|
| `destination_all` | Read | List all backup destinations |
| `destination_one` | Read | Get destination details |
| `destination_create` | Write | Create a destination |
| `destination_update` | Write | Update a destination |
| `destination_remove` | Destroy | Delete a destination config |
| `destination_test_connection` | Write | Test S3 connectivity |

## Backup

Scheduled and manual backups. Future you will be grateful, or at least less furious.

| Tool | Type | Description |
|------|------|-------------|
| `backup_one` | Read | Get backup schedule details |
| `backup_list_backup_files` | Read | List backup files for an entity |
| `backup_create` | Write | Create a backup schedule |
| `backup_update` | Write | Update a backup schedule |
| `backup_remove` | Destroy | Delete a backup schedule (existing files kept) |
| `backup_manual_postgres` | Write | Trigger immediate Postgres backup |
| `backup_manual_mysql` | Write | Trigger immediate MySQL backup |
| `backup_manual_mariadb` | Write | Trigger immediate MariaDB backup |
| `backup_manual_mongo` | Write | Trigger immediate MongoDB backup |
| `backup_manual_compose` | Write | Trigger immediate compose backup |
| `backup_manual_web_server` | Write | Trigger immediate web server backup |

## Mounts

Bind mounts, volumes, and file mounts. Attach storage to your services like sticky notes to a monitor.

| Tool | Type | Description |
|------|------|-------------|
| `mount_one` | Read | Get mount details |
| `mount_all_named_by_application_id` | Read | List named mounts for an application |
| `mount_list_by_service_id` | Read | List mounts for a service |
| `mount_create` | Write | Create a mount. Params: `type` (bind/volume/file), `mountPath`, `serviceId`, `serviceType?`, `hostPath?`, `volumeName?`, `content?`, `filePath?` |
| `mount_update` | Write | Update a mount |
| `mount_remove` | Destroy | Detach a mount from its service |

## Volume Backups

Backup and restore Docker volumes.

| Tool | Type | Description |
|------|------|-------------|
| `volume_backups_list` | Read | List volume backups for an entity |
| `volume_backups_one` | Read | Get volume backup details |
| `volume_backups_create` | Write | Create a volume backup schedule |
| `volume_backups_update` | Write | Update a volume backup schedule |
| `volume_backups_delete` | Destroy | Delete a volume backup schedule |
| `volume_backups_run_manually` | Write | Trigger immediate volume backup |

## Rollback

When things go sideways, go back to when they didn't.

| Tool | Type | Description |
|------|------|-------------|
| `rollback_rollback` | Write | Rollback an application to a previous deployment |
| `rollback_delete` | Destroy | Delete a rollback record |

## Ports

Expose container ports to the outside world. What could possibly go wrong.

| Tool | Type | Description |
|------|------|-------------|
| `port_one` | Read | Get port mapping details |
| `port_create` | Write | Create a port mapping |
| `port_update` | Write | Update a port mapping |
| `port_delete` | Destroy | Delete a port mapping |

## Redirects

URL redirect rules. For when you move things and don't want the internet to notice.

| Tool | Type | Description |
|------|------|-------------|
| `redirect_one` | Read | Get redirect rule details |
| `redirect_create` | Write | Create a redirect |
| `redirect_update` | Write | Update a redirect |
| `redirect_delete` | Destroy | Delete a redirect rule |

## Security

HTTP basic-auth protection. Not glamorous, but it keeps the riffraff out.

| Tool | Type | Description |
|------|------|-------------|
| `security_one` | Read | Get security entry details |
| `security_create` | Write | Add basic-auth |
| `security_update` | Write | Update credentials |
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
| `settings_health` | Read | Get Dokploy health status |
| `settings_get_ip` | Read | Get server IP address |
| `settings_get_version` | Read | Get current Dokploy version |
| `settings_get_release_tag` | Read | Get latest release tag |
| `settings_get_web_server_settings` | Read | Get web server settings |
| `settings_get_update_data` | Write | Check for available updates |
| `settings_is_cloud` | Read | Check if running in cloud mode |
| `settings_is_user_subscribed` | Read | Check user subscription status |
| `settings_have_activate_requests` | Read | Check if activation requests are enabled |
| `settings_get_dokploy_cloud_ips` | Read | Get Dokploy Cloud IP addresses |
| `settings_get_traefik_ports` | Read | Get Traefik port configuration |
| `settings_have_traefik_dashboard_port_enabled` | Read | Check Traefik dashboard status |
| `settings_read_traefik_env` | Read | Read Traefik environment config |
| `settings_read_traefik_config` | Read | Read main Traefik config |
| `settings_read_web_server_traefik_config` | Read | Read web server Traefik config |
| `settings_read_middleware_traefik_config` | Read | Read Traefik middleware config |
| `settings_read_traefik_file` | Read | Read a specific Traefik file |
| `settings_read_directories` | Read | List server directory structure |
| `settings_get_openapi_document` | Read | Get the full OpenAPI spec |
| `settings_get_log_cleanup_status` | Read | Get log cleanup configuration |
| `settings_check_gpu_status` | Read | Check GPU status |
| `settings_reload_server` | Write | Reload the Dokploy server process |
| `settings_reload_traefik` | Write | Reload Traefik config |
| `settings_reload_redis` | Write | Reload Redis |
| `settings_update_server` | Write | Update Dokploy to latest version |
| `settings_update_server_ip` | Write | Update the server IP address |
| `settings_update_traefik_ports` | Write | Update Traefik ports |
| `settings_toggle_dashboard` | Write | Toggle Traefik dashboard |
| `settings_toggle_requests` | Write | Toggle activation requests |
| `settings_write_traefik_env` | Write | Write Traefik environment config |
| `settings_update_traefik_config` | Write | Update main Traefik config |
| `settings_update_web_server_traefik_config` | Write | Update web server Traefik config |
| `settings_update_middleware_traefik_config` | Write | Update Traefik middleware config |
| `settings_update_traefik_file` | Write | Update a specific Traefik file |
| `settings_update_log_cleanup` | Write | Configure log cleanup schedule |
| `settings_update_docker_cleanup` | Write | Configure Docker auto-cleanup |
| `settings_setup_gpu` | Write | Set up GPU support |
| `settings_save_ssh_private_key` | Write | Save SSH key for remote ops |
| `settings_assign_domain_server` | Write | Assign domain to server |
| `settings_clean_redis` | Destroy | Clean Redis data |
| `settings_clean_all_deployment_queue` | Destroy | Clear all deployment queues |
| `settings_clean_unused_images` | Destroy | Remove unused Docker images |
| `settings_clean_unused_volumes` | Destroy | Remove unused Docker volumes |
| `settings_clean_stopped_containers` | Destroy | Remove stopped containers |
| `settings_clean_docker_builder` | Destroy | Clean Docker builder cache |
| `settings_clean_docker_prune` | Destroy | Full Docker system prune |
| `settings_clean_all` | Destroy | Nuclear option -- clean everything unused |
| `settings_clean_monitoring` | Destroy | Clear all monitoring history |
| `settings_clean_ssh_private_key` | Destroy | Delete the stored SSH key |

## Admin

Just the one. Handle with care.

| Tool | Type | Description |
|------|------|-------------|
| `admin_setup_monitoring` | Write | Configure monitoring system |

## User

Identity and access management.

| Tool | Type | Description |
|------|------|-------------|
| `user_all` | Read | List all users |
| `user_session` | Read | Get current session info |
| `user_get` | Read | Get current user profile |
| `user_get_permissions` | Read | Get current user permissions |
| `user_have_root_access` | Read | Check if user has root access |
| `user_create_api_key` | Write | Create an API key |
| `user_delete_api_key` | Destroy | Delete an API key |

## Server

Remote server management. Add, configure, and monitor your fleet.

| Tool | Type | Description |
|------|------|-------------|
| `server_all` | Read | List all servers |
| `server_one` | Read | Get server details |
| `server_count` | Read | Get server count |
| `server_with_ssh_key` | Read | List servers with their SSH keys |
| `server_build_servers` | Read | List build servers |
| `server_validate` | Read | Validate server connectivity |
| `server_security` | Read | Get server security info |
| `server_public_ip` | Read | Get server public IP |
| `server_get_server_time` | Read | Get server time |
| `server_get_server_metrics` | Read | Get server metrics (CPU, memory, disk) |
| `server_get_default_command` | Read | Get default server command |
| `server_create` | Write | Register a new server |
| `server_update` | Write | Update server configuration |
| `server_remove` | Destroy | Remove a server |
| `server_setup` | Write | Run initial server setup |
| `server_setup_monitoring` | Write | Configure server monitoring |

## SSH Key

Manage SSH keys used for server connections and Git operations.

| Tool | Type | Description |
|------|------|-------------|
| `ssh_key_all` | Read | List all SSH keys |
| `ssh_key_one` | Read | Get SSH key details |
| `ssh_key_create` | Write | Upload an SSH key |
| `ssh_key_generate` | Write | Generate a new SSH key pair |
| `ssh_key_update` | Write | Update an SSH key |
| `ssh_key_remove` | Destroy | Delete an SSH key |

## Git Provider

Top-level Git provider integrations. Platform-specific tools are in GitHub and GitLab.

| Tool | Type | Description |
|------|------|-------------|
| `git_provider_get_all` | Read | List all Git provider integrations |
| `git_provider_remove` | Destroy | Remove a Git provider integration |

## GitHub

GitHub App integration for repository access and webhooks.

| Tool | Type | Description |
|------|------|-------------|
| `github_one` | Read | Get GitHub provider details |
| `github_github_providers` | Read | List GitHub providers |
| `github_get_github_repositories` | Read | List repositories from GitHub |
| `github_get_github_branches` | Read | List branches for a GitHub repo |
| `github_test_connection` | Write | Test GitHub connection |
| `github_update` | Write | Update GitHub provider config |

## GitLab

GitLab integration for repository access and CI/CD.

| Tool | Type | Description |
|------|------|-------------|
| `gitlab_one` | Read | Get GitLab provider details |
| `gitlab_gitlab_providers` | Read | List GitLab providers |
| `gitlab_get_gitlab_repositories` | Read | List repositories from GitLab |
| `gitlab_get_gitlab_branches` | Read | List branches for a GitLab repo |
| `gitlab_create` | Write | Add a GitLab provider |
| `gitlab_test_connection` | Write | Test GitLab connection |
| `gitlab_update` | Write | Update GitLab provider config |

## Notification

Alert channels -- Slack, Telegram, Discord, email, and more. Same pattern for each: create, update, test, remove.

| Tool | Type | Description |
|------|------|-------------|
| `notification_all` | Read | List all notification channels |
| `notification_one` | Read | Get notification channel details |
| `notification_get_email_providers` | Read | List available email providers |
| `notification_remove` | Destroy | Delete a notification channel |
| `notification_receive_notification` | Write | Trigger a test notification |
| `notification_create_{type}` | Write | Create a channel. Types: `slack`, `telegram`, `discord`, `email`, `custom`, `gotify`, `ntfy`, `pushover`, `resend`, `teams`, `lark` |
| `notification_update_{type}` | Write | Update a channel (same types as create) |
| `notification_test_{type}_connection` | Write | Test a channel connection (same types) |

## Preview Deployment

Ephemeral environments for pull request previews.

| Tool | Type | Description |
|------|------|-------------|
| `preview_deployment_all` | Read | List preview deployments for an application |
| `preview_deployment_one` | Read | Get preview deployment details |
| `preview_deployment_redeploy` | Write | Redeploy a preview |
| `preview_deployment_delete` | Destroy | Delete a preview deployment |

## Schedule

Cron-based scheduled tasks for applications, compose, and servers.

| Tool | Type | Description |
|------|------|-------------|
| `schedule_list` | Read | List schedules for an entity. Params: `id`, `scheduleType` (application/compose/server/dokploy-server) |
| `schedule_one` | Read | Get schedule details |
| `schedule_create` | Write | Create a scheduled task |
| `schedule_update` | Write | Update a scheduled task |
| `schedule_delete` | Destroy | Delete a scheduled task |
| `schedule_run_manually` | Write | Run a scheduled task now |

## Patch

File-level patches for deployed services. Apply custom files without rebuilding.

| Tool | Type | Description |
|------|------|-------------|
| `patch_one` | Read | Get patch details |
| `patch_by_entity_id` | Read | List patches for an entity |
| `patch_read_repo_directories` | Read | Browse patch repo directories |
| `patch_read_repo_file` | Read | Read a file from the patch repo |
| `patch_create` | Write | Create a patch record |
| `patch_update` | Write | Update a patch |
| `patch_toggle_enabled` | Write | Enable or disable a patch |
| `patch_ensure_repo` | Write | Initialize the patch repo |
| `patch_save_file_as_patch` | Write | Save a file as a patch |
| `patch_mark_file_for_deletion` | Write | Mark a file for deletion in next deploy |
| `patch_clean_patch_repos` | Destroy | Clean up patch repositories |
| `patch_delete` | Destroy | Delete a patch |
