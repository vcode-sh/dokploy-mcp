import { z } from 'zod'
import { getTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_user_all',
  title: 'List All Users',
  description:
    'List all users registered in the Dokploy instance. No parameters required. Returns an array of user objects including their IDs, emails, roles, and permission details.',
  schema: z.object({}),
  endpoint: '/user.all',
})

const byAuthId = getTool({
  name: 'dokploy_user_by_auth_id',
  title: 'Get User by Auth ID',
  description:
    'Get a specific user by their authentication ID. Requires the auth ID string. Returns the full user profile including email, role, permissions, and associated project and service access.',
  schema: z.object({
    authId: z.string().min(1).describe('The auth ID of the user to retrieve'),
  }),
  endpoint: '/user.byAuthId',
})

const byUserId = getTool({
  name: 'dokploy_user_by_user_id',
  title: 'Get User by User ID',
  description:
    'Get a specific user by their user ID. Requires the user ID string. Returns the full user profile including email, role, permissions, and associated project and service access.',
  schema: z.object({
    userId: z.string().min(1).describe('The user ID of the user to retrieve'),
  }),
  endpoint: '/user.byUserId',
})

// ── export ───────────────────────────────────────────────────────────
export const userTools: ToolDefinition[] = [all, byAuthId, byUserId]
