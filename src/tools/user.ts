import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_user_all',
  title: 'List All Users',
  description:
    'List all users registered in the Dokploy instance. No parameters required. Returns an array of user objects including their IDs, emails, roles, and permission details.',
  schema: z.object({}).strict(),
  endpoint: '/user.all',
})

const session = getTool({
  name: 'dokploy_user_session',
  title: 'Get User Session',
  description:
    'Get the current authenticated user session from Dokploy, including session and identity metadata.',
  schema: z.object({}).strict(),
  endpoint: '/user.session',
})

const get = getTool({
  name: 'dokploy_user_get',
  title: 'Get Current User',
  description: 'Get the current authenticated Dokploy user profile.',
  schema: z.object({}).strict(),
  endpoint: '/user.get',
})

const getPermissions = getTool({
  name: 'dokploy_user_get_permissions',
  title: 'Get Current User Permissions',
  description: 'Get the current authenticated Dokploy user permissions.',
  schema: z.object({}).strict(),
  endpoint: '/user.getPermissions',
})

const haveRootAccess = getTool({
  name: 'dokploy_user_have_root_access',
  title: 'Check Root Access',
  description: 'Check whether the current authenticated Dokploy user has root access.',
  schema: z.object({}).strict(),
  endpoint: '/user.haveRootAccess',
})

const createApiKey = postTool({
  name: 'dokploy_user_create_api_key',
  title: 'Create API Key',
  description:
    'Create a new Dokploy API key. Requires a name and organization metadata. Optionally configure expiration and rate limiting.',
  schema: z
    .object({
      name: z.string().min(1).describe('API key name'),
      prefix: z.string().optional().describe('API key prefix'),
      expiresIn: z.number().optional().describe('Expiration interval'),
      metadata: z
        .object({
          organizationId: z.string().describe('Organization ID'),
        })
        .strict()
        .describe('API key metadata'),
      rateLimitEnabled: z.boolean().optional().describe('Whether rate limiting is enabled'),
      rateLimitTimeWindow: z.number().optional().describe('Rate limit time window'),
      rateLimitMax: z.number().optional().describe('Rate limit max requests'),
      remaining: z.number().optional().describe('Remaining requests'),
      refillAmount: z.number().optional().describe('Rate limit refill amount'),
      refillInterval: z.number().optional().describe('Rate limit refill interval'),
    })
    .strict(),
  endpoint: '/user.createApiKey',
})

const deleteApiKey = postTool({
  name: 'dokploy_user_delete_api_key',
  title: 'Delete API Key',
  description: 'Delete a Dokploy API key by its ID. This is a destructive action.',
  schema: z
    .object({
      apiKeyId: z.string().describe('API key ID'),
    })
    .strict(),
  endpoint: '/user.deleteApiKey',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const userTools: ToolDefinition[] = [
  all,
  session,
  get,
  getPermissions,
  haveRootAccess,
  createApiKey,
  deleteApiKey,
]
