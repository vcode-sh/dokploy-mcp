import { z } from 'zod'
import { postTool, type ToolDefinition } from './_factory.js'

const rollbackIdSchema = z.string().min(1).describe('Rollback ID')

const rollback = postTool({
  name: 'dokploy_rollback_rollback',
  title: 'Execute Rollback',
  description:
    'Execute a rollback in Dokploy. Requires the rollback ID and triggers a rollback to the associated deployment target.',
  schema: z
    .object({
      rollbackId: rollbackIdSchema,
    })
    .strict(),
  endpoint: '/rollback.rollback',
  annotations: { destructiveHint: true },
})

const remove = postTool({
  name: 'dokploy_rollback_delete',
  title: 'Delete Rollback Record',
  description:
    'Delete a rollback record from Dokploy. Requires the rollback ID. This is a destructive action.',
  schema: z
    .object({
      rollbackId: rollbackIdSchema,
    })
    .strict(),
  endpoint: '/rollback.delete',
  annotations: { destructiveHint: true },
})

export const rollbackTools: ToolDefinition[] = [rollback, remove]
