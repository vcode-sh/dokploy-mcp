import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const pgId = z.string().min(1).describe('Unique Postgres database ID')
const DB = 'postgres'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `dokploy_${DB}_one`,
  title: 'Get Postgres Details',
  description:
    'Retrieve detailed information about a specific Postgres database managed by Dokploy. Returns the full configuration including connection settings, resource limits, environment variables, and current status. Requires the unique Postgres database ID.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.one`,
})

const create = postTool({
  name: `dokploy_${DB}_create`,
  title: 'Create Postgres Database',
  description:
    'Create a new Postgres database instance inside a Dokploy project. Requires a display name, app-level identifier, database name, user credentials, and the target project ID. Optionally specify a Docker image, description, or remote server. Returns the newly created database record.',
  schema: z
    .object({
      name: z.string().min(1).describe('Display name for the database'),
      appName: z.string().min(1).describe('Unique app-level identifier'),
      databaseName: z.string().min(1).describe('Name of the database to create'),
      databaseUser: z.string().min(1).describe('Database user'),
      databasePassword: z.string().min(1).describe('Database password'),
      projectId: z.string().min(1).describe('Project ID to create the database in'),
      dockerImage: z.string().optional().describe('Docker image (default: postgres:15)'),
      description: z.string().nullable().optional().describe('Optional description'),
      serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
    })
    .strict(),
  endpoint: `${DB}.create`,
})

const update = postTool({
  name: `dokploy_${DB}_update`,
  title: 'Update Postgres Database',
  description:
    'Update the configuration of an existing Postgres database in Dokploy. Supports modifying the display name, Docker image, resource limits (CPU and memory), custom start command, environment variables, and external port. Requires the Postgres database ID. Only the provided fields are updated.',
  schema: z
    .object({
      postgresId: pgId,
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
  title: 'Remove Postgres Database',
  description:
    'Permanently delete a Postgres database from Dokploy. This action removes the database container, its data, and all associated configuration. Requires the Postgres database ID. This operation is destructive and cannot be undone.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: `dokploy_${DB}_move`,
  title: 'Move Postgres Database',
  description:
    'Move a Postgres database from its current project to a different project within Dokploy. Requires the Postgres database ID and the destination project ID. The database configuration and data are preserved during the move.',
  schema: z
    .object({
      postgresId: pgId,
      targetProjectId: z.string().min(1).describe('Destination project ID'),
    })
    .strict(),
  endpoint: `${DB}.move`,
})

const deploy = postTool({
  name: `dokploy_${DB}_deploy`,
  title: 'Deploy Postgres Database',
  description:
    'Deploy a Postgres database container in Dokploy. Triggers the build and start process for the specified database. Requires the Postgres database ID. Returns the deployment status.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.deploy`,
})

const start = postTool({
  name: `dokploy_${DB}_start`,
  title: 'Start Postgres Database',
  description:
    'Start a previously stopped Postgres database container in Dokploy. The database must already be deployed. Requires the Postgres database ID. Returns the updated status after starting.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.start`,
})

const stop = postTool({
  name: `dokploy_${DB}_stop`,
  title: 'Stop Postgres Database',
  description:
    'Stop a running Postgres database container in Dokploy. The database data is preserved but the container will no longer accept connections. Requires the Postgres database ID. This is a destructive action as it interrupts active connections.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
})

const reload = postTool({
  name: `dokploy_${DB}_reload`,
  title: 'Reload Postgres Database',
  description:
    'Reload the Postgres database container in Dokploy without a full restart. Applies configuration changes that do not require a rebuild. Requires the Postgres database ID and the app-level identifier. Returns the reload status.',
  schema: z
    .object({
      postgresId: pgId,
      appName: z.string().min(1).describe('App-level identifier'),
    })
    .strict(),
  endpoint: `${DB}.reload`,
})

const rebuild = postTool({
  name: `dokploy_${DB}_rebuild`,
  title: 'Rebuild Postgres Database',
  description:
    'Rebuild the Postgres database container from scratch in Dokploy. This tears down the existing container and recreates it with the current configuration. Requires the Postgres database ID. Useful after changing the Docker image or when the container is in a broken state.',
  schema: z.object({ postgresId: pgId }).strict(),
  endpoint: `${DB}.rebuild`,
})

const changeStatus = postTool({
  name: `dokploy_${DB}_change_status`,
  title: 'Change Postgres Status',
  description:
    'Manually set the application status of a Postgres database in Dokploy. Accepts one of: idle, running, done, or error. Requires the Postgres database ID and the new status value. Useful for correcting a stale or incorrect status.',
  schema: z
    .object({
      postgresId: pgId,
      applicationStatus: z
        .enum(['idle', 'running', 'done', 'error'])
        .describe('New application status'),
    })
    .strict(),
  endpoint: `${DB}.changeStatus`,
})

const saveExternalPort = postTool({
  name: `dokploy_${DB}_save_external_port`,
  title: 'Save Postgres External Port',
  description:
    'Set or clear the external port mapping for a Postgres database in Dokploy. When set, the database is accessible from outside the Docker network on the specified port. Pass null to remove the external port. Requires the Postgres database ID.',
  schema: z
    .object({
      postgresId: pgId,
      externalPort: z.number().nullable().describe('External port number (null to remove)'),
    })
    .strict(),
  endpoint: `${DB}.saveExternalPort`,
})

const saveEnvironment = postTool({
  name: `dokploy_${DB}_save_environment`,
  title: 'Save Postgres Environment',
  description:
    'Overwrite the environment variables for a Postgres database in Dokploy. Replaces all existing environment variables with the provided value. Pass the variables as a single string (one per line, KEY=VALUE format). Requires the Postgres database ID.',
  schema: z
    .object({
      postgresId: pgId,
      env: z.string().nullable().optional().describe('Environment variables as a string'),
    })
    .strict(),
  endpoint: `${DB}.saveEnvironment`,
})

// ── export ───────────────────────────────────────────────────────────
export const postgresTools: ToolDefinition[] = [
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
