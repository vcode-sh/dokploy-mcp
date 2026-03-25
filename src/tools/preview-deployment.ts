import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const all = getTool({
  name: 'dokploy_preview_deployment_all',
  title: 'List Preview Deployments',
  description: 'List preview deployments for a Dokploy application. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('Application ID'),
    })
    .strict(),
  endpoint: '/previewDeployment.all',
})

const one = getTool({
  name: 'dokploy_preview_deployment_one',
  title: 'Get Preview Deployment',
  description: 'Retrieve a preview deployment by its ID.',
  schema: z
    .object({
      previewDeploymentId: z.string().describe('Preview deployment ID'),
    })
    .strict(),
  endpoint: '/previewDeployment.one',
})

const remove = postTool({
  name: 'dokploy_preview_deployment_delete',
  title: 'Delete Preview Deployment',
  description:
    'Delete a preview deployment in Dokploy. Requires the preview deployment ID. This is a destructive action.',
  schema: z
    .object({
      previewDeploymentId: z.string().describe('Preview deployment ID'),
    })
    .strict(),
  endpoint: '/previewDeployment.delete',
  annotations: { destructiveHint: true },
})

const redeploy = postTool({
  name: 'dokploy_preview_deployment_redeploy',
  title: 'Redeploy Preview Deployment',
  description:
    'Redeploy a preview deployment in Dokploy. Requires the preview deployment ID and optionally accepts a title and description.',
  schema: z
    .object({
      previewDeploymentId: z.string().describe('Preview deployment ID'),
      title: z.string().optional().describe('Optional deployment title'),
      description: z.string().optional().describe('Optional deployment description'),
    })
    .strict(),
  endpoint: '/previewDeployment.redeploy',
})

export const previewDeploymentTools: ToolDefinition[] = [all, one, remove, redeploy]
