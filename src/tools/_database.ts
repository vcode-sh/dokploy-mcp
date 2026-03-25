import { z } from 'zod'

import { getTool, postTool, type ToolAnnotations, type ToolDefinition } from './_factory.js'

type AnyZodObject = z.ZodObject

export interface DatabaseConfig {
  type: string
  idField: string
  displayName: string
  defaultImage: string
  createFields: AnyZodObject
}

export function createDatabaseTools(config: DatabaseConfig): ToolDefinition[] {
  const { type, idField, displayName, defaultImage, createFields } = config
  const idSchema = z
    .object({ [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`) })
    .strict()

  function tool(
    action: string,
    title: string,
    description: string,
    schema: AnyZodObject,
    opts: { get?: boolean; annotations?: Partial<ToolAnnotations> } = {},
  ): ToolDefinition {
    const endpoint = `/${type}.${action}`
    const name = `dokploy_${type}_${action.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`
    if (opts.get) {
      return getTool({ name, title, description, schema, endpoint, annotations: opts.annotations })
    }
    return postTool({ name, title, description, schema, endpoint, annotations: opts.annotations })
  }

  const one = tool(
    'one',
    `Get ${displayName} Details`,
    `Retrieve detailed information about a specific ${displayName} database managed by Dokploy. Returns the full configuration including connection settings, resource limits, environment variables, and current status. Requires the unique ${displayName} database ID.`,
    idSchema,
    { get: true },
  )

  const create = tool(
    'create',
    `Create ${displayName} Database`,
    `Create a new ${displayName} database instance inside a Dokploy environment. Requires a display name and the target environment ID. Optionally specify an app-level identifier, Docker image, description, or remote server. Returns the newly created database record.`,
    z
      .object({
        name: z.string().min(1).describe('Display name for the database'),
        appName: z
          .string()
          .min(1)
          .max(63)
          .regex(/^[a-zA-Z0-9._-]+$/)
          .optional()
          .describe('Unique app-level identifier'),
        ...createFields.shape,
        environmentId: z.string().min(1).describe('Environment ID to create the database in'),
        dockerImage: z.string().optional().describe(`Docker image (default: ${defaultImage})`),
        description: z.string().nullable().optional().describe('Optional description'),
        serverId: z.string().nullable().optional().describe('Target server ID (null for local)'),
      })
      .strict(),
  )

  const update = tool(
    'update',
    `Update ${displayName} Database`,
    `Update the configuration of an existing ${displayName} database in Dokploy. Supports modifying the display name, Docker image, resource limits (CPU and memory), custom start command, environment variables, and external port. Requires the ${displayName} database ID. Only the provided fields are updated.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
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
  )

  const remove = tool(
    'remove',
    `Remove ${displayName} Database`,
    `Permanently delete a ${displayName} database from Dokploy. This action removes the database container, its data, and all associated configuration. Requires the ${displayName} database ID. This operation is destructive and cannot be undone.`,
    idSchema,
    { annotations: { destructiveHint: true } },
  )

  const move = tool(
    'move',
    `Move ${displayName} Database`,
    `Move a ${displayName} database from its current environment to a different environment within Dokploy. Requires the ${displayName} database ID and the destination environment ID. The database configuration and data are preserved during the move.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
        targetEnvironmentId: z.string().min(1).describe('Destination environment ID'),
      })
      .strict(),
  )

  const deploy = tool(
    'deploy',
    `Deploy ${displayName} Database`,
    `Deploy a ${displayName} database container in Dokploy. Triggers the build and start process for the specified database. Requires the ${displayName} database ID. Returns the deployment status.`,
    idSchema,
  )

  const start = tool(
    'start',
    `Start ${displayName} Database`,
    `Start a previously stopped ${displayName} database container in Dokploy. The database must already be deployed. Requires the ${displayName} database ID. Returns the updated status after starting.`,
    idSchema,
  )

  const stop = tool(
    'stop',
    `Stop ${displayName} Database`,
    `Stop a running ${displayName} database container in Dokploy. The database data is preserved but the container will no longer accept connections. Requires the ${displayName} database ID. This is a destructive action as it interrupts active connections.`,
    idSchema,
    { annotations: { destructiveHint: true } },
  )

  const reload = tool(
    'reload',
    `Reload ${displayName} Database`,
    `Reload the ${displayName} database container in Dokploy without a full restart. Applies configuration changes that do not require a rebuild. Requires the ${displayName} database ID and the app-level identifier. Returns the reload status.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
        appName: z.string().min(1).describe('App-level identifier'),
      })
      .strict(),
  )

  const rebuild = tool(
    'rebuild',
    `Rebuild ${displayName} Database`,
    `Rebuild the ${displayName} database container from scratch in Dokploy. This tears down the existing container and recreates it with the current configuration. Requires the ${displayName} database ID. Useful after changing the Docker image or when the container is in a broken state.`,
    idSchema,
  )

  const changeStatus = tool(
    'changeStatus',
    `Change ${displayName} Status`,
    `Manually set the application status of a ${displayName} database in Dokploy. Accepts one of: idle, running, done, or error. Requires the ${displayName} database ID and the new status value. Useful for correcting a stale or incorrect status.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
        applicationStatus: z
          .enum(['idle', 'running', 'done', 'error'])
          .describe('New application status'),
      })
      .strict(),
  )

  const saveExternalPort = tool(
    'saveExternalPort',
    `Save ${displayName} External Port`,
    `Set or clear the external port mapping for a ${displayName} database in Dokploy. When set, the database is accessible from outside the Docker network on the specified port. Pass null to remove the external port. Requires the ${displayName} database ID.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
        externalPort: z.number().nullable().describe('External port number (null to remove)'),
      })
      .strict(),
  )

  const saveEnvironment = tool(
    'saveEnvironment',
    `Save ${displayName} Environment`,
    `Overwrite the environment variables for a ${displayName} database in Dokploy. Replaces all existing environment variables with the provided value. Pass the variables as a single string (one per line, KEY=VALUE format). Requires the ${displayName} database ID.`,
    z
      .object({
        [idField]: z.string().min(1).describe(`Unique ${displayName} database ID`),
        env: z.string().nullable().optional().describe('Environment variables as a string'),
      })
      .strict(),
  )

  const search = tool(
    'search',
    `Search ${displayName} Databases`,
    `Search ${displayName} databases in Dokploy by free text or field-specific filters. Supports pagination through limit and offset.`,
    z
      .object({
        q: z.string().optional().describe('Free-text query'),
        name: z.string().optional().describe('Display name'),
        appName: z.string().optional().describe('App-level identifier'),
        description: z.string().optional().describe('Description'),
        projectId: z.string().optional().describe('Project ID'),
        environmentId: z.string().optional().describe('Environment ID'),
        limit: z.number().min(1).max(100).optional().describe('Maximum number of results'),
        offset: z.number().min(0).optional().describe('Number of results to skip'),
      })
      .strict(),
    { get: true },
  )

  return [
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
    search,
  ]
}
