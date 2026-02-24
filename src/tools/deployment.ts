import { z } from 'zod'
import { getTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_deployment_all',
  title: 'List Application Deployments',
  description:
    'List all deployment records for a specific application in Dokploy. Each deployment includes build logs, status, timestamps, and the triggering event. Requires the application ID. Returns an array of deployment objects ordered by creation date.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }),
  endpoint: '/deployment.all',
})

const allByCompose = getTool({
  name: 'dokploy_deployment_all_by_compose',
  title: 'List Compose Deployments',
  description:
    'List all deployment records for a specific Docker Compose service in Dokploy. Each deployment includes build logs, status, timestamps, and the triggering event. Requires the compose service ID. Returns an array of deployment objects ordered by creation date.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }),
  endpoint: '/deployment.allByCompose',
})

// ── export ───────────────────────────────────────────────────────────
export const deploymentTools: ToolDefinition[] = [all, allByCompose]
