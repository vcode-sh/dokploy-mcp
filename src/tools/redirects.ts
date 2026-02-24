import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const redirectId = z.string().min(1).describe('Unique redirect rule ID')

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_redirect_one',
  title: 'Get Redirect Rule',
  description:
    'Get details of a specific redirect rule by its unique ID. Requires the redirectId parameter. Returns the full redirect configuration including regex pattern, replacement URL, and whether it is a permanent (301) or temporary (302) redirect.',
  schema: z.object({ redirectId }).strict(),
  endpoint: '/redirects.one',
})

const create = postTool({
  name: 'dokploy_redirect_create',
  title: 'Create Redirect Rule',
  description:
    'Create a new redirect rule for an application. Requires a regex pattern to match incoming requests, a replacement URL or path, a permanent flag indicating 301 vs 302 redirect, and the target applicationId. Returns the newly created redirect rule with its assigned ID.',
  schema: z
    .object({
      regex: z.string().min(1).describe('Regular expression pattern to match incoming requests'),
      replacement: z.string().min(1).describe('Replacement URL or path for matched requests'),
      permanent: z.boolean().describe('Whether the redirect is permanent (301) or temporary (302)'),
      applicationId: z.string().min(1).describe('ID of the application to add the redirect to'),
    })
    .strict(),
  endpoint: '/redirects.create',
})

const update = postTool({
  name: 'dokploy_redirect_update',
  title: 'Update Redirect Rule',
  description:
    'Update an existing redirect rule by its ID. Requires the redirectId and accepts optional fields: regex pattern, replacement URL, and permanent flag. Only provided fields will be updated; omitted fields remain unchanged. Returns the updated redirect rule.',
  schema: z
    .object({
      redirectId,
      regex: z.string().optional().describe('New regular expression pattern'),
      replacement: z.string().optional().describe('New replacement URL or path'),
      permanent: z
        .boolean()
        .optional()
        .describe('Whether the redirect is permanent (301) or temporary (302)'),
    })
    .strict(),
  endpoint: '/redirects.update',
})

const deleteTool = postTool({
  name: 'dokploy_redirect_delete',
  title: 'Delete Redirect Rule',
  description:
    'Delete a redirect rule permanently by its ID. This action is irreversible and the redirect will stop being applied immediately. Requires the redirectId parameter. Returns a confirmation of the deletion.',
  schema: z.object({ redirectId }).strict(),
  endpoint: '/redirects.delete',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const redirectsTools: ToolDefinition[] = [one, create, update, deleteTool]
