import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: 'dokploy_application_create',
  title: 'Create Application',
  description:
    'Create a new application within a Dokploy project. Requires a project ID and application name. Optionally specify a custom app name, description, and target server for deployment. Returns the created application object with its generated ID.',
  schema: z.object({
    name: z.string().min(1).describe('The name of the application'),
    projectId: z.string().min(1).describe('The project ID to create the application in'),
    appName: z.string().optional().describe('Custom app name (auto-generated if not provided)'),
    description: z.string().nullable().optional().describe('Application description'),
    serverId: z.string().nullable().optional().describe('Target server ID for deployment'),
  }).strict(),
  endpoint: '/application.create',
})

const one = getTool({
  name: 'dokploy_application_one',
  title: 'Get Application Details',
  description:
    'Retrieve detailed information about a single Dokploy application by its unique ID. Returns the full application object including its configuration, build settings, source provider, environment variables, resource limits, deployment status, and associated domains.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.one',
})

const update = postTool({
  name: 'dokploy_application_update',
  title: 'Update Application',
  description:
    "Update an existing application's configuration in Dokploy. Requires the application ID and accepts a wide range of optional fields including name, environment variables, resource limits (CPU and memory), build settings, Docker Swarm configuration, and deployment options. Only provided fields are modified; omitted fields remain unchanged.",
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    name: z.string().optional().describe('Application name'),
    appName: z.string().optional().describe('Internal app name'),
    description: z.string().nullable().optional().describe('Application description'),
    env: z.string().nullable().optional().describe('Environment variables'),
    buildArgs: z.string().nullable().optional().describe('Docker build arguments'),
    memoryReservation: z.number().nullable().optional().describe('Memory reservation in bytes'),
    memoryLimit: z.number().nullable().optional().describe('Memory limit in bytes'),
    cpuReservation: z.number().nullable().optional().describe('CPU reservation'),
    cpuLimit: z.number().nullable().optional().describe('CPU limit'),
    title: z.string().nullable().optional().describe('Display title'),
    enabled: z.boolean().optional().describe('Whether the application is enabled'),
    subtitle: z.string().nullable().optional().describe('Display subtitle'),
    command: z.string().nullable().optional().describe('Custom start command'),
    publishDirectory: z
      .string()
      .nullable()
      .optional()
      .describe('Publish directory for static builds'),
    dockerfile: z.string().nullable().optional().describe('Dockerfile path or content'),
    dockerContextPath: z.string().optional().describe('Docker build context path'),
    dockerBuildStage: z.string().optional().describe('Docker multi-stage build target'),
    replicas: z.number().optional().describe('Number of replicas to run'),
    applicationStatus: z.string().optional().describe('Application status'),
    buildType: z.string().optional().describe('Build type'),
    autoDeploy: z.boolean().optional().describe('Whether auto-deploy is enabled'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    registryId: z.string().nullable().optional().describe('Docker registry ID'),
    projectId: z.string().optional().describe('Project ID'),
    sourceType: z.string().optional().describe('Source type (github, docker, git, etc.)'),
    healthCheckSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm health check configuration'),
    restartPolicySwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm restart policy configuration'),
    placementSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm placement configuration'),
    updateConfigSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm update configuration'),
    rollbackConfigSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm rollback configuration'),
    modeSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm mode configuration'),
    labelsSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm labels configuration'),
    networkSwarm: z.array(z.any()).nullable().optional().describe('Swarm network configuration'),
    resourcesSwarm: z
      .record(z.string(), z.any())
      .nullable()
      .optional()
      .describe('Swarm resources configuration'),
  }).strict(),
  endpoint: '/application.update',
})

const deleteApp = postTool({
  name: 'dokploy_application_delete',
  title: 'Delete Application',
  description:
    'Permanently delete an application from Dokploy. This action is irreversible and will remove all associated data including deployments, logs, environment variables, and domain configurations. Requires the application ID.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to delete'),
  }).strict(),
  endpoint: '/application.delete',
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: 'dokploy_application_move',
  title: 'Move Application',
  description:
    'Move an application from its current project to a different Dokploy project. Requires both the application ID and the target project ID. The application retains all its configuration and deployment settings after the move.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to move'),
    targetProjectId: z.string().min(1).describe('The target project ID'),
  }).strict(),
  endpoint: '/application.move',
})

const deploy = postTool({
  name: 'dokploy_application_deploy',
  title: 'Deploy Application',
  description:
    'Trigger a new deployment for an application in Dokploy. Builds the application from its configured source (GitHub, Docker image, Git, etc.) and deploys it to the target server. Requires the application ID. Returns deployment status information.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to deploy'),
  }).strict(),
  endpoint: '/application.deploy',
})

const redeploy = postTool({
  name: 'dokploy_application_redeploy',
  title: 'Redeploy Application',
  description:
    'Force a full redeploy of an application in Dokploy, rebuilding it from source and restarting all containers. Unlike a regular deploy, this always triggers a fresh build regardless of whether the source has changed. Requires the application ID.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to redeploy'),
  }).strict(),
  endpoint: '/application.redeploy',
})

const start = postTool({
  name: 'dokploy_application_start',
  title: 'Start Application',
  description:
    'Start a previously stopped application in Dokploy. Brings up the application containers using the last successful deployment configuration. Requires the application ID. The application must have been deployed at least once before it can be started.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to start'),
  }).strict(),
  endpoint: '/application.start',
})

const stop = postTool({
  name: 'dokploy_application_stop',
  title: 'Stop Application',
  description:
    'Stop a running application in Dokploy, shutting down all its containers. The application configuration and data are preserved and it can be restarted later. Requires the application ID. This is a destructive action as it causes downtime.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID to stop'),
  }).strict(),
  endpoint: '/application.stop',
  annotations: { destructiveHint: true },
})

const cancelDeployment = postTool({
  name: 'dokploy_application_cancel_deployment',
  title: 'Cancel Deployment',
  description:
    'Cancel an in-progress deployment for an application in Dokploy. Stops the current build or deployment process and leaves the application in its previous state. Requires the application ID. Useful when a deployment is stuck or was triggered accidentally.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.cancelDeployment',
})

const reload = postTool({
  name: 'dokploy_application_reload',
  title: 'Reload Application',
  description:
    'Reload an application in Dokploy without performing a full redeploy. Restarts the application containers using the existing built image, which is faster than a complete rebuild. Requires both the application ID and the app name.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    appName: z.string().min(1).describe('The app name to reload'),
  }).strict(),
  endpoint: '/application.reload',
})

const markRunning = postTool({
  name: 'dokploy_application_mark_running',
  title: 'Mark Application Running',
  description:
    'Manually mark an application as running in Dokploy. This is an administrative action used to correct the application status when it becomes out of sync with the actual container state. Requires the application ID.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.markRunning',
})

const cleanQueues = postTool({
  name: 'dokploy_application_clean_queues',
  title: 'Clean Deployment Queues',
  description:
    'Clean the deployment queues for an application in Dokploy. Removes any pending or stuck deployment jobs from the queue. Requires the application ID. Useful when deployments are queued but not processing correctly.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.cleanQueues',
  annotations: { destructiveHint: true },
})

const refreshToken = postTool({
  name: 'dokploy_application_refresh_token',
  title: 'Refresh Webhook Token',
  description:
    'Refresh the webhook token for an application in Dokploy. Generates a new unique token used for triggering deployments via webhook URLs. The previous token will be invalidated immediately. Requires the application ID.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.refreshToken',
})

const saveBuildType = postTool({
  name: 'dokploy_application_save_build_type',
  title: 'Save Build Type',
  description:
    'Set the build type and related build settings for an application in Dokploy. Requires the application ID and a build type (dockerfile, heroku, nixpacks, buildpacks, or docker). Optionally configure the Docker build context path and multi-stage build target stage.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    buildType: z
      .enum(['dockerfile', 'heroku', 'nixpacks', 'buildpacks', 'docker'])
      .describe('The build type to use'),
    dockerContextPath: z.string().optional().describe('Docker build context path'),
    dockerBuildStage: z.string().optional().describe('Docker multi-stage build target'),
  }).strict(),
  endpoint: '/application.saveBuildType',
})

const saveEnvironment = postTool({
  name: 'dokploy_application_save_environment',
  title: 'Save Environment Variables',
  description:
    'Save environment variables and Docker build arguments for an application in Dokploy. Requires the application ID. Environment variables are set at runtime while build arguments are available during the Docker build process. Both fields accept newline-separated key=value pairs.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    env: z.string().nullable().optional().describe('Environment variables'),
    buildArgs: z.string().nullable().optional().describe('Docker build arguments'),
  }).strict(),
  endpoint: '/application.saveEnvironment',
})

const saveGithubProvider = postTool({
  name: 'dokploy_application_save_github_provider',
  title: 'Configure GitHub Provider',
  description:
    'Configure a GitHub repository as the source for an application in Dokploy. Requires the application ID and the GitHub repository owner. Optionally specify the repository name, branch, build path, GitHub App installation ID, submodule support, watch paths for auto-deploy, and trigger type (push or tag).',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    owner: z.string().min(1).describe('GitHub repository owner'),
    repository: z.string().optional().describe('GitHub repository name'),
    branch: z.string().optional().describe('Branch to deploy from'),
    buildPath: z.string().optional().describe('Build path within the repo'),
    githubId: z.number().optional().describe('GitHub App installation ID'),
    enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
    watchPaths: z.array(z.string()).optional().describe('Paths to watch for auto-deploy triggers'),
    triggerType: z.enum(['push', 'tag']).optional().describe('Event type that triggers deployment'),
  }).strict(),
  endpoint: '/application.saveGithubProvider',
})

const saveGitlabProvider = postTool({
  name: 'dokploy_application_save_gitlab_provider',
  title: 'Configure GitLab Provider',
  description:
    'Configure a GitLab repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the GitLab branch, build path, repository owner and name, integration ID, project ID, path namespace, submodule support, and watch paths for auto-deploy triggers.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    gitlabBranch: z.string().optional().describe('GitLab branch'),
    gitlabBuildPath: z.string().optional().describe('Build path within the repo'),
    gitlabOwner: z.string().optional().describe('GitLab repository owner'),
    gitlabRepository: z.string().optional().describe('GitLab repository name'),
    gitlabId: z.number().optional().describe('GitLab integration ID'),
    gitlabProjectId: z.number().optional().describe('GitLab project ID'),
    gitlabPathNamespace: z.string().optional().describe('GitLab path namespace'),
    enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
    watchPaths: z.array(z.string()).optional().describe('Paths to watch for auto-deploy triggers'),
  }).strict(),
  endpoint: '/application.saveGitlabProvider',
})

const saveBitbucketProvider = postTool({
  name: 'dokploy_application_save_bitbucket_provider',
  title: 'Configure Bitbucket Provider',
  description:
    'Configure a Bitbucket repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Bitbucket branch, build path, repository owner and name, integration ID, submodule support, and watch paths for auto-deploy triggers.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    bitbucketBranch: z.string().optional().describe('Bitbucket branch'),
    bitbucketBuildPath: z.string().optional().describe('Build path within the repo'),
    bitbucketOwner: z.string().optional().describe('Bitbucket repository owner'),
    bitbucketRepository: z.string().optional().describe('Bitbucket repository name'),
    bitbucketId: z.string().optional().describe('Bitbucket integration ID'),
    enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
    watchPaths: z.array(z.string()).optional().describe('Paths to watch for auto-deploy triggers'),
  }).strict(),
  endpoint: '/application.saveBitbucketProvider',
})

const saveGiteaProvider = postTool({
  name: 'dokploy_application_save_gitea_provider',
  title: 'Configure Gitea Provider',
  description:
    'Configure a Gitea repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Gitea branch, build path, repository owner and name, integration ID, submodule support, and watch paths for auto-deploy triggers.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    giteaBranch: z.string().optional().describe('Gitea branch'),
    giteaBuildPath: z.string().optional().describe('Build path within the repo'),
    giteaOwner: z.string().optional().describe('Gitea repository owner'),
    giteaRepository: z.string().optional().describe('Gitea repository name'),
    giteaId: z.number().optional().describe('Gitea integration ID'),
    enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
    watchPaths: z.array(z.string()).optional().describe('Paths to watch for auto-deploy triggers'),
  }).strict(),
  endpoint: '/application.saveGiteaProvider',
})

const saveGitProvider = postTool({
  name: 'dokploy_application_save_git_provider',
  title: 'Configure Custom Git Provider',
  description:
    'Configure a custom Git repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Git URL, branch, build path, SSH key ID for authentication, submodule support, and watch paths for auto-deploy triggers. Supports any Git-compatible repository.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    customGitUrl: z.string().optional().describe('Custom Git repository URL'),
    customGitBranch: z.string().optional().describe('Branch to deploy from'),
    customGitBuildPath: z.string().optional().describe('Build path within the repo'),
    customGitSSHKeyId: z.string().nullable().optional().describe('SSH key ID for authentication'),
    enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
    watchPaths: z.array(z.string()).optional().describe('Paths to watch for auto-deploy triggers'),
  }).strict(),
  endpoint: '/application.saveGitProvider',
})

const saveDockerProvider = postTool({
  name: 'dokploy_application_save_docker_provider',
  title: 'Configure Docker Provider',
  description:
    'Configure a Docker image as the source for an application in Dokploy. Requires the application ID and a Docker image name (e.g., nginx:latest). Optionally provide registry credentials (username and password) for pulling from private registries.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    dockerImage: z.string().min(1).describe('Docker image name (e.g., nginx:latest)'),
    username: z.string().optional().describe('Registry username for private images'),
    password: z.string().optional().describe('Registry password for private images'),
  }).strict(),
  endpoint: '/application.saveDockerProvider',
})

const disconnectGitProvider = postTool({
  name: 'dokploy_application_disconnect_git_provider',
  title: 'Disconnect Git Provider',
  description:
    'Disconnect the current Git provider from an application in Dokploy. Removes the source repository configuration (GitHub, GitLab, Bitbucket, Gitea, or custom Git) from the application. Requires the application ID. The application will need a new source configured before it can be deployed again.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.disconnectGitProvider',
  annotations: { destructiveHint: true },
})

const readAppMonitoring = getTool({
  name: 'dokploy_application_read_app_monitoring',
  title: 'Read Application Monitoring',
  description:
    'Read monitoring data for an application in Dokploy. Returns resource usage metrics including CPU utilization, memory consumption, network I/O, and disk usage. Requires the app name (not the application ID). Useful for monitoring application health and performance.',
  schema: z.object({
    appName: z.string().min(1).describe('The app name to read monitoring for'),
  }).strict(),
  endpoint: '/application.readAppMonitoring',
})

const readTraefikConfig = getTool({
  name: 'dokploy_application_read_traefik_config',
  title: 'Read Traefik Configuration',
  description:
    'Read the Traefik reverse proxy configuration for an application in Dokploy. Returns the current Traefik routing rules, middleware settings, and TLS configuration associated with the application. Requires the application ID.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }).strict(),
  endpoint: '/application.readTraefikConfig',
})

const updateTraefikConfig = postTool({
  name: 'dokploy_application_update_traefik_config',
  title: 'Update Traefik Configuration',
  description:
    'Update the Traefik reverse proxy configuration for an application in Dokploy. Requires the application ID and the new Traefik configuration content as a string. Allows customization of routing rules, middleware, TLS settings, and other Traefik-specific options.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
    traefikConfig: z.string().min(1).describe('The new Traefik configuration content'),
  }).strict(),
  endpoint: '/application.updateTraefikConfig',
})

// ── export ───────────────────────────────────────────────────────────
export const applicationTools: ToolDefinition[] = [
  create,
  one,
  update,
  deleteApp,
  move,
  deploy,
  redeploy,
  start,
  stop,
  cancelDeployment,
  reload,
  markRunning,
  cleanQueues,
  refreshToken,
  saveBuildType,
  saveEnvironment,
  saveGithubProvider,
  saveGitlabProvider,
  saveBitbucketProvider,
  saveGiteaProvider,
  saveGitProvider,
  saveDockerProvider,
  disconnectGitProvider,
  readAppMonitoring,
  readTraefikConfig,
  updateTraefikConfig,
]
