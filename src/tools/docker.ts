import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const getContainers = getTool({
  name: 'dokploy_docker_get_containers',
  title: 'List Docker Containers',
  description:
    'List all Docker containers running on the Dokploy server. Returns container metadata including names, images, status, ports, and resource usage. Takes no parameters. Useful for getting an overview of all running and stopped containers.',
  schema: z
    .object({
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/docker.getContainers',
})

const getConfig = getTool({
  name: 'dokploy_docker_get_config',
  title: 'Get Docker Container Config',
  description:
    'Get the full configuration of a specific Docker container by its ID. Returns detailed container settings including environment variables, volumes, network configuration, and resource limits. Requires the Docker container ID.',
  schema: z
    .object({
      containerId: z.string().min(1).describe('The Docker container ID'),
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/docker.getConfig',
})

const getContainersByAppNameMatch = getTool({
  name: 'dokploy_docker_get_containers_by_app_name_match',
  title: 'Find Containers by App Name',
  description:
    'Find Docker containers whose name matches the given application name. Performs a substring match against container names to locate containers belonging to a specific app. Requires the app name string. Returns matching container objects with their metadata.',
  schema: z
    .object({
      appName: z.string().min(1).describe('The app name to match against container names'),
      appType: z.enum(['stack', 'docker-compose']).optional().describe('App type'),
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/docker.getContainersByAppNameMatch',
})

const getContainersByAppLabel = getTool({
  name: 'dokploy_docker_get_containers_by_app_label',
  title: 'Find Containers by App Label',
  description:
    'Find Docker containers by their application label metadata. Searches for containers that have a matching app label, which is the recommended way to identify containers managed by Dokploy. Requires the app name label value. Returns matching container objects.',
  schema: z
    .object({
      appName: z.string().min(1).describe('The app name label to search for'),
      serverId: z.string().optional().describe('Optional server ID'),
      type: z.enum(['standalone', 'swarm']).describe('Container type'),
    })
    .strict(),
  endpoint: '/docker.getContainersByAppLabel',
})

const restartContainer = postTool({
  name: 'dokploy_docker_restart_container',
  title: 'Restart Docker Container',
  description: 'Restart a Docker container managed by Dokploy. Requires the Docker container ID.',
  schema: z
    .object({
      containerId: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9.\-_]+$/)
        .describe('Docker container ID'),
    })
    .strict(),
  endpoint: '/docker.restartContainer',
  annotations: { destructiveHint: true },
})

const getStackContainersByAppName = getTool({
  name: 'dokploy_docker_get_stack_containers_by_app_name',
  title: 'List Stack Containers by App Name',
  description:
    'List stack containers for a Dokploy application name. Requires the app name and optionally accepts a server ID.',
  schema: z
    .object({
      appName: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9.\-_]+$/)
        .describe('Application name'),
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/docker.getStackContainersByAppName',
})

const getServiceContainersByAppName = getTool({
  name: 'dokploy_docker_get_service_containers_by_app_name',
  title: 'List Service Containers by App Name',
  description:
    'List service containers for a Dokploy application name. Requires the app name and optionally accepts a server ID.',
  schema: z
    .object({
      appName: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9.\-_]+$/)
        .describe('Application name'),
      serverId: z.string().optional().describe('Optional server ID'),
    })
    .strict(),
  endpoint: '/docker.getServiceContainersByAppName',
})

// ── export ───────────────────────────────────────────────────────────
export const dockerTools: ToolDefinition[] = [
  getContainers,
  getConfig,
  getContainersByAppNameMatch,
  getContainersByAppLabel,
  restartContainer,
  getStackContainersByAppName,
  getServiceContainersByAppName,
]
