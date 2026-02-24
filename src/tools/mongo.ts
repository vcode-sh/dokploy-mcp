import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const mgId = z.string().min(1).describe('Unique MongoDB database ID')
const DB = 'mongo'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `dokploy_${DB}_one`,
  title: 'Get MongoDB Details',
  description:
    'Retrieve the full configuration and status details of a MongoDB database managed by Dokploy. Requires the unique MongoDB database ID. Returns all metadata including name, image, resource limits, environment variables, and current application status.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.one`,
})

const create = postTool({
  name: `dokploy_${DB}_create`,
  title: 'Create MongoDB Database',
  description:
    'Create a new MongoDB database instance inside a Dokploy project. Requires a display name, app-level identifier, user credentials, and the target project ID. Optionally specify a Docker image, description, or remote server. Returns the newly created database record.',
  schema: z.object({
    name: z.string().min(1).describe('Display name for the database'),
    appName: z.string().min(1).describe('Unique app-level identifier'),
    databaseUser: z.string().min(1).describe('Database user'),
    databasePassword: z.string().min(1).describe('Database password'),
    projectId: z.string().min(1).describe('Project ID to create the database in'),
    dockerImage: z.string().optional().describe('Docker image (default: mongo:6)'),
    description: z.string().nullable().optional().describe('Optional description'),
    serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
  }),
  endpoint: `${DB}.create`,
})

const update = postTool({
  name: `dokploy_${DB}_update`,
  title: 'Update MongoDB Database',
  description:
    'Update the configuration of an existing MongoDB database in Dokploy. Requires the MongoDB database ID and accepts optional fields such as name, Docker image, resource limits (memory and CPU), custom start command, environment variables, and external port. Returns the updated database configuration.',
  schema: z.object({
    mongoId: mgId,
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
  title: 'Remove MongoDB Database',
  description:
    'Permanently delete a MongoDB database from Dokploy. Requires the MongoDB database ID. This is a destructive operation that removes the container, all associated data, and configuration. Returns the operation status confirming deletion.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: `dokploy_${DB}_move`,
  title: 'Move MongoDB Database',
  description:
    'Move a MongoDB database from its current project to a different project within Dokploy. Requires the MongoDB database ID and the destination project ID. The database configuration and data remain intact during the move. Returns the operation status.',
  schema: z.object({
    mongoId: mgId,
    targetProjectId: z.string().min(1).describe('Destination project ID'),
  }),
  endpoint: `${DB}.move`,
})

const deploy = postTool({
  name: `dokploy_${DB}_deploy`,
  title: 'Deploy MongoDB Database',
  description:
    'Deploy a MongoDB database in Dokploy, pulling the configured Docker image and starting the container. Requires the MongoDB database ID. This triggers a full deployment lifecycle including image pull, container creation, and startup. Returns the deployment operation status.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.deploy`,
})

const start = postTool({
  name: `dokploy_${DB}_start`,
  title: 'Start MongoDB Database',
  description:
    'Start a previously stopped MongoDB database container in Dokploy. Requires the MongoDB database ID. The container will resume with its existing data and configuration. Returns the operation status.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.start`,
})

const stop = postTool({
  name: `dokploy_${DB}_stop`,
  title: 'Stop MongoDB Database',
  description:
    'Stop a currently running MongoDB database container in Dokploy. Requires the MongoDB database ID. The container will be gracefully stopped but its data and configuration are preserved for future restarts. Returns the operation status.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
})

const reload = postTool({
  name: `dokploy_${DB}_reload`,
  title: 'Reload MongoDB Database',
  description:
    'Reload the MongoDB database container in Dokploy without performing a full rebuild. Requires the MongoDB database ID and the app-level identifier. This restarts the container with its current configuration. Returns the operation status.',
  schema: z.object({
    mongoId: mgId,
    appName: z.string().min(1).describe('App-level identifier'),
  }),
  endpoint: `${DB}.reload`,
})

const rebuild = postTool({
  name: `dokploy_${DB}_rebuild`,
  title: 'Rebuild MongoDB Database',
  description:
    'Rebuild the MongoDB database container from scratch in Dokploy. Requires the MongoDB database ID. This tears down the existing container and recreates it using the current configuration, which is useful when the container state has become inconsistent. Returns the operation status.',
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.rebuild`,
})

const changeStatus = postTool({
  name: `dokploy_${DB}_change_status`,
  title: 'Change MongoDB Status',
  description:
    'Manually set the application status of a MongoDB database in Dokploy. Requires the MongoDB database ID and the desired status (idle, running, done, or error). This is typically used for administrative overrides when the reported status does not match reality. Returns the updated status.',
  schema: z.object({
    mongoId: mgId,
    applicationStatus: z
      .enum(['idle', 'running', 'done', 'error'])
      .describe('New application status'),
  }),
  endpoint: `${DB}.changeStatus`,
})

const saveExternalPort = postTool({
  name: `dokploy_${DB}_save_external_port`,
  title: 'Save MongoDB External Port',
  description:
    'Set or clear the external port mapping for a MongoDB database in Dokploy. Requires the MongoDB database ID and the desired external port number, or null to remove the external port mapping. This controls whether the database is accessible from outside the Docker network. Returns the operation status.',
  schema: z.object({
    mongoId: mgId,
    externalPort: z.number().nullable().describe('External port number (null to remove)'),
  }),
  endpoint: `${DB}.saveExternalPort`,
})

const saveEnvironment = postTool({
  name: `dokploy_${DB}_save_environment`,
  title: 'Save MongoDB Environment',
  description:
    'Overwrite the environment variables for a MongoDB database in Dokploy. Requires the MongoDB database ID and the environment variables as a string. This replaces all existing environment variables with the provided values. Returns the operation status.',
  schema: z.object({
    mongoId: mgId,
    env: z.string().nullable().optional().describe('Environment variables as a string'),
  }),
  endpoint: `${DB}.saveEnvironment`,
})

// ── export ───────────────────────────────────────────────────────────
export const mongoTools: ToolDefinition[] = [
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
