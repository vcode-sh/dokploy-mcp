import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const registryTypeEnum = z
  .enum(['selfHosted', 'cloud'])
  .describe('Registry type: selfHosted or cloud')

const registryBaseSchema = {
  registryName: z.string().min(1).describe('Name of the registry'),
  username: z.string().min(1).describe('Registry username'),
  password: z.string().min(1).describe('Registry password'),
  registryUrl: z.string().min(1).describe('Registry URL'),
  registryType: registryTypeEnum,
  imagePrefix: z.string().nullable().optional().describe('Optional image prefix for the registry'),
}

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_registry_all',
  title: 'List Registries',
  description:
    'List all container registries configured in Dokploy. Returns an array of registry objects including their names, URLs, types (selfHosted or cloud), and authentication details. Takes no parameters. Useful for reviewing which registries are available for deploying container images.',
  schema: z.object({}).strict(),
  endpoint: '/registry.all',
})

const one = getTool({
  name: 'dokploy_registry_one',
  title: 'Get Registry Details',
  description:
    'Get the full details of a specific container registry by its unique ID. Returns the registry name, URL, type, credentials, and image prefix configuration. Requires the registry ID. Useful for inspecting or verifying a registry setup before deploying.',
  schema: z.object({
    registryId: z.string().min(1).describe('Unique registry ID'),
  }).strict(),
  endpoint: '/registry.one',
})

const create = postTool({
  name: 'dokploy_registry_create',
  title: 'Create Registry',
  description:
    'Create a new container registry configuration in Dokploy. Requires the registry name, URL, username, password, and type (selfHosted or cloud). Optionally accepts an image prefix. Returns the newly created registry object.',
  schema: z.object({
    ...registryBaseSchema,
  }).strict(),
  endpoint: '/registry.create',
})

const update = postTool({
  name: 'dokploy_registry_update',
  title: 'Update Registry',
  description:
    'Update an existing container registry configuration in Dokploy. Requires the registry ID along with the updated name, URL, username, password, and type. Optionally accepts an image prefix. Returns the updated registry object.',
  schema: z.object({
    registryId: z.string().min(1).describe('Unique registry ID to update'),
    ...registryBaseSchema,
  }).strict(),
  endpoint: '/registry.update',
})

const remove = postTool({
  name: 'dokploy_registry_remove',
  title: 'Remove Registry',
  description:
    'Permanently remove a container registry configuration from Dokploy. This action is irreversible and will delete all stored credentials for the registry. Requires the registry ID. Applications referencing this registry will need to be reconfigured.',
  schema: z.object({
    registryId: z.string().min(1).describe('Unique registry ID to remove'),
  }).strict(),
  endpoint: '/registry.remove',
  annotations: { destructiveHint: true },
})

const testRegistry = postTool({
  name: 'dokploy_registry_test',
  title: 'Test Registry Connection',
  description:
    'Test the connection to a container registry using the provided credentials. Validates that Dokploy can authenticate and communicate with the registry. Requires the registry name, URL, username, password, and type. Returns a success or failure status.',
  schema: z.object({
    ...registryBaseSchema,
  }).strict(),
  endpoint: '/registry.testRegistry',
})

// ── export ───────────────────────────────────────────────────────────
export const registryTools: ToolDefinition[] = [
  all,
  one,
  create,
  update,
  remove,
  testRegistry,
]
