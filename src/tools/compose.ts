import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const appNameSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-zA-Z0-9._-]+$/)
  .describe('Internal app name')

const nullableString = z.string().nullable().optional()
const nullableBoolean = z.boolean().nullable().optional()
const nullableNumber = z.number().nullable().optional()
const nullableStringArray = z.array(z.string()).nullable().optional()

const create = postTool({
  name: 'dokploy_compose_create',
  title: 'Create Compose Service',
  description:
    'Create a new Docker Compose service within an environment. Requires a service name and environment ID. Optionally specify the compose type (docker-compose or stack), a custom app name, target server ID, and compose file content. Returns the newly created compose service object.',
  schema: z
    .object({
      name: z.string().min(1).describe('The name of the compose service'),
      environmentId: z
        .string()
        .min(1)
        .describe('The environment ID to create the compose service in'),
      description: nullableString.describe('Compose service description'),
      composeType: z
        .enum(['docker-compose', 'stack'])
        .optional()
        .describe('Compose type: docker-compose or stack'),
      appName: appNameSchema.optional(),
      serverId: z.string().nullable().optional().describe('Target server ID for deployment'),
      composeFile: z.string().optional().describe('Compose file content'),
    })
    .strict(),
  endpoint: '/compose.create',
})

const one = getTool({
  name: 'dokploy_compose_one',
  title: 'Get Compose Service',
  description:
    'Get detailed information about a single compose service by its ID. Returns the full compose service configuration including its source type, environment variables, deployment status, and associated project.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.one',
})

const update = postTool({
  name: 'dokploy_compose_update',
  title: 'Update Compose Service',
  description:
    'Update an existing compose service configuration. Accepts the compose service ID and any combination of fields to modify, including name, environment variables, compose file content, source type, Git repository settings, and auto-deploy preferences. Returns the updated compose service object.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      name: z.string().optional().describe('Compose service name'),
      appName: appNameSchema.optional(),
      description: nullableString.describe('Service description'),
      env: nullableString.describe('Environment variables'),
      composeFile: z.string().optional().describe('Docker Compose file content'),
      refreshToken: nullableString.describe('Webhook token'),
      sourceType: z
        .enum(['git', 'github', 'gitlab', 'bitbucket', 'gitea', 'raw'])
        .optional()
        .describe('Source type for the compose file'),
      composeType: z
        .enum(['docker-compose', 'stack'])
        .optional()
        .describe('Compose type: docker-compose or stack'),
      repository: nullableString.describe('Git repository name'),
      owner: nullableString.describe('Git repository owner'),
      branch: nullableString.describe('Git branch'),
      autoDeploy: nullableBoolean.describe('Whether auto-deploy is enabled'),
      gitlabProjectId: nullableNumber.describe('GitLab project ID'),
      gitlabRepository: nullableString.describe('GitLab repository'),
      gitlabOwner: nullableString.describe('GitLab owner'),
      gitlabBranch: nullableString.describe('GitLab branch'),
      gitlabPathNamespace: nullableString.describe('GitLab path namespace'),
      bitbucketRepository: nullableString.describe('Bitbucket repository'),
      bitbucketRepositorySlug: nullableString.describe('Bitbucket repository slug'),
      bitbucketOwner: nullableString.describe('Bitbucket owner'),
      bitbucketBranch: nullableString.describe('Bitbucket branch'),
      giteaRepository: nullableString.describe('Gitea repository'),
      giteaOwner: nullableString.describe('Gitea owner'),
      giteaBranch: nullableString.describe('Gitea branch'),
      customGitUrl: nullableString.describe('Custom Git repository URL'),
      customGitBranch: nullableString.describe('Custom Git branch'),
      customGitSSHKeyId: nullableString.describe('SSH key ID for custom Git authentication'),
      command: z.string().optional().describe('Custom command override'),
      enableSubmodules: z.boolean().optional().describe('Whether git submodules are enabled'),
      composePath: z.string().optional().describe('Path to the compose file within the repo'),
      suffix: z.string().optional().describe('Isolated deployment suffix'),
      randomize: z.boolean().optional().describe('Whether to randomize service names'),
      isolatedDeployment: z.boolean().optional().describe('Whether isolated deployment is enabled'),
      isolatedDeploymentsVolume: z
        .boolean()
        .optional()
        .describe('Whether isolated deployments get a dedicated volume'),
      triggerType: z
        .enum(['push', 'tag'])
        .nullable()
        .optional()
        .describe('Deployment trigger type'),
      composeStatus: z
        .enum(['idle', 'running', 'done', 'error'])
        .optional()
        .describe('Compose service status'),
      environmentId: z.string().optional().describe('Environment ID'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      watchPaths: nullableStringArray.describe('Paths to watch for deploy triggers'),
      githubId: nullableString.describe('GitHub provider ID'),
      gitlabId: nullableString.describe('GitLab provider ID'),
      bitbucketId: nullableString.describe('Bitbucket provider ID'),
      giteaId: nullableString.describe('Gitea provider ID'),
    })
    .strict(),
  endpoint: '/compose.update',
})

const deleteCompose = postTool({
  name: 'dokploy_compose_delete',
  title: 'Delete Compose Service',
  description:
    'Permanently delete a compose service and all of its associated data, including containers, volumes, and configuration. This action is irreversible. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID to delete'),
      deleteVolumes: z.boolean().describe('Whether to delete attached volumes'),
    })
    .strict(),
  endpoint: '/compose.delete',
  annotations: { destructiveHint: true },
})

const deploy = postTool({
  name: 'dokploy_compose_deploy',
  title: 'Deploy Compose Service',
  description:
    'Deploy a Docker Compose service by triggering a build and run cycle. Requires the compose service ID. Returns the deployment status and any build logs produced during the deployment process.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID to deploy'),
      title: z.string().optional().describe('Optional deployment title'),
      description: z.string().optional().describe('Optional deployment description'),
    })
    .strict(),
  endpoint: '/compose.deploy',
})

const redeploy = postTool({
  name: 'dokploy_compose_redeploy',
  title: 'Redeploy Compose Service',
  description:
    'Redeploy a compose service by rebuilding all containers and restarting them. This is useful when you need to pick up configuration changes or force a fresh deployment. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID to redeploy'),
      title: z.string().optional().describe('Optional deployment title'),
      description: z.string().optional().describe('Optional deployment description'),
    })
    .strict(),
  endpoint: '/compose.redeploy',
})

const stop = postTool({
  name: 'dokploy_compose_stop',
  title: 'Stop Compose Service',
  description:
    'Stop all running containers in a compose service. The containers and their data are preserved but will no longer be running or serving traffic. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID to stop'),
    })
    .strict(),
  endpoint: '/compose.stop',
  annotations: { destructiveHint: true },
})

const cleanQueues = postTool({
  name: 'dokploy_compose_clean_queues',
  title: 'Clean Compose Queues',
  description:
    'Clean the pending deployment queues for a compose service. This removes any queued deployment tasks that have not yet started. Useful for clearing stuck or unwanted deployments. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.cleanQueues',
  annotations: { destructiveHint: true },
})

const randomizeCompose = postTool({
  name: 'dokploy_compose_randomize',
  title: 'Randomize Compose Names',
  description:
    'Randomize the service names within a compose deployment to avoid naming conflicts. An optional suffix can be provided to append to the randomized names. Requires the compose service ID. Returns the updated compose configuration.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      suffix: z.string().optional().describe('Optional suffix for randomized names'),
    })
    .strict(),
  endpoint: '/compose.randomizeCompose',
})

const getDefaultCommand = getTool({
  name: 'dokploy_compose_get_default_command',
  title: 'Get Default Command',
  description:
    'Retrieve the default deployment command for a compose service. This is the command that Dokploy uses to bring up the compose stack during deployment. Requires the compose service ID. Returns the command string.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.getDefaultCommand',
})

const refreshToken = postTool({
  name: 'dokploy_compose_refresh_token',
  title: 'Refresh Webhook Token',
  description:
    'Refresh the webhook token for a compose service. This invalidates the previous webhook URL and generates a new one. Useful when the existing webhook token has been compromised. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.refreshToken',
})

const deployTemplate = postTool({
  name: 'dokploy_compose_deploy_template',
  title: 'Deploy Compose Template',
  description:
    'Deploy a compose service from a predefined template. Templates provide pre-configured compose stacks for common applications. Requires an environment ID and the template ID. Returns the created compose service with deployment status.',
  schema: z
    .object({
      environmentId: z.string().min(1).describe('The environment ID to deploy the template in'),
      serverId: z.string().optional().describe('Optional target server ID'),
      id: z.string().min(1).describe('The template ID to deploy'),
      baseUrl: z.string().optional().describe('Optional base URL used by the template'),
    })
    .strict(),
  endpoint: '/compose.deployTemplate',
})

const templates = getTool({
  name: 'dokploy_compose_templates',
  title: 'List Compose Templates',
  description:
    'List all available compose templates that can be deployed. Templates are pre-configured Docker Compose stacks for popular applications and services. Returns an array of template objects with their IDs, names, and descriptions.',
  schema: z
    .object({
      baseUrl: z.string().optional().describe('Optional base URL'),
    })
    .strict(),
  endpoint: '/compose.templates',
})

const start = postTool({
  name: 'dokploy_compose_start',
  title: 'Start Compose Service',
  description:
    'Start a previously stopped compose service in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.start',
})

const move = postTool({
  name: 'dokploy_compose_move',
  title: 'Move Compose Service',
  description:
    'Move a compose service from its current environment to a different Dokploy environment. Requires the compose service ID and the target environment ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      targetEnvironmentId: z.string().min(1).describe('The target environment ID'),
    })
    .strict(),
  endpoint: '/compose.move',
})

const cancelDeployment = postTool({
  name: 'dokploy_compose_cancel_deployment',
  title: 'Cancel Compose Deployment',
  description:
    'Cancel an in-progress compose deployment in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.cancelDeployment',
})

const killBuild = postTool({
  name: 'dokploy_compose_kill_build',
  title: 'Kill Compose Build',
  description: 'Stop an in-progress compose build in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.killBuild',
  annotations: { destructiveHint: true },
})

const clearDeployments = postTool({
  name: 'dokploy_compose_clear_deployments',
  title: 'Clear Compose Deployments',
  description:
    'Clear stored deployment history for a compose service in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.clearDeployments',
  annotations: { destructiveHint: true },
})

const disconnectGitProvider = postTool({
  name: 'dokploy_compose_disconnect_git_provider',
  title: 'Disconnect Compose Git Provider',
  description:
    'Disconnect the linked Git provider from a compose service in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.disconnectGitProvider',
  annotations: { destructiveHint: true },
})

const search = getTool({
  name: 'dokploy_compose_search',
  title: 'Search Compose Services',
  description:
    'Search Dokploy compose services by free text or field-specific filters. Supports pagination through limit and offset.',
  schema: z
    .object({
      q: z.string().optional().describe('Free-text query'),
      name: z.string().optional().describe('Compose service name'),
      appName: z.string().optional().describe('Internal app name'),
      description: z.string().optional().describe('Compose service description'),
      projectId: z.string().optional().describe('Project ID'),
      environmentId: z.string().optional().describe('Environment ID'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of results'),
      offset: z.number().min(0).optional().describe('Number of results to skip'),
    })
    .strict(),
  endpoint: '/compose.search',
})

const loadServices = getTool({
  name: 'dokploy_compose_load_services',
  title: 'Load Compose Services',
  description:
    'Load parsed service definitions for a compose service. Requires the compose service ID and optionally accepts a cache strategy.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      type: z.enum(['fetch', 'cache']).optional().describe('Load strategy'),
    })
    .strict(),
  endpoint: '/compose.loadServices',
})

const loadMountsByService = getTool({
  name: 'dokploy_compose_load_mounts_by_service',
  title: 'Load Mounts by Compose Service',
  description:
    'Load compose mounts for a specific service inside a compose stack. Requires the compose service ID and service name.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      serviceName: z.string().min(1).describe('Compose service name'),
    })
    .strict(),
  endpoint: '/compose.loadMountsByService',
})

const fetchSourceType = postTool({
  name: 'dokploy_compose_fetch_source_type',
  title: 'Fetch Compose Source Type',
  description:
    'Fetch and resolve the effective source type for a compose service in Dokploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.fetchSourceType',
})

const isolatedDeployment = postTool({
  name: 'dokploy_compose_isolated_deployment',
  title: 'Run Isolated Compose Deployment',
  description:
    'Create an isolated deployment variant for a compose service in Dokploy. Requires the compose service ID and optionally accepts a suffix.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
      suffix: z.string().optional().describe('Optional isolated deployment suffix'),
    })
    .strict(),
  endpoint: '/compose.isolatedDeployment',
})

const getConvertedCompose = getTool({
  name: 'dokploy_compose_get_converted_compose',
  title: 'Get Converted Compose',
  description:
    'Retrieve the converted compose definition that Dokploy will deploy. Requires the compose service ID.',
  schema: z
    .object({
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.getConvertedCompose',
})

const getTags = getTool({
  name: 'dokploy_compose_get_tags',
  title: 'Get Compose Template Tags',
  description:
    'List available compose template tags. Optionally pass a base URL to target a specific template source.',
  schema: z
    .object({
      baseUrl: z.string().optional().describe('Optional base URL'),
    })
    .strict(),
  endpoint: '/compose.getTags',
})

const processTemplate = postTool({
  name: 'dokploy_compose_process_template',
  title: 'Process Compose Template',
  description:
    'Process a compose template payload for an existing compose service. Requires a base64 payload and the compose service ID.',
  schema: z
    .object({
      base64: z.string().describe('Base64-encoded template payload'),
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.processTemplate',
})

const importCompose = postTool({
  name: 'dokploy_compose_import',
  title: 'Import Compose Definition',
  description:
    'Import a compose definition into an existing compose service. Requires a base64 payload and the compose service ID.',
  schema: z
    .object({
      base64: z.string().describe('Base64-encoded compose payload'),
      composeId: z.string().min(1).describe('The unique compose service ID'),
    })
    .strict(),
  endpoint: '/compose.import',
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
  start,
  move,
  cancelDeployment,
  killBuild,
  clearDeployments,
  disconnectGitProvider,
  cleanQueues,
  randomizeCompose,
  search,
  loadServices,
  loadMountsByService,
  fetchSourceType,
  isolatedDeployment,
  getConvertedCompose,
  getTags,
  processTemplate,
  importCompose,
  getDefaultCommand,
  refreshToken,
  deployTemplate,
  templates,
]
