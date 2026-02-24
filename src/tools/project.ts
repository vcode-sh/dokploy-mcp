import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_project_all',
  title: 'List All Projects',
  description:
    'List all projects in the Dokploy instance. Takes no parameters and returns an array of project objects, each containing the project ID, name, description, and associated services. Useful for discovering available projects before performing operations on them.',
  schema: z.object({}),
  endpoint: '/project.all',
})

const one = getTool({
  name: 'dokploy_project_one',
  title: 'Get Project Details',
  description:
    'Retrieve detailed information about a single Dokploy project by its unique ID. Returns the full project object including its name, description, environment variables, and all associated services such as applications, databases, and compose stacks.',
  schema: z.object({
    projectId: z.string().min(1).describe('The unique project ID'),
  }),
  endpoint: '/project.one',
})

const create = postTool({
  name: 'dokploy_project_create',
  title: 'Create Project',
  description:
    'Create a new project in Dokploy. Requires a project name and optionally accepts a description. Projects serve as organizational containers for applications, databases, and other services. Returns the newly created project object with its generated ID.',
  schema: z.object({
    name: z.string().min(1).describe('The name of the project'),
    description: z.string().nullable().optional().describe('Optional project description'),
  }),
  endpoint: '/project.create',
})

const update = postTool({
  name: 'dokploy_project_update',
  title: 'Update Project',
  description:
    'Update an existing Dokploy project. Requires the project ID and accepts optional fields to modify including name, description, and environment variables. Only the provided fields will be updated; omitted fields remain unchanged. Returns the updated project object.',
  schema: z.object({
    projectId: z.string().min(1).describe('The unique project ID'),
    name: z.string().optional().describe('New project name'),
    description: z.string().nullable().optional().describe('New project description'),
    env: z.string().nullable().optional().describe('Environment variables for the project'),
  }),
  endpoint: '/project.update',
})

const duplicate = postTool({
  name: 'dokploy_project_duplicate',
  title: 'Duplicate Project',
  description:
    'Duplicate an existing Dokploy project, creating a new project with the same configuration. Requires the source project ID and a name for the new project. Optionally include services from the original project, either all services or a selected subset specified by their IDs and types. Returns the newly created duplicate project.',
  schema: z.object({
    sourceProjectId: z.string().min(1).describe('The ID of the project to duplicate'),
    name: z.string().min(1).describe('The name for the duplicated project'),
    description: z.string().optional().describe('Description for the duplicated project'),
    includeServices: z
      .boolean()
      .optional()
      .describe('Whether to include services in the duplicate'),
    selectedServices: z
      .array(
        z.object({
          id: z.string().min(1).describe('The service ID'),
          type: z.string().min(1).describe('The service type'),
        }),
      )
      .optional()
      .describe('Specific services to include in the duplicate'),
  }),
  endpoint: '/project.duplicate',
})

const remove = postTool({
  name: 'dokploy_project_remove',
  title: 'Remove Project',
  description:
    'Permanently remove a Dokploy project and all its associated resources including applications, databases, and compose stacks. This action is irreversible and will delete all data within the project. Requires the project ID to remove.',
  schema: z.object({
    projectId: z.string().min(1).describe('The unique project ID to remove'),
  }),
  endpoint: '/project.remove',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const projectTools: ToolDefinition[] = [all, one, create, update, duplicate, remove]
