import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: 'dokploy_compose_create',
  title: 'Create Compose Service',
  description:
    'Create a new Docker Compose service within a project. Requires a service name and project ID. Optionally specify the compose type (docker-compose or stack), a custom app name, and a target server ID. Returns the newly created compose service object.',
  schema: z.object({
    name: z.string().min(1).describe('The name of the compose service'),
    projectId: z.string().min(1).describe('The project ID to create the compose service in'),
    description: z.string().nullable().optional().describe('Compose service description'),
    composeType: z
      .enum(['docker-compose', 'stack'])
      .optional()
      .describe('Compose type: docker-compose or stack'),
    appName: z.string().optional().describe('Custom app name (auto-generated if not provided)'),
    serverId: z.string().nullable().optional().describe('Target server ID for deployment'),
  }).strict(),
  endpoint: '/compose.create',
})

const one = getTool({
  name: 'dokploy_compose_one',
  title: 'Get Compose Service',
  description:
    'Get detailed information about a single compose service by its ID. Returns the full compose service configuration including its source type, environment variables, deployment status, and associated project.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }).strict(),
  endpoint: '/compose.one',
})

const update = postTool({
  name: 'dokploy_compose_update',
  title: 'Update Compose Service',
  description:
    'Update an existing compose service configuration. Accepts the compose service ID and any combination of fields to modify, including name, environment variables, compose file content, source type, Git repository settings, and auto-deploy preferences. Returns the updated compose service object.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
    name: z.string().optional().describe('Compose service name'),
    appName: z.string().optional().describe('Internal app name'),
    description: z.string().nullable().optional().describe('Service description'),
    env: z.string().nullable().optional().describe('Environment variables'),
    composeFile: z.string().nullable().optional().describe('Docker Compose file content'),
    sourceType: z
      .enum(['git', 'github', 'raw'])
      .optional()
      .describe('Source type for the compose file'),
    composeType: z
      .enum(['docker-compose', 'stack'])
      .optional()
      .describe('Compose type: docker-compose or stack'),
    repository: z.string().optional().describe('Git repository name'),
    owner: z.string().optional().describe('Git repository owner'),
    branch: z.string().optional().describe('Git branch'),
    autoDeploy: z.boolean().optional().describe('Whether auto-deploy is enabled'),
    customGitUrl: z.string().optional().describe('Custom Git repository URL'),
    customGitBranch: z.string().optional().describe('Custom Git branch'),
    customGitSSHKey: z
      .string()
      .nullable()
      .optional()
      .describe('SSH key for custom Git authentication'),
    command: z.string().nullable().optional().describe('Custom command override'),
    composePath: z.string().optional().describe('Path to the compose file within the repo'),
    composeStatus: z.string().optional().describe('Compose service status'),
    projectId: z.string().optional().describe('Project ID'),
  }).strict(),
  endpoint: '/compose.update',
})

const deleteCompose = postTool({
  name: 'dokploy_compose_delete',
  title: 'Delete Compose Service',
  description:
    'Permanently delete a compose service and all of its associated data, including containers, volumes, and configuration. This action is irreversible. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID to delete'),
  }).strict(),
  endpoint: '/compose.delete',
  annotations: { destructiveHint: true },
})

const deploy = postTool({
  name: 'dokploy_compose_deploy',
  title: 'Deploy Compose Service',
  description:
    'Deploy a Docker Compose service by triggering a build and run cycle. Requires the compose service ID. Returns the deployment status and any build logs produced during the deployment process.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID to deploy'),
  }).strict(),
  endpoint: '/compose.deploy',
})

const redeploy = postTool({
  name: 'dokploy_compose_redeploy',
  title: 'Redeploy Compose Service',
  description:
    'Redeploy a compose service by rebuilding all containers and restarting them. This is useful when you need to pick up configuration changes or force a fresh deployment. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID to redeploy'),
  }).strict(),
  endpoint: '/compose.redeploy',
})

const stop = postTool({
  name: 'dokploy_compose_stop',
  title: 'Stop Compose Service',
  description:
    'Stop all running containers in a compose service. The containers and their data are preserved but will no longer be running or serving traffic. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID to stop'),
  }).strict(),
  endpoint: '/compose.stop',
  annotations: { destructiveHint: true },
})

const cleanQueues = postTool({
  name: 'dokploy_compose_clean_queues',
  title: 'Clean Compose Queues',
  description:
    'Clean the pending deployment queues for a compose service. This removes any queued deployment tasks that have not yet started. Useful for clearing stuck or unwanted deployments. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }).strict(),
  endpoint: '/compose.cleanQueues',
  annotations: { destructiveHint: true },
})

const randomizeCompose = postTool({
  name: 'dokploy_compose_randomize',
  title: 'Randomize Compose Names',
  description:
    'Randomize the service names within a compose deployment to avoid naming conflicts. An optional prefix can be provided to prepend to the randomized names. Requires the compose service ID. Returns the updated compose configuration.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
    prefix: z.string().optional().describe('Optional prefix for randomized names'),
  }).strict(),
  endpoint: '/compose.randomizeCompose',
})

const getDefaultCommand = getTool({
  name: 'dokploy_compose_get_default_command',
  title: 'Get Default Command',
  description:
    'Retrieve the default deployment command for a compose service. This is the command that Dokploy uses to bring up the compose stack during deployment. Requires the compose service ID. Returns the command string.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }).strict(),
  endpoint: '/compose.getDefaultCommand',
})

const refreshToken = postTool({
  name: 'dokploy_compose_refresh_token',
  title: 'Refresh Webhook Token',
  description:
    'Refresh the webhook token for a compose service. This invalidates the previous webhook URL and generates a new one. Useful when the existing webhook token has been compromised. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }).strict(),
  endpoint: '/compose.refreshToken',
})

const deployTemplate = postTool({
  name: 'dokploy_compose_deploy_template',
  title: 'Deploy Compose Template',
  description:
    'Deploy a compose service from a predefined template. Templates provide pre-configured compose stacks for common applications. Requires a project ID and the template ID. Returns the created compose service with deployment status.',
  schema: z.object({
    projectId: z.string().min(1).describe('The project ID to deploy the template in'),
    id: z.string().min(1).describe('The template ID to deploy'),
  }).strict(),
  endpoint: '/compose.deployTemplate',
})

const templates = getTool({
  name: 'dokploy_compose_templates',
  title: 'List Compose Templates',
  description:
    'List all available compose templates that can be deployed. Templates are pre-configured Docker Compose stacks for popular applications and services. Returns an array of template objects with their IDs, names, and descriptions.',
  schema: z.object({}).strict(),
  endpoint: '/compose.templates',
})

const saveEnvironment = postTool({
  name: 'dokploy_compose_save_environment',
  title: 'Save Environment Variables',
  description:
    'Save environment variables and Docker build arguments for a compose service. Environment variables are injected at runtime while build arguments are passed during the image build phase. Requires the compose service ID.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
    env: z.string().nullable().optional().describe('Environment variables'),
    buildArgs: z.string().nullable().optional().describe('Docker build arguments'),
  }).strict(),
  endpoint: '/compose.saveEnvironment',
})

// ── export ───────────────────────────────────────────────────────────
export const composeTools: ToolDefinition[] = [
  create,
  one,
  update,
  deleteCompose,
  deploy,
  redeploy,
  stop,
  cleanQueues,
  randomizeCompose,
  getDefaultCommand,
  refreshToken,
  deployTemplate,
  templates,
  saveEnvironment,
]
