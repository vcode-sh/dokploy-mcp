import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_deployment_all',
  title: 'List Application Deployments',
  description:
    'List all deployment records for a specific application in Dokploy. Each deployment includes build logs, status, timestamps, and the triggering event. Requires the application ID. Returns an array of deployment objects ordered by creation date.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/deployment.all',
})

const allByCompose = getTool({
  name: 'dokploy_deployment_all_by_compose',
  title: 'List Compose Deployments',
  description:
    'List all deployment records for a specific Docker Compose service in Dokploy. Each deployment includes build logs, status, timestamps, and the triggering event. Requires the compose service ID. Returns an array of deployment objects ordered by creation date.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/deployment.allByCompose',
})

const allByServer = getTool({
  name: 'dokploy_deployment_all_by_server',
  title: 'List Server Deployments',
  description:
    'List all deployment records associated with a specific Dokploy server. Requires the server ID.',
  schema: z
    .object({
      serverId: z.string().min(1).describe('The unique server ID'),
    })
    .strict(),
  endpoint: '/deployment.allByServer',
})

const allCentralized = getTool({
  name: 'dokploy_deployment_all_centralized',
  title: 'List Centralized Deployments',
  description: 'List centralized deployments in Dokploy across supported entity types.',
  schema: z.object({}).strict(),
  endpoint: '/deployment.allCentralized',
})

const queueList = getTool({
  name: 'dokploy_deployment_queue_list',
  title: 'List Deployment Queue',
  description: 'List queued deployment jobs in Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/deployment.queueList',
})

const allByType = getTool({
  name: 'dokploy_deployment_all_by_type',
  title: 'List Deployments by Type',
  description:
    'List deployments for a specific Dokploy entity type. Requires the entity ID and the entity type.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      type: z
        .enum([
          'application',
          'compose',
          'server',
          'schedule',
          'previewDeployment',
          'backup',
          'volumeBackup',
        ])
        .describe('Entity type'),
    })
    .strict(),
  endpoint: '/deployment.allByType',
})

const killProcess = postTool({
  name: 'dokploy_deployment_kill_process',
  title: 'Kill Deployment Process',
  description: 'Kill an in-progress deployment process in Dokploy. Requires the deployment ID.',
  schema: z
    .object({
      deploymentId: z.string().min(1).describe('Deployment ID'),
    })
    .strict(),
  endpoint: '/deployment.killProcess',
  annotations: { destructiveHint: true },
})

const removeDeployment = postTool({
  name: 'dokploy_deployment_remove_deployment',
  title: 'Remove Deployment Record',
  description:
    'Remove a deployment record from Dokploy. Requires the deployment ID. This is a destructive action.',
  schema: z
    .object({
      deploymentId: z.string().min(1).describe('Deployment ID'),
    })
    .strict(),
  endpoint: '/deployment.removeDeployment',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const deploymentTools: ToolDefinition[] = [
  all,
  allByCompose,
  allByServer,
  allCentralized,
  queueList,
  allByType,
  killProcess,
  removeDeployment,
]
