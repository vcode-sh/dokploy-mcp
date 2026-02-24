import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const rdId = z.string().min(1).describe('Unique Redis database ID')
const DB = 'redis'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `dokploy_${DB}_one`,
  title: 'Get Redis Details',
  description:
    'Retrieve the full configuration and status details of a Redis database managed by Dokploy. Requires the unique Redis database ID. Returns all metadata including name, image, resource limits, environment variables, and current application status.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.one`,
})

const create = postTool({
  name: `dokploy_${DB}_create`,
  title: 'Create Redis Database',
  description:
    'Create a new Redis database instance inside a Dokploy project. Requires a display name, app-level identifier, database password, and the target project ID. Optionally specify a Docker image, description, or remote server. Returns the newly created database record.',
  schema: z.object({
    name: z.string().min(1).describe('Display name for the database'),
    appName: z.string().min(1).describe('Unique app-level identifier'),
    databasePassword: z.string().min(1).describe('Database password'),
    projectId: z.string().min(1).describe('Project ID to create the database in'),
    dockerImage: z.string().optional().describe('Docker image (default: redis:7)'),
    description: z.string().nullable().optional().describe('Optional description'),
    serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
  }),
  endpoint: `${DB}.create`,
})

const update = postTool({
  name: `dokploy_${DB}_update`,
  title: 'Update Redis Database',
  description:
    'Update the configuration of an existing Redis database in Dokploy. Requires the Redis database ID and accepts optional fields such as name, Docker image, resource limits (memory and CPU), custom start command, environment variables, and external port. Returns the updated database configuration.',
  schema: z.object({
    redisId: rdId,
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
  }),
  endpoint: `${DB}.update`,
})

const remove = postTool({
  name: `dokploy_${DB}_remove`,
  title: 'Remove Redis Database',
  description:
    'Permanently delete a Redis database from Dokploy. Requires the Redis database ID. This is a destructive operation that removes the container, all associated data, and configuration. Returns the operation status confirming deletion.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: `dokploy_${DB}_move`,
  title: 'Move Redis Database',
  description:
    'Move a Redis database from its current project to a different project within Dokploy. Requires the Redis database ID and the destination project ID. The database configuration and data remain intact during the move. Returns the operation status.',
  schema: z.object({
    redisId: rdId,
    targetProjectId: z.string().min(1).describe('Destination project ID'),
  }),
  endpoint: `${DB}.move`,
})

const deploy = postTool({
  name: `dokploy_${DB}_deploy`,
  title: 'Deploy Redis Database',
  description:
    'Deploy a Redis database in Dokploy, pulling the configured Docker image and starting the container. Requires the Redis database ID. This triggers a full deployment lifecycle including image pull, container creation, and startup. Returns the deployment operation status.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.deploy`,
})

const start = postTool({
  name: `dokploy_${DB}_start`,
  title: 'Start Redis Database',
  description:
    'Start a previously stopped Redis database container in Dokploy. Requires the Redis database ID. The container will resume with its existing data and configuration. Returns the operation status.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.start`,
})

const stop = postTool({
  name: `dokploy_${DB}_stop`,
  title: 'Stop Redis Database',
  description:
    'Stop a currently running Redis database container in Dokploy. Requires the Redis database ID. The container will be gracefully stopped but its data and configuration are preserved for future restarts. Returns the operation status.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
})

const reload = postTool({
  name: `dokploy_${DB}_reload`,
  title: 'Reload Redis Database',
  description:
    'Reload the Redis database container in Dokploy without performing a full rebuild. Requires the Redis database ID and the app-level identifier. This restarts the container with its current configuration. Returns the operation status.',
  schema: z.object({
    redisId: rdId,
    appName: z.string().min(1).describe('App-level identifier'),
  }),
  endpoint: `${DB}.reload`,
})

const rebuild = postTool({
  name: `dokploy_${DB}_rebuild`,
  title: 'Rebuild Redis Database',
  description:
    'Rebuild the Redis database container from scratch in Dokploy. Requires the Redis database ID. This tears down the existing container and recreates it using the current configuration, which is useful when the container state has become inconsistent. Returns the operation status.',
  schema: z.object({ redisId: rdId }),
  endpoint: `${DB}.rebuild`,
})

const changeStatus = postTool({
  name: `dokploy_${DB}_change_status`,
  title: 'Change Redis Status',
  description:
    'Manually set the application status of a Redis database in Dokploy. Requires the Redis database ID and the desired status (idle, running, done, or error). This is typically used for administrative overrides when the reported status does not match reality. Returns the updated status.',
  schema: z.object({
    redisId: rdId,
    applicationStatus: z
      .enum(['idle', 'running', 'done', 'error'])
      .describe('New application status'),
  }),
  endpoint: `${DB}.changeStatus`,
})

const saveExternalPort = postTool({
  name: `dokploy_${DB}_save_external_port`,
  title: 'Save Redis External Port',
  description:
    'Set or clear the external port mapping for a Redis database in Dokploy. Requires the Redis database ID and the desired external port number, or null to remove the external port mapping. This controls whether the database is accessible from outside the Docker network. Returns the operation status.',
  schema: z.object({
    redisId: rdId,
    externalPort: z.number().nullable().describe('External port number (null to remove)'),
  }),
  endpoint: `${DB}.saveExternalPort`,
})

const saveEnvironment = postTool({
  name: `dokploy_${DB}_save_environment`,
  title: 'Save Redis Environment',
  description:
    'Overwrite the environment variables for a Redis database in Dokploy. Requires the Redis database ID and the environment variables as a string. This replaces all existing environment variables with the provided values. Returns the operation status.',
  schema: z.object({
    redisId: rdId,
    env: z.string().nullable().optional().describe('Environment variables as a string'),
  }),
  endpoint: `${DB}.saveEnvironment`,
})

// ── export ───────────────────────────────────────────────────────────
export const redisTools: ToolDefinition[] = [
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
