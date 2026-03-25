import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const paginationLimit = z.number().min(1).max(100).optional().describe('Maximum number of results')
const paginationOffset = z.number().min(0).optional().describe('Number of results to skip')

const create = postTool({
  name: 'dokploy_environment_create',
  title: 'Create Environment',
  description:
    'Create a new environment inside a Dokploy project. Requires the project ID and environment name. Optionally set a description. Returns the created environment object.',
  schema: z
    .object({
      name: z.string().min(1).describe('The environment name'),
      description: z.string().optional().describe('Environment description'),
      projectId: z.string().min(1).describe('The project ID'),
    })
    .strict(),
  endpoint: '/environment.create',
})

const one = getTool({
  name: 'dokploy_environment_one',
  title: 'Get Environment',
  description:
    'Retrieve detailed information about a Dokploy environment by its ID. Returns the environment, services, and related project metadata.',
  schema: z
    .object({
      environmentId: z.string().min(1).describe('The environment ID'),
    })
    .strict(),
  endpoint: '/environment.one',
})

const byProjectId = getTool({
  name: 'dokploy_environment_by_project_id',
  title: 'List Environments by Project',
  description:
    'List all environments belonging to a Dokploy project. Requires the project ID. Returns the environments configured for that project.',
  schema: z
    .object({
      projectId: z.string().min(1).describe('The project ID'),
    })
    .strict(),
  endpoint: '/environment.byProjectId',
})

const remove = postTool({
  name: 'dokploy_environment_remove',
  title: 'Remove Environment',
  description:
    'Permanently remove a Dokploy environment. This action is destructive and may remove all services that belong to the environment. Requires the environment ID.',
  schema: z
    .object({
      environmentId: z.string().min(1).describe('The environment ID'),
    })
    .strict(),
  endpoint: '/environment.remove',
  annotations: { destructiveHint: true },
})

const update = postTool({
  name: 'dokploy_environment_update',
  title: 'Update Environment',
  description:
    'Update an existing Dokploy environment. Requires the environment ID and accepts optional changes to the environment name, description, project assignment, and environment variables.',
  schema: z
    .object({
      environmentId: z.string().min(1).describe('The environment ID'),
      name: z.string().min(1).optional().describe('Environment name'),
      description: z.string().optional().describe('Environment description'),
      projectId: z.string().optional().describe('Project ID'),
      env: z.string().optional().describe('Environment variables'),
    })
    .strict(),
  endpoint: '/environment.update',
})

const duplicate = postTool({
  name: 'dokploy_environment_duplicate',
  title: 'Duplicate Environment',
  description:
    'Duplicate an existing Dokploy environment. Requires the source environment ID and a name for the new environment. Optionally set a description.',
  schema: z
    .object({
      environmentId: z.string().min(1).describe('The source environment ID'),
      name: z.string().min(1).describe('The new environment name'),
      description: z.string().optional().describe('New environment description'),
    })
    .strict(),
  endpoint: '/environment.duplicate',
})

const search = getTool({
  name: 'dokploy_environment_search',
  title: 'Search Environments',
  description:
    'Search Dokploy environments by free text or field-specific filters. Supports pagination through limit and offset.',
  schema: z
    .object({
      q: z.string().optional().describe('Free-text query'),
      name: z.string().optional().describe('Environment name'),
      description: z.string().optional().describe('Environment description'),
      projectId: z.string().optional().describe('Project ID'),
      limit: paginationLimit,
      offset: paginationOffset,
    })
    .strict(),
  endpoint: '/environment.search',
})

export const environmentTools: ToolDefinition[] = [
  create,
  one,
  byProjectId,
  remove,
  update,
  duplicate,
  search,
]
