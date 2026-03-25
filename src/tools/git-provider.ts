import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const getAll = getTool({
  name: 'dokploy_git_provider_get_all',
  title: 'List Git Providers',
  description:
    'List all Git provider integrations available in Dokploy, including provider metadata and linked platform records.',
  schema: z.object({}).strict(),
  endpoint: '/gitProvider.getAll',
})

const remove = postTool({
  name: 'dokploy_git_provider_remove',
  title: 'Remove Git Provider',
  description:
    'Remove a Git provider integration from Dokploy. Requires the Git provider ID. This is a destructive action.',
  schema: z
    .object({
      gitProviderId: z.string().min(1).describe('Git provider ID'),
    })
    .strict(),
  endpoint: '/gitProvider.remove',
  annotations: { destructiveHint: true },
})

export const gitProviderTools: ToolDefinition[] = [getAll, remove]
