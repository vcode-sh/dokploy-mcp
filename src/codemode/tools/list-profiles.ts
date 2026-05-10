import { z } from 'zod'

import { listProfiles } from '../../config/resolver.js'
import { createTool, type ToolDefinition } from '../../mcp/tool-factory.js'

const listProfilesSchema = z.object({}).strict()

export const listProfilesTool: ToolDefinition = createTool({
  name: 'list_profiles',
  title: 'List Dokploy Profiles',
  description:
    'List the available Dokploy profiles, including default and named targets, without exposing API keys. Returns profile names, normalized Dokploy API URLs, and config sources.',
  schema: listProfilesSchema,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => ({
    profiles: listProfiles(),
  }),
})
