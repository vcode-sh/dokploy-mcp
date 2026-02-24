import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const securityId = z.string().min(1).describe('Unique security entry ID')

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_security_one',
  title: 'Get Security Entry',
  description:
    'Get details of a specific HTTP basic-auth security entry by its unique ID. Requires the securityId parameter. Returns the full security configuration including the associated application, username, and authentication settings.',
  schema: z.object({ securityId }).strict(),
  endpoint: '/security.one',
})

const create = postTool({
  name: 'dokploy_security_create',
  title: 'Create Security Entry',
  description:
    'Create a new HTTP basic-auth security entry to protect an application with username and password authentication. Requires the applicationId, username, and password parameters. Returns the newly created security entry with its assigned ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('ID of the application to protect'),
      username: z.string().min(1).describe('Username for basic-auth access'),
      password: z.string().min(1).describe('Password for basic-auth access'),
    })
    .strict(),
  endpoint: '/security.create',
})

const update = postTool({
  name: 'dokploy_security_update',
  title: 'Update Security Entry',
  description:
    'Update an existing HTTP basic-auth security entry by its ID. Requires the securityId and accepts optional username and password fields. Only provided fields will be updated; omitted fields remain unchanged. Returns the updated security entry.',
  schema: z
    .object({
      securityId,
      username: z.string().optional().describe('New username for basic-auth access'),
      password: z.string().optional().describe('New password for basic-auth access'),
    })
    .strict(),
  endpoint: '/security.update',
})

const deleteTool = postTool({
  name: 'dokploy_security_delete',
  title: 'Delete Security Entry',
  description:
    'Delete an HTTP basic-auth security entry permanently by its ID. This action is irreversible and will immediately remove authentication protection from the associated application. Requires the securityId parameter. Returns a confirmation of the deletion.',
  schema: z.object({ securityId }).strict(),
  endpoint: '/security.delete',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const securityTools: ToolDefinition[] = [one, create, update, deleteTool]
