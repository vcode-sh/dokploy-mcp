import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const mdbId = z.string().min(1).describe('Unique MariaDB database ID')
const DB = 'mariadb'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `dokploy_${DB}_one`,
  title: 'Get MariaDB Details',
  description:
    'Retrieve the full configuration and status details of a MariaDB database managed by Dokploy. Requires the unique MariaDB database ID. Returns all metadata including name, image, resource limits, environment variables, and current application status.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.one`,
})

const create = postTool({
  name: `dokploy_${DB}_create`,
  title: 'Create MariaDB Database',
  description:
    'Create a new MariaDB database instance inside a Dokploy project. Requires a display name, app-level identifier, database name, user credentials, root password, and the target project ID. Optionally specify a Docker image, description, or remote server. Returns the newly created database record.',
  schema: z
    .object({
      name: z.string().min(1).describe('Display name for the database'),
      appName: z.string().min(1).describe('Unique app-level identifier'),
      databaseName: z.string().min(1).describe('Name of the database to create'),
      databaseUser: z.string().min(1).describe('Database user'),
      databasePassword: z.string().min(1).describe('Database password'),
      databaseRootPassword: z.string().min(1).describe('Root password for MariaDB'),
      projectId: z.string().min(1).describe('Project ID to create the database in'),
      dockerImage: z.string().optional().describe('Docker image (default: mariadb:11)'),
      description: z.string().nullable().optional().describe('Optional description'),
      serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
    })
    .strict(),
  endpoint: `${DB}.create`,
})

const update = postTool({
  name: `dokploy_${DB}_update`,
  title: 'Update MariaDB Database',
  description:
    'Update the configuration of an existing MariaDB database in Dokploy. Requires the MariaDB database ID and accepts optional fields such as name, Docker image, resource limits (memory and CPU), custom start command, environment variables, and external port. Returns the updated database configuration.',
  schema: z
    .object({
      mariadbId: mdbId,
      name: z.string().min(1).optional().describe('Display name'),
      appName: z.string().min(1).optional().describe('App-level identifier'),
      description: z.string().nullable().optional().describe('Description'),
      dockerImage: z.string().optional().describe('Docker image'),
      memoryReservation: z.number().nullable().optional().describe('Memory reservation in MB'),
      memoryLimit: z.number().nullable().optional().describe('Memory limit in MB'),
      cpuReservation: z.number().nullable().optional().describe('CPU reservation'),
      cpuLimit: z.number().nullable().optional().describe('CPU limit'),
      command: z.string().nullable().optional().describe('Custom start command'),
      env: z.string().nullable().optional().describe('Environment variables'),
      externalPort: z.number().nullable().optional().describe('External port'),
    })
    .strict(),
  endpoint: `${DB}.update`,
})

const remove = postTool({
  name: `dokploy_${DB}_remove`,
  title: 'Remove MariaDB Database',
  description:
    'Permanently delete a MariaDB database from Dokploy. Requires the MariaDB database ID. This is a destructive operation that removes the container, all associated data, and configuration. Returns the operation status confirming deletion.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: `dokploy_${DB}_move`,
  title: 'Move MariaDB Database',
  description:
    'Move a MariaDB database from its current project to a different project within Dokploy. Requires the MariaDB database ID and the destination project ID. The database configuration and data remain intact during the move. Returns the operation status.',
  schema: z
    .object({
      mariadbId: mdbId,
      targetProjectId: z.string().min(1).describe('Destination project ID'),
    })
    .strict(),
  endpoint: `${DB}.move`,
})

const deploy = postTool({
  name: `dokploy_${DB}_deploy`,
  title: 'Deploy MariaDB Database',
  description:
    'Deploy a MariaDB database in Dokploy, pulling the configured Docker image and starting the container. Requires the MariaDB database ID. This triggers a full deployment lifecycle including image pull, container creation, and startup. Returns the deployment operation status.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.deploy`,
})

const start = postTool({
  name: `dokploy_${DB}_start`,
  title: 'Start MariaDB Database',
  description:
    'Start a previously stopped MariaDB database container in Dokploy. Requires the MariaDB database ID. The container will resume with its existing data and configuration. Returns the operation status.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.start`,
})

const stop = postTool({
  name: `dokploy_${DB}_stop`,
  title: 'Stop MariaDB Database',
  description:
    'Stop a currently running MariaDB database container in Dokploy. Requires the MariaDB database ID. The container will be gracefully stopped but its data and configuration are preserved for future restarts. Returns the operation status.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
})

const reload = postTool({
  name: `dokploy_${DB}_reload`,
  title: 'Reload MariaDB Database',
  description:
    'Reload the MariaDB database container in Dokploy without performing a full rebuild. Requires the MariaDB database ID and the app-level identifier. This restarts the container with its current configuration. Returns the operation status.',
  schema: z
    .object({
      mariadbId: mdbId,
      appName: z.string().min(1).describe('App-level identifier'),
    })
    .strict(),
  endpoint: `${DB}.reload`,
})

const rebuild = postTool({
  name: `dokploy_${DB}_rebuild`,
  title: 'Rebuild MariaDB Database',
  description:
    'Rebuild the MariaDB database container from scratch in Dokploy. Requires the MariaDB database ID. This tears down the existing container and recreates it using the current configuration, which is useful when the container state has become inconsistent. Returns the operation status.',
  schema: z.object({ mariadbId: mdbId }).strict(),
  endpoint: `${DB}.rebuild`,
})

const changeStatus = postTool({
  name: `dokploy_${DB}_change_status`,
  title: 'Change MariaDB Status',
  description:
    'Manually set the application status of a MariaDB database in Dokploy. Requires the MariaDB database ID and the desired status (idle, running, done, or error). This is typically used for administrative overrides when the reported status does not match reality. Returns the updated status.',
  schema: z
    .object({
      mariadbId: mdbId,
      applicationStatus: z
        .enum(['idle', 'running', 'done', 'error'])
        .describe('New application status'),
    })
    .strict(),
  endpoint: `${DB}.changeStatus`,
})

const saveExternalPort = postTool({
  name: `dokploy_${DB}_save_external_port`,
  title: 'Save MariaDB External Port',
  description:
    'Set or clear the external port mapping for a MariaDB database in Dokploy. Requires the MariaDB database ID and the desired external port number, or null to remove the external port mapping. This controls whether the database is accessible from outside the Docker network. Returns the operation status.',
  schema: z
    .object({
      mariadbId: mdbId,
      externalPort: z.number().nullable().describe('External port number (null to remove)'),
    })
    .strict(),
  endpoint: `${DB}.saveExternalPort`,
})

const saveEnvironment = postTool({
  name: `dokploy_${DB}_save_environment`,
  title: 'Save MariaDB Environment',
  description:
    'Overwrite the environment variables for a MariaDB database in Dokploy. Requires the MariaDB database ID and the environment variables as a string. This replaces all existing environment variables with the provided values. Returns the operation status.',
  schema: z
    .object({
      mariadbId: mdbId,
      env: z.string().nullable().optional().describe('Environment variables as a string'),
    })
    .strict(),
  endpoint: `${DB}.saveEnvironment`,
})

// ── export ───────────────────────────────────────────────────────────
export const mariadbTools: ToolDefinition[] = [
  one,
  create,
  update,
  remove,
  move,
  deploy,
  start,
  stop,
  reload,
  rebuild,
  changeStatus,
  saveExternalPort,
  saveEnvironment,
]
