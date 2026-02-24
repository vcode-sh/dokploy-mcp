# @vibetools/dokploy-mcp

MCP server for the Dokploy API.

[![npm version](https://img.shields.io/npm/v/@vibetools/dokploy-mcp)](https://www.npmjs.com/package/@vibetools/dokploy-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node >= 22](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)

## Overview

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that provides complete coverage of the Dokploy API. With 224 tools across 24 modules, it enables LLMs to manage Dokploy infrastructure through natural language -- deploying applications, managing databases, configuring domains, handling backups, and more.

## Features

- **Complete API coverage** across all 24 Dokploy modules (224 tools)
- **Interactive setup wizard** -- run `npx @vibetools/dokploy-mcp setup` and start using it in seconds
- **Auto-config detection** -- picks up credentials from env vars, config file, or Dokploy CLI
- **Type-safe schemas** with Zod v4 validation on every parameter
- **Tool annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`) so clients can warn before destructive operations
- **Lazy configuration loading** -- environment variables are validated on first API call, not at startup
- **Comprehensive error handling** with actionable messages mapped from HTTP status codes
- **Minimal dependencies** -- only `@modelcontextprotocol/sdk`, `zod`, and `@clack/prompts`

## Installation

```bash
npm install @vibetools/dokploy-mcp
```

Or run directly:

```bash
npx @vibetools/dokploy-mcp
```

## Quick Start

```bash
npx @vibetools/dokploy-mcp setup
```

The setup wizard will:
1. Prompt for your Dokploy server URL and API key
2. Validate the credentials
3. Save configuration to `~/.config/dokploy-mcp/config.json`
4. Show the MCP client config to add

After setup, add this minimal config to your MCP client:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"]
    }
  }
}
```

No environment variables needed -- credentials are loaded from the saved config file.

## Configuration Resolution

Credentials are resolved in this order (first match wins):

1. **Environment variables** -- `DOKPLOY_URL` and `DOKPLOY_API_KEY`
2. **Config file** -- `~/.config/dokploy-mcp/config.json` (created by `setup`)
3. **Dokploy CLI** -- Auto-detected from globally installed `@dokploy/cli`

If you have the [Dokploy CLI](https://github.com/Dokploy/cli) installed and authenticated, the MCP server will automatically use those credentials with zero configuration.

## Alternative: Manual Configuration

For CI/CD pipelines or when you prefer environment variables over the config file, you can set credentials directly. Environment variables always take priority over the config file.

| Variable | Required | Description | Default |
|---|---|---|---|
| `DOKPLOY_URL` | Yes | Dokploy panel URL (e.g., `https://panel.example.com`) — automatically normalized | -- |
| `DOKPLOY_API_KEY` | Yes | API key from Dokploy Settings > API | -- |
| `DOKPLOY_TIMEOUT` | No | Request timeout in milliseconds | `30000` |

## CLI Commands

| Command | Description |
|---|---|
| `npx @vibetools/dokploy-mcp` | Start MCP server (stdio transport) |
| `npx @vibetools/dokploy-mcp setup` | Interactive setup wizard |
| `npx @vibetools/dokploy-mcp version` | Show version |

Aliases: `init` and `auth` are aliases for `setup`.

## Usage with MCP Clients

### Claude Desktop

Add the following to your Claude Desktop configuration file (`claude_desktop_config.json`):

**With setup (recommended):**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"]
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

Add the following to your `.mcp.json` configuration file:

**With setup (recommended):**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"]
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or `.cursor/mcp.json` in your project:

**With setup (recommended):**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"]
    }
  }
}
```

**With environment variables:**

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

**With setup (recommended):**

```json
{
  "servers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"]
    }
  }
}
```

**With environment variables:**

```json
{
  "servers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Local Development

```bash
git clone <this-repo>
npm install
npm run build
```

Then point your MCP client at the local build:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "node",
      "args": ["/path/to/dokploy-mcp/dist/index.js"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Getting Your API Key

1. Open your Dokploy dashboard
2. Go to Settings > Profile > API/CLI section
3. Generate a token
4. Use it as the `DOKPLOY_API_KEY` environment variable

## Tool Reference

All 224 tools are organized into 24 modules. Each table below shows the tool name, a brief description, and whether the tool is read-only or mutating/destructive.

For the complete reference with full descriptions and parameter details, see [docs/TOOLS.md](docs/TOOLS.md).

### Project (6 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_project_all` | List all projects | Read-only |
| `dokploy_project_one` | Get project details by ID | Read-only |
| `dokploy_project_create` | Create a new project | Mutating |
| `dokploy_project_update` | Update an existing project | Mutating |
| `dokploy_project_duplicate` | Duplicate a project with its services | Mutating |
| `dokploy_project_remove` | Remove a project and all its resources | Destructive |

### Application (25 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_application_create` | Create a new application in a project | Mutating |
| `dokploy_application_one` | Get application details by ID | Read-only |
| `dokploy_application_update` | Update application configuration | Mutating |
| `dokploy_application_delete` | Delete an application permanently | Destructive |
| `dokploy_application_move` | Move application to another project | Mutating |
| `dokploy_application_deploy` | Trigger a new deployment | Mutating |
| `dokploy_application_redeploy` | Force a full redeploy from source | Mutating |
| `dokploy_application_start` | Start a stopped application | Mutating |
| `dokploy_application_stop` | Stop a running application | Destructive |
| `dokploy_application_cancel_deployment` | Cancel an in-progress deployment | Mutating |
| `dokploy_application_reload` | Reload application containers | Mutating |
| `dokploy_application_mark_running` | Manually mark application as running | Mutating |
| `dokploy_application_clean_queues` | Clean pending deployment queues | Mutating |
| `dokploy_application_refresh_token` | Refresh the webhook token | Mutating |
| `dokploy_application_save_build_type` | Set build type and settings | Mutating |
| `dokploy_application_save_environment` | Save environment variables and build args | Mutating |
| `dokploy_application_save_github_provider` | Configure GitHub as source | Mutating |
| `dokploy_application_save_gitlab_provider` | Configure GitLab as source | Mutating |
| `dokploy_application_save_bitbucket_provider` | Configure Bitbucket as source | Mutating |
| `dokploy_application_save_gitea_provider` | Configure Gitea as source | Mutating |
| `dokploy_application_save_git_provider` | Configure custom Git repo as source | Mutating |
| `dokploy_application_save_docker_provider` | Configure Docker image as source | Mutating |
| `dokploy_application_disconnect_git_provider` | Disconnect the current Git provider | Mutating |
| `dokploy_application_read_app_monitoring` | Read application monitoring metrics | Read-only |
| `dokploy_application_read_traefik_config` | Read Traefik config for an application | Read-only |
| `dokploy_application_update_traefik_config` | Update Traefik config for an application | Mutating |

### Compose (17 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_compose_create` | Create a new Docker Compose service | Mutating |
| `dokploy_compose_one` | Get compose service details by ID | Read-only |
| `dokploy_compose_update` | Update compose service configuration | Mutating |
| `dokploy_compose_delete` | Delete a compose service permanently | Destructive |
| `dokploy_compose_deploy` | Deploy a compose service | Mutating |
| `dokploy_compose_redeploy` | Redeploy a compose service | Mutating |
| `dokploy_compose_stop` | Stop all containers in a compose service | Destructive |
| `dokploy_compose_clean_queues` | Clean pending deployment queues | Mutating |
| `dokploy_compose_all_services` | List individual services in a compose stack | Read-only |
| `dokploy_compose_randomize` | Randomize service names to avoid conflicts | Mutating |
| `dokploy_compose_get_default_command` | Get the default deployment command | Read-only |
| `dokploy_compose_generate_ssh_key` | Generate SSH key pair for Git access | Mutating |
| `dokploy_compose_refresh_token` | Refresh the webhook token | Mutating |
| `dokploy_compose_remove_ssh_key` | Remove the SSH key | Mutating |
| `dokploy_compose_deploy_template` | Deploy from a predefined template | Mutating |
| `dokploy_compose_templates` | List available compose templates | Read-only |
| `dokploy_compose_save_environment` | Save environment variables and build args | Mutating |

### Domain (9 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_domain_create` | Create a new domain configuration | Mutating |
| `dokploy_domain_one` | Get domain details by ID | Read-only |
| `dokploy_domain_by_application_id` | List domains for an application | Read-only |
| `dokploy_domain_by_compose_id` | List domains for a compose service | Read-only |
| `dokploy_domain_update` | Update a domain configuration | Mutating |
| `dokploy_domain_delete` | Delete a domain permanently | Destructive |
| `dokploy_domain_validate` | Validate domain DNS records | Mutating |
| `dokploy_domain_generate` | Generate a default domain for an app | Mutating |
| `dokploy_domain_generate_wildcard` | Generate a wildcard domain for an app | Mutating |

### PostgreSQL (13 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_postgres_one` | Get Postgres database details | Read-only |
| `dokploy_postgres_create` | Create a new Postgres database | Mutating |
| `dokploy_postgres_update` | Update Postgres configuration | Mutating |
| `dokploy_postgres_remove` | Remove a Postgres database | Destructive |
| `dokploy_postgres_move` | Move database to another project | Mutating |
| `dokploy_postgres_deploy` | Deploy the database container | Mutating |
| `dokploy_postgres_start` | Start a stopped database | Mutating |
| `dokploy_postgres_stop` | Stop a running database | Destructive |
| `dokploy_postgres_reload` | Reload the database container | Mutating |
| `dokploy_postgres_rebuild` | Rebuild the database from scratch | Mutating |
| `dokploy_postgres_change_status` | Manually set application status | Mutating |
| `dokploy_postgres_save_external_port` | Set or clear the external port | Mutating |
| `dokploy_postgres_save_environment` | Save environment variables | Mutating |

### MySQL (13 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_mysql_one` | Get MySQL database details | Read-only |
| `dokploy_mysql_create` | Create a new MySQL database | Mutating |
| `dokploy_mysql_update` | Update MySQL configuration | Mutating |
| `dokploy_mysql_remove` | Remove a MySQL database | Destructive |
| `dokploy_mysql_move` | Move database to another project | Mutating |
| `dokploy_mysql_deploy` | Deploy the database container | Mutating |
| `dokploy_mysql_start` | Start a stopped database | Mutating |
| `dokploy_mysql_stop` | Stop a running database | Destructive |
| `dokploy_mysql_reload` | Reload the database container | Mutating |
| `dokploy_mysql_rebuild` | Rebuild the database from scratch | Mutating |
| `dokploy_mysql_change_status` | Manually set application status | Mutating |
| `dokploy_mysql_save_external_port` | Set or clear the external port | Mutating |
| `dokploy_mysql_save_environment` | Save environment variables | Mutating |

### MariaDB (13 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_mariadb_one` | Get MariaDB database details | Read-only |
| `dokploy_mariadb_create` | Create a new MariaDB database | Mutating |
| `dokploy_mariadb_update` | Update MariaDB configuration | Mutating |
| `dokploy_mariadb_remove` | Remove a MariaDB database | Destructive |
| `dokploy_mariadb_move` | Move database to another project | Mutating |
| `dokploy_mariadb_deploy` | Deploy the database container | Mutating |
| `dokploy_mariadb_start` | Start a stopped database | Mutating |
| `dokploy_mariadb_stop` | Stop a running database | Destructive |
| `dokploy_mariadb_reload` | Reload the database container | Mutating |
| `dokploy_mariadb_rebuild` | Rebuild the database from scratch | Mutating |
| `dokploy_mariadb_change_status` | Manually set application status | Mutating |
| `dokploy_mariadb_save_external_port` | Set or clear the external port | Mutating |
| `dokploy_mariadb_save_environment` | Save environment variables | Mutating |

### MongoDB (13 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_mongo_one` | Get MongoDB database details | Read-only |
| `dokploy_mongo_create` | Create a new MongoDB database | Mutating |
| `dokploy_mongo_update` | Update MongoDB configuration | Mutating |
| `dokploy_mongo_remove` | Remove a MongoDB database | Destructive |
| `dokploy_mongo_move` | Move database to another project | Mutating |
| `dokploy_mongo_deploy` | Deploy the database container | Mutating |
| `dokploy_mongo_start` | Start a stopped database | Mutating |
| `dokploy_mongo_stop` | Stop a running database | Destructive |
| `dokploy_mongo_reload` | Reload the database container | Mutating |
| `dokploy_mongo_rebuild` | Rebuild the database from scratch | Mutating |
| `dokploy_mongo_change_status` | Manually set application status | Mutating |
| `dokploy_mongo_save_external_port` | Set or clear the external port | Mutating |
| `dokploy_mongo_save_environment` | Save environment variables | Mutating |

### Redis (13 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_redis_one` | Get Redis database details | Read-only |
| `dokploy_redis_create` | Create a new Redis database | Mutating |
| `dokploy_redis_update` | Update Redis configuration | Mutating |
| `dokploy_redis_remove` | Remove a Redis database | Destructive |
| `dokploy_redis_move` | Move database to another project | Mutating |
| `dokploy_redis_deploy` | Deploy the database container | Mutating |
| `dokploy_redis_start` | Start a stopped database | Mutating |
| `dokploy_redis_stop` | Stop a running database | Destructive |
| `dokploy_redis_reload` | Reload the database container | Mutating |
| `dokploy_redis_rebuild` | Rebuild the database from scratch | Mutating |
| `dokploy_redis_change_status` | Manually set application status | Mutating |
| `dokploy_redis_save_external_port` | Set or clear the external port | Mutating |
| `dokploy_redis_save_environment` | Save environment variables | Mutating |

### Deployment (2 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_deployment_all` | List all deployments for an application | Read-only |
| `dokploy_deployment_all_by_compose` | List all deployments for a compose service | Read-only |

### Docker (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_docker_get_containers` | List all Docker containers on the server | Read-only |
| `dokploy_docker_get_config` | Get full config of a container by ID | Read-only |
| `dokploy_docker_get_containers_by_app_name_match` | Find containers by app name substring | Read-only |
| `dokploy_docker_get_containers_by_app_label` | Find containers by app label | Read-only |

### Certificates (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_certificate_all` | List all SSL/TLS certificates | Read-only |
| `dokploy_certificate_one` | Get certificate details by ID | Read-only |
| `dokploy_certificate_create` | Create a new certificate | Mutating |
| `dokploy_certificate_remove` | Remove a certificate | Destructive |

### Registry (7 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_registry_all` | List all container registries | Read-only |
| `dokploy_registry_one` | Get registry details by ID | Read-only |
| `dokploy_registry_create` | Create a new registry configuration | Mutating |
| `dokploy_registry_update` | Update a registry configuration | Mutating |
| `dokploy_registry_remove` | Remove a registry configuration | Destructive |
| `dokploy_registry_test` | Test registry connection | Mutating |
| `dokploy_registry_enable_self_hosted` | Enable the built-in self-hosted registry | Mutating |

### Destination (6 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_destination_all` | List all S3 backup destinations | Read-only |
| `dokploy_destination_one` | Get destination details by ID | Read-only |
| `dokploy_destination_create` | Create a new S3 backup destination | Mutating |
| `dokploy_destination_update` | Update a backup destination | Mutating |
| `dokploy_destination_remove` | Remove a backup destination | Destructive |
| `dokploy_destination_test_connection` | Test S3 destination connection | Mutating |

### Backup (8 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_backup_one` | Get backup configuration details | Read-only |
| `dokploy_backup_create` | Create a scheduled backup | Mutating |
| `dokploy_backup_update` | Update a backup schedule | Mutating |
| `dokploy_backup_remove` | Remove a backup schedule | Destructive |
| `dokploy_backup_manual_postgres` | Trigger manual Postgres backup | Mutating |
| `dokploy_backup_manual_mysql` | Trigger manual MySQL backup | Mutating |
| `dokploy_backup_manual_mariadb` | Trigger manual MariaDB backup | Mutating |
| `dokploy_backup_manual_mongo` | Trigger manual MongoDB backup | Mutating |

### Mounts (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_mount_one` | Get mount configuration details | Read-only |
| `dokploy_mount_create` | Create a new mount (bind, volume, or file) | Mutating |
| `dokploy_mount_update` | Update a mount configuration | Mutating |
| `dokploy_mount_remove` | Remove a mount | Destructive |

### Port (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_port_one` | Get port mapping details | Read-only |
| `dokploy_port_create` | Create a new port mapping | Mutating |
| `dokploy_port_update` | Update a port mapping | Mutating |
| `dokploy_port_delete` | Delete a port mapping | Destructive |

### Redirects (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_redirect_one` | Get redirect rule details | Read-only |
| `dokploy_redirect_create` | Create a new redirect rule | Mutating |
| `dokploy_redirect_update` | Update a redirect rule | Mutating |
| `dokploy_redirect_delete` | Delete a redirect rule | Destructive |

### Security (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_security_one` | Get HTTP basic-auth entry details | Read-only |
| `dokploy_security_create` | Create HTTP basic-auth protection | Mutating |
| `dokploy_security_update` | Update basic-auth credentials | Mutating |
| `dokploy_security_delete` | Delete basic-auth protection | Destructive |

### Cluster (4 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_cluster_get_nodes` | List all Docker Swarm cluster nodes | Read-only |
| `dokploy_cluster_add_worker` | Get the command to add a worker node | Read-only |
| `dokploy_cluster_add_manager` | Get the command to add a manager node | Read-only |
| `dokploy_cluster_remove_worker` | Remove a worker node from the cluster | Destructive |

### Settings (23 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_settings_reload_server` | Reload the Dokploy server process | Mutating |
| `dokploy_settings_reload_traefik` | Reload the Traefik reverse proxy | Mutating |
| `dokploy_settings_clean_unused_images` | Remove unused Docker images | Mutating |
| `dokploy_settings_clean_unused_volumes` | Remove unused Docker volumes | Destructive |
| `dokploy_settings_clean_stopped_containers` | Remove all stopped containers | Destructive |
| `dokploy_settings_clean_docker_builder` | Clean Docker builder cache | Mutating |
| `dokploy_settings_clean_docker_prune` | Full Docker system prune | Destructive |
| `dokploy_settings_clean_all` | Clean all unused Docker resources | Destructive |
| `dokploy_settings_clean_monitoring` | Clear all monitoring data | Destructive |
| `dokploy_settings_save_ssh_private_key` | Save SSH private key for remote access | Mutating |
| `dokploy_settings_clean_ssh_private_key` | Remove stored SSH private key | Destructive |
| `dokploy_settings_assign_domain_server` | Assign domain to the server with SSL | Mutating |
| `dokploy_settings_update_docker_cleanup` | Configure automatic Docker cleanup | Mutating |
| `dokploy_settings_read_traefik_config` | Read the main Traefik config | Read-only |
| `dokploy_settings_update_traefik_config` | Update the main Traefik config | Mutating |
| `dokploy_settings_read_web_server_traefik_config` | Read web server Traefik config | Read-only |
| `dokploy_settings_update_web_server_traefik_config` | Update web server Traefik config | Mutating |
| `dokploy_settings_read_middleware_traefik_config` | Read Traefik middleware config | Read-only |
| `dokploy_settings_update_middleware_traefik_config` | Update Traefik middleware config | Mutating |
| `dokploy_settings_check_and_update_image` | Check for and apply image updates | Mutating |
| `dokploy_settings_update_server` | Update Dokploy to latest version | Mutating |
| `dokploy_settings_get_version` | Get current Dokploy version | Read-only |
| `dokploy_settings_read_directories` | Read server directory listing | Read-only |
| `dokploy_settings_get_openapi_document` | Get the OpenAPI specification | Read-only |

### Auth (14 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_auth_create_admin` | Create the initial admin account | Mutating |
| `dokploy_auth_create_user` | Create a user from invitation token | Mutating |
| `dokploy_auth_login` | Log in with email and password | Mutating |
| `dokploy_auth_get` | Get current authenticated user profile | Read-only |
| `dokploy_auth_logout` | Log out and invalidate session | Mutating |
| `dokploy_auth_update` | Update current user profile | Mutating |
| `dokploy_auth_generate_token` | Generate a new API token | Mutating |
| `dokploy_auth_one` | Get user auth info by ID | Read-only |
| `dokploy_auth_update_by_admin` | Update any user with admin privileges | Mutating |
| `dokploy_auth_generate_2fa_secret` | Generate 2FA secret and QR code | Read-only |
| `dokploy_auth_verify_2fa_setup` | Verify and enable 2FA | Mutating |
| `dokploy_auth_verify_login_2fa` | Verify 2FA PIN during login | Mutating |
| `dokploy_auth_disable_2fa` | Disable two-factor authentication | Mutating |
| `dokploy_auth_verify_token` | Verify auth token validity | Mutating |

### Admin (9 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_admin_one` | Get admin profile and configuration | Read-only |
| `dokploy_admin_create_user_invitation` | Send user invitation email | Mutating |
| `dokploy_admin_remove_user` | Remove a user permanently | Destructive |
| `dokploy_admin_get_user_by_token` | Look up user by invitation token | Read-only |
| `dokploy_admin_assign_permissions` | Assign granular permissions to a user | Mutating |
| `dokploy_admin_clean_github_app` | Remove GitHub App integration | Mutating |
| `dokploy_admin_get_repositories` | List GitHub App repositories | Read-only |
| `dokploy_admin_get_branches` | List branches for a GitHub repo | Read-only |
| `dokploy_admin_have_github_configured` | Check if GitHub App is configured | Read-only |

### User (3 tools)

| Tool | Description | Type |
|---|---|---|
| `dokploy_user_all` | List all registered users | Read-only |
| `dokploy_user_by_auth_id` | Get user by authentication ID | Read-only |
| `dokploy_user_by_user_id` | Get user by user ID | Read-only |

## Architecture

```
src/
  index.ts              - Entry point, routes CLI vs MCP server
  server.ts             - MCP server creation, tool registration
  api/client.ts         - Fetch-based API client with config resolver
  config/types.ts       - Config types and platform paths
  config/resolver.ts    - Config resolution chain (env -> file -> CLI)
  cli/index.ts          - CLI command router
  cli/setup.ts          - Interactive setup wizard (@clack/prompts TUI)
  tools/_factory.ts     - Tool creation helpers (createTool, postTool, getTool)
  tools/index.ts        - Aggregates all tool module exports
  tools/{module}.ts     - 24 domain modules (224 tools total)
```

**Key patterns:**

- `postTool()` creates tools that call POST endpoints (mutations)
- `getTool()` creates tools that call GET endpoints (reads), automatically annotated with `readOnlyHint` and `idempotentHint`
- `createTool()` is the low-level factory for tools with custom handler logic
- The API client uses native `fetch` with config resolution: env vars -> config file -> Dokploy CLI
- Authentication is via `x-api-key` header on every request
- All tool schemas use Zod v4 with `.describe()` on all parameters
- Error handling maps HTTP status codes (401, 403, 404, 422) to user-friendly messages
- CLI setup uses `@clack/prompts` for a modern terminal UI

## Development

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode with auto-recompile
npm run typecheck  # Type-check without emitting files
npm run lint       # Lint with Biome
npm run lint:fix   # Auto-fix lint issues
npm run format     # Format with Biome
npm start          # Run the built server
```

### Testing

Use the MCP Inspector to test tools interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Pass environment variables via the inspector UI or prefix the command:

```bash
DOKPLOY_URL=https://panel.example.com DOKPLOY_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

## Adding a New Tool

1. Find the module file in `src/tools/` (e.g., `application.ts`)
2. Add a `postTool()` or `getTool()` call with `name`, `title`, `description`, `schema`, and `endpoint`
3. Use `.describe()` on all Zod schema parameters
4. Set `annotations: { destructiveHint: true }` for destructive operations
5. Add the tool to the module's exported array
6. Run `npm run build`

Example:

```typescript
const myTool = postTool({
  name: 'dokploy_application_my_action',
  title: 'My Action',
  description: 'Description of what this tool does.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }),
  endpoint: '/application.myAction',
  annotations: { destructiveHint: true }, // if applicable
})
```

## License

MIT
