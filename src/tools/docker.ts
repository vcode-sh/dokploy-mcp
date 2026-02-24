import { z } from 'zod'
import { getTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const getContainers = getTool({
  name: 'dokploy_docker_get_containers',
  title: 'List Docker Containers',
  description:
    'List all Docker containers running on the Dokploy server. Returns container metadata including names, images, status, ports, and resource usage. Takes no parameters. Useful for getting an overview of all running and stopped containers.',
  schema: z.object({}).strict(),
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
    })
    .strict(),
  endpoint: '/docker.getContainersByAppLabel',
})

// ── export ───────────────────────────────────────────────────────────
export const dockerTools: ToolDefinition[] = [
  getContainers,
  getConfig,
  getContainersByAppNameMatch,
  getContainersByAppLabel,
]
