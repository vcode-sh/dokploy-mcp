import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const myId = z.string().min(1).describe('Unique MySQL database ID')
const DB = 'mysql'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `dokploy_${DB}_one`,
  title: 'Get MySQL Details',
  description:
    'Retrieve detailed information about a specific MySQL database managed by Dokploy. Returns the full configuration including connection settings, resource limits, environment variables, and current status. Requires the unique MySQL database ID.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.one`,
})

const create = postTool({
  name: `dokploy_${DB}_create`,
  title: 'Create MySQL Database',
  description:
    'Create a new MySQL database instance inside a Dokploy project. Requires a display name, app-level identifier, database name, user credentials, root password, and the target project ID. Optionally specify a Docker image, description, or remote server. Returns the newly created database record.',
  schema: z.object({
    name: z.string().min(1).describe('Display name for the database'),
    appName: z.string().min(1).describe('Unique app-level identifier'),
    databaseName: z.string().min(1).describe('Name of the database to create'),
    databaseUser: z.string().min(1).describe('Database user'),
    databasePassword: z.string().min(1).describe('Database password'),
    databaseRootPassword: z.string().min(1).describe('Root password for MySQL'),
    projectId: z.string().min(1).describe('Project ID to create the database in'),
    dockerImage: z.string().optional().describe('Docker image (default: mysql:8)'),
    description: z.string().nullable().optional().describe('Optional description'),
    serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
  }),
  endpoint: `${DB}.create`,
})

const update = postTool({
  name: `dokploy_${DB}_update`,
  title: 'Update MySQL Database',
  description:
    'Update the configuration of an existing MySQL database in Dokploy. Supports modifying the display name, Docker image, resource limits (CPU and memory), custom start command, environment variables, and external port. Requires the MySQL database ID. Only the provided fields are updated.',
  schema: z.object({
    mysqlId: myId,
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
  title: 'Remove MySQL Database',
  description:
    'Permanently delete a MySQL database from Dokploy. This action removes the database container, its data, and all associated configuration. Requires the MySQL database ID. This operation is destructive and cannot be undone.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: `dokploy_${DB}_move`,
  title: 'Move MySQL Database',
  description:
    'Move a MySQL database from its current project to a different project within Dokploy. Requires the MySQL database ID and the destination project ID. The database configuration and data are preserved during the move.',
  schema: z.object({
    mysqlId: myId,
    targetProjectId: z.string().min(1).describe('Destination project ID'),
  }),
  endpoint: `${DB}.move`,
})

const deploy = postTool({
  name: `dokploy_${DB}_deploy`,
  title: 'Deploy MySQL Database',
  description:
    'Deploy a MySQL database container in Dokploy. Triggers the build and start process for the specified database. Requires the MySQL database ID. Returns the deployment status.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.deploy`,
})

const start = postTool({
  name: `dokploy_${DB}_start`,
  title: 'Start MySQL Database',
  description:
    'Start a previously stopped MySQL database container in Dokploy. The database must already be deployed. Requires the MySQL database ID. Returns the updated status after starting.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.start`,
})

const stop = postTool({
  name: `dokploy_${DB}_stop`,
  title: 'Stop MySQL Database',
  description:
    'Stop a running MySQL database container in Dokploy. The database data is preserved but the container will no longer accept connections. Requires the MySQL database ID. This is a destructive action as it interrupts active connections.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
})

const reload = postTool({
  name: `dokploy_${DB}_reload`,
  title: 'Reload MySQL Database',
  description:
    'Reload the MySQL database container in Dokploy without a full restart. Applies configuration changes that do not require a rebuild. Requires the MySQL database ID and the app-level identifier. Returns the reload status.',
  schema: z.object({
    mysqlId: myId,
    appName: z.string().min(1).describe('App-level identifier'),
  }),
  endpoint: `${DB}.reload`,
})

const rebuild = postTool({
  name: `dokploy_${DB}_rebuild`,
  title: 'Rebuild MySQL Database',
  description:
    'Rebuild the MySQL database container from scratch in Dokploy. This tears down the existing container and recreates it with the current configuration. Requires the MySQL database ID. Useful after changing the Docker image or when the container is in a broken state.',
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.rebuild`,
})

const changeStatus = postTool({
  name: `dokploy_${DB}_change_status`,
  title: 'Change MySQL Status',
  description:
    'Manually set the application status of a MySQL database in Dokploy. Accepts one of: idle, running, done, or error. Requires the MySQL database ID and the new status value. Useful for correcting a stale or incorrect status.',
  schema: z.object({
    mysqlId: myId,
    applicationStatus: z
      .enum(['idle', 'running', 'done', 'error'])
      .describe('New application status'),
  }),
  endpoint: `${DB}.changeStatus`,
})

const saveExternalPort = postTool({
  name: `dokploy_${DB}_save_external_port`,
  title: 'Save MySQL External Port',
  description:
    'Set or clear the external port mapping for a MySQL database in Dokploy. When set, the database is accessible from outside the Docker network on the specified port. Pass null to remove the external port. Requires the MySQL database ID.',
  schema: z.object({
    mysqlId: myId,
    externalPort: z.number().nullable().describe('External port number (null to remove)'),
  }),
  endpoint: `${DB}.saveExternalPort`,
})

const saveEnvironment = postTool({
  name: `dokploy_${DB}_save_environment`,
  title: 'Save MySQL Environment',
  description:
    'Overwrite the environment variables for a MySQL database in Dokploy. Replaces all existing environment variables with the provided value. Pass the variables as a single string (one per line, KEY=VALUE format). Requires the MySQL database ID.',
  schema: z.object({
    mysqlId: myId,
    env: z.string().nullable().optional().describe('Environment variables as a string'),
  }),
  endpoint: `${DB}.saveEnvironment`,
})

// ── export ───────────────────────────────────────────────────────────
export const mysqlTools: ToolDefinition[] = [
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
