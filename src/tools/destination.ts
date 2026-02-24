import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const destinationBaseSchema = {
  name: z.string().min(1).describe('Name for the S3 destination'),
  accessKey: z.string().min(1).describe('S3 access key'),
  bucket: z.string().min(1).describe('S3 bucket name'),
  region: z.string().min(1).describe('S3 region'),
  endpoint: z.string().min(1).describe('S3 endpoint URL'),
  secretAccessKey: z.string().min(1).describe('S3 secret access key'),
}

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_destination_all',
  title: 'List Backup Destinations',
  description:
    'List all S3-compatible backup destinations configured in Dokploy. Takes no parameters. Returns an array of destination objects including their IDs, names, bucket configurations, and connection details.',
  schema: z.object({}).strict(),
  endpoint: '/destination.all',
})

const one = getTool({
  name: 'dokploy_destination_one',
  title: 'Get Backup Destination',
  description:
    'Retrieve the full configuration of a specific backup destination by its unique ID. Requires the destinationId parameter. Returns the destination object with name, S3 bucket, region, endpoint, and credential details.',
  schema: z
    .object({
      destinationId: z.string().min(1).describe('Unique destination ID'),
    })
    .strict(),
  endpoint: '/destination.one',
})

const create = postTool({
  name: 'dokploy_destination_create',
  title: 'Create Backup Destination',
  description:
    'Create a new S3-compatible backup destination in Dokploy. Requires the destination name, S3 access key, secret access key, bucket name, region, and endpoint URL. Returns the newly created destination object with its assigned ID.',
  schema: z
    .object({
      ...destinationBaseSchema,
    })
    .strict(),
  endpoint: '/destination.create',
})

const update = postTool({
  name: 'dokploy_destination_update',
  title: 'Update Backup Destination',
  description:
    'Update an existing S3-compatible backup destination configuration. Requires the destinationId of the destination to modify along with the updated S3 credentials and bucket settings. Returns the updated destination object.',
  schema: z
    .object({
      destinationId: z.string().min(1).describe('Unique destination ID to update'),
      ...destinationBaseSchema,
    })
    .strict(),
  endpoint: '/destination.update',
})

const remove = postTool({
  name: 'dokploy_destination_remove',
  title: 'Remove Backup Destination',
  description:
    'Permanently remove a backup destination from Dokploy. This action is irreversible and will delete the destination configuration. Requires the destinationId parameter. Any backup schedules referencing this destination should be updated or removed first.',
  schema: z
    .object({
      destinationId: z.string().min(1).describe('Unique destination ID to remove'),
    })
    .strict(),
  endpoint: '/destination.remove',
  annotations: { destructiveHint: true },
})

const testConnection = postTool({
  name: 'dokploy_destination_test_connection',
  title: 'Test Destination Connection',
  description:
    'Test the connection to an S3-compatible backup destination using the provided credentials. Requires the destination name, access key, secret access key, bucket, region, and endpoint. Returns a success or failure status indicating whether the S3 bucket is reachable and writable.',
  schema: z
    .object({
      ...destinationBaseSchema,
    })
    .strict(),
  endpoint: '/destination.testConnection',
})

// ── export ───────────────────────────────────────────────────────────
export const destinationTools: ToolDefinition[] = [all, one, create, update, remove, testConnection]
