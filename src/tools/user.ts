import { z } from 'zod'
import { getTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_user_all',
  title: 'List All Users',
  description:
    'List all users registered in the Dokploy instance. No parameters required. Returns an array of user objects including their IDs, emails, roles, and permission details.',
  schema: z.object({}).strict(),
  endpoint: '/user.all',
})

// ── export ───────────────────────────────────────────────────────────
export const userTools: ToolDefinition[] = [all]
