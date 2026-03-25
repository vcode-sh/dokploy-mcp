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
const nullableUnknown = z.unknown().nullable().optional()

const create = postTool({
  name: 'dokploy_application_create',
  title: 'Create Application',
  description:
    'Create a new application within a Dokploy environment. Requires an environment ID and application name. Optionally specify a custom app name, description, and target server for deployment. Returns the created application object with its generated ID.',
  schema: z
    .object({
      name: z.string().min(1).describe('The name of the application'),
      environmentId: z.string().min(1).describe('The environment ID to create the application in'),
      appName: appNameSchema.optional(),
      description: nullableString.describe('Application description'),
      serverId: z.string().nullable().optional().describe('Target server ID for deployment'),
    })
    .strict(),
  endpoint: '/application.create',
})

const one = getTool({
  name: 'dokploy_application_one',
  title: 'Get Application Details',
  description:
    'Retrieve detailed information about a single Dokploy application by its unique ID. Returns the full application object including its configuration, build settings, source provider, environment variables, resource limits, deployment status, and associated domains.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.one',
})

const update = postTool({
  name: 'dokploy_application_update',
  title: 'Update Application',
  description:
    "Update an existing application's configuration in Dokploy. Requires the application ID and accepts a wide range of optional fields including name, environment variables, resource limits (CPU and memory), build settings, Docker Swarm configuration, and deployment options. Only provided fields are modified; omitted fields remain unchanged.",
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      name: z.string().optional().describe('Application name'),
      appName: appNameSchema.optional(),
      description: nullableString.describe('Application description'),
      env: nullableString.describe('Environment variables'),
      previewEnv: nullableString.describe('Preview environment variables'),
      watchPaths: nullableStringArray.describe('Paths to watch for deploy triggers'),
      previewBuildArgs: nullableString.describe('Preview build arguments'),
      previewBuildSecrets: nullableString.describe('Preview build secrets'),
      previewLabels: nullableStringArray.describe('Preview labels'),
      previewWildcard: nullableString.describe('Preview wildcard'),
      previewPort: nullableNumber.describe('Preview port'),
      previewHttps: z.boolean().optional().describe('Whether preview HTTPS is enabled'),
      previewPath: nullableString.describe('Preview path'),
      previewCertificateType: z
        .enum(['letsencrypt', 'none', 'custom'])
        .optional()
        .describe('Preview certificate type'),
      previewCustomCertResolver: nullableString.describe('Preview custom certificate resolver'),
      previewLimit: nullableNumber.describe('Preview deployment limit'),
      isPreviewDeploymentsActive: nullableBoolean.describe(
        'Whether preview deployments are active',
      ),
      previewRequireCollaboratorPermissions: nullableBoolean.describe(
        'Whether preview deployments require collaborator permissions',
      ),
      rollbackActive: nullableBoolean.describe('Whether rollback is active'),
      buildArgs: nullableString.describe('Docker build arguments'),
      buildSecrets: nullableString.describe('Docker build secrets'),
      memoryReservation: nullableString.describe(
        'Memory reservation in bytes (e.g. "268435456" for 256MB)',
      ),
      memoryLimit: nullableString.describe('Memory limit in bytes (e.g. "268435456" for 256MB)'),
      cpuReservation: nullableString.describe(
        'CPU reservation in nanoCPUs (e.g. "500000000" for 0.5 CPU)',
      ),
      cpuLimit: nullableString.describe('CPU limit in nanoCPUs (e.g. "1000000000" for 1 CPU)'),
      title: nullableString.describe('Display title'),
      enabled: nullableBoolean.describe('Whether the application is enabled'),
      subtitle: nullableString.describe('Display subtitle'),
      command: nullableString.describe('Custom start command'),
      args: nullableStringArray.describe('Custom command arguments'),
      refreshToken: nullableString.describe('Webhook token'),
      sourceType: z
        .enum(['github', 'docker', 'git', 'gitlab', 'bitbucket', 'gitea', 'drop'])
        .optional()
        .describe('Source type'),
      cleanCache: nullableBoolean.describe('Whether to clean cache on build'),
      repository: nullableString.describe('Repository name'),
      owner: nullableString.describe('Repository owner'),
      branch: nullableString.describe('Repository branch'),
      buildPath: nullableString.describe('Build path'),
      triggerType: z
        .enum(['push', 'tag'])
        .nullable()
        .optional()
        .describe('Deployment trigger type'),
      autoDeploy: nullableBoolean.describe('Whether auto-deploy is enabled'),
      gitlabProjectId: nullableNumber.describe('GitLab project ID'),
      gitlabRepository: nullableString.describe('GitLab repository'),
      gitlabOwner: nullableString.describe('GitLab owner'),
      gitlabBranch: nullableString.describe('GitLab branch'),
      gitlabBuildPath: nullableString.describe('GitLab build path'),
      gitlabPathNamespace: nullableString.describe('GitLab path namespace'),
      giteaRepository: nullableString.describe('Gitea repository'),
      giteaOwner: nullableString.describe('Gitea owner'),
      giteaBranch: nullableString.describe('Gitea branch'),
      giteaBuildPath: nullableString.describe('Gitea build path'),
      bitbucketRepository: nullableString.describe('Bitbucket repository'),
      bitbucketRepositorySlug: nullableString.describe('Bitbucket repository slug'),
      bitbucketOwner: nullableString.describe('Bitbucket owner'),
      bitbucketBranch: nullableString.describe('Bitbucket branch'),
      bitbucketBuildPath: nullableString.describe('Bitbucket build path'),
      username: nullableString.describe('Registry username'),
      password: nullableString.describe('Registry password'),
      dockerImage: nullableString.describe('Docker image'),
      registryUrl: nullableString.describe('Docker registry URL'),
      customGitUrl: nullableString.describe('Custom Git URL'),
      customGitBranch: nullableString.describe('Custom Git branch'),
      customGitBuildPath: nullableString.describe('Custom Git build path'),
      customGitSSHKeyId: nullableString.describe('Custom Git SSH key ID'),
      enableSubmodules: z.boolean().optional().describe('Whether git submodules are enabled'),
      dockerfile: nullableString.describe('Dockerfile path or content'),
      dockerContextPath: nullableString.describe('Docker build context path'),
      dockerBuildStage: nullableString.describe('Docker multi-stage build target'),
      dropBuildPath: nullableString.describe('Drop build path'),
      healthCheckSwarm: nullableUnknown.describe('Swarm health check configuration'),
      restartPolicySwarm: nullableUnknown.describe('Swarm restart policy configuration'),
      placementSwarm: nullableUnknown.describe('Swarm placement configuration'),
      updateConfigSwarm: nullableUnknown.describe('Swarm update configuration'),
      rollbackConfigSwarm: nullableUnknown.describe('Swarm rollback configuration'),
      modeSwarm: nullableUnknown.describe('Swarm mode configuration'),
      labelsSwarm: nullableUnknown.describe('Swarm labels configuration'),
      networkSwarm: nullableUnknown.describe('Swarm network configuration'),
      stopGracePeriodSwarm: z.number().int().nullable().optional().describe('Stop grace period'),
      endpointSpecSwarm: nullableUnknown.describe('Swarm endpoint specification'),
      ulimitsSwarm: z
        .array(
          z.object({
            Name: z.string().min(1).describe('Ulimit name (e.g. "nofile", "nproc", "memlock")'),
            Soft: z.number().int().min(-1).describe('Soft limit (-1 for unlimited)'),
            Hard: z.number().int().min(-1).describe('Hard limit (-1 for unlimited)'),
          }),
        )
        .nullable()
        .optional()
        .describe('Docker Swarm ulimits, e.g. [{"Name":"nofile","Soft":65535,"Hard":65535}]'),
      replicas: z.number().optional().describe('Number of replicas to run'),
      applicationStatus: z
        .enum(['idle', 'running', 'done', 'error'])
        .optional()
        .describe('Application status'),
      buildType: z
        .enum([
          'dockerfile',
          'heroku_buildpacks',
          'paketo_buildpacks',
          'nixpacks',
          'static',
          'railpack',
        ])
        .optional()
        .describe('Build type'),
      railpackVersion: nullableString.describe('Railpack version'),
      herokuVersion: nullableString.describe('Heroku buildpacks version'),
      publishDirectory: nullableString.describe('Publish directory for static builds'),
      isStaticSpa: nullableBoolean.describe('Whether the application is a static SPA'),
      createEnvFile: z.boolean().optional().describe('Whether to create an env file'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      registryId: nullableString.describe('Docker registry ID'),
      rollbackRegistryId: nullableString.describe('Rollback registry ID'),
      environmentId: z.string().optional().describe('Environment ID'),
      githubId: nullableString.describe('GitHub provider ID'),
      gitlabId: nullableString.describe('GitLab provider ID'),
      giteaId: nullableString.describe('Gitea provider ID'),
      bitbucketId: nullableString.describe('Bitbucket provider ID'),
      buildServerId: nullableString.describe('Build server ID'),
      buildRegistryId: nullableString.describe('Build registry ID'),
    })
    .strict(),
  endpoint: '/application.update',
})

const deleteApp = postTool({
  name: 'dokploy_application_delete',
  title: 'Delete Application',
  description:
    'Permanently delete an application from Dokploy. This action is irreversible and will remove all associated data including deployments, logs, environment variables, and domain configurations. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to delete'),
    })
    .strict(),
  endpoint: '/application.delete',
  annotations: { destructiveHint: true },
})

const move = postTool({
  name: 'dokploy_application_move',
  title: 'Move Application',
  description:
    'Move an application from its current environment to a different Dokploy environment. Requires both the application ID and the target environment ID. The application retains all its configuration and deployment settings after the move.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to move'),
      targetEnvironmentId: z.string().min(1).describe('The target environment ID'),
    })
    .strict(),
  endpoint: '/application.move',
})

const deploy = postTool({
  name: 'dokploy_application_deploy',
  title: 'Deploy Application',
  description:
    'Trigger a new deployment for an application in Dokploy. Builds the application from its configured source (GitHub, Docker image, Git, etc.) and deploys it to the target server. Requires the application ID. Returns deployment status information.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to deploy'),
      title: z.string().optional().describe('Optional deployment title'),
      description: z.string().optional().describe('Optional deployment description'),
    })
    .strict(),
  endpoint: '/application.deploy',
})

const redeploy = postTool({
  name: 'dokploy_application_redeploy',
  title: 'Redeploy Application',
  description:
    'Force a full redeploy of an application in Dokploy, rebuilding it from source and restarting all containers. Unlike a regular deploy, this always triggers a fresh build regardless of whether the source has changed. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to redeploy'),
      title: z.string().optional().describe('Optional deployment title'),
      description: z.string().optional().describe('Optional deployment description'),
    })
    .strict(),
  endpoint: '/application.redeploy',
})

const start = postTool({
  name: 'dokploy_application_start',
  title: 'Start Application',
  description:
    'Start a previously stopped application in Dokploy. Brings up the application containers using the last successful deployment configuration. Requires the application ID. The application must have been deployed at least once before it can be started.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to start'),
    })
    .strict(),
  endpoint: '/application.start',
})

const stop = postTool({
  name: 'dokploy_application_stop',
  title: 'Stop Application',
  description:
    'Stop a running application in Dokploy, shutting down all its containers. The application configuration and data are preserved and it can be restarted later. Requires the application ID. This is a destructive action as it causes downtime.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID to stop'),
    })
    .strict(),
  endpoint: '/application.stop',
  annotations: { destructiveHint: true },
})

const cancelDeployment = postTool({
  name: 'dokploy_application_cancel_deployment',
  title: 'Cancel Deployment',
  description:
    'Cancel an in-progress deployment for an application in Dokploy. Stops the current build or deployment process and leaves the application in its previous state. Requires the application ID. Useful when a deployment is stuck or was triggered accidentally.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.cancelDeployment',
})

const reload = postTool({
  name: 'dokploy_application_reload',
  title: 'Reload Application',
  description:
    'Reload an application in Dokploy without performing a full redeploy. Restarts the application containers using the existing built image, which is faster than a complete rebuild. Requires both the application ID and the app name.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      appName: z.string().min(1).describe('The app name to reload'),
    })
    .strict(),
  endpoint: '/application.reload',
})

const markRunning = postTool({
  name: 'dokploy_application_mark_running',
  title: 'Mark Application Running',
  description:
    'Manually mark an application as running in Dokploy. This is an administrative action used to correct the application status when it becomes out of sync with the actual container state. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.markRunning',
})

const cleanQueues = postTool({
  name: 'dokploy_application_clean_queues',
  title: 'Clean Deployment Queues',
  description:
    'Clean the deployment queues for an application in Dokploy. Removes any pending or stuck deployment jobs from the queue. Requires the application ID. Useful when deployments are queued but not processing correctly.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.cleanQueues',
  annotations: { destructiveHint: true },
})

const refreshToken = postTool({
  name: 'dokploy_application_refresh_token',
  title: 'Refresh Webhook Token',
  description:
    'Refresh the webhook token for an application in Dokploy. Generates a new unique token used for triggering deployments via webhook URLs. The previous token will be invalidated immediately. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.refreshToken',
})

const saveBuildType = postTool({
  name: 'dokploy_application_save_build_type',
  title: 'Save Build Type',
  description:
    'Set the build type and related build settings for an application in Dokploy. Requires the application ID and build-type payload fields defined by the Dokploy API.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      buildType: z
        .enum([
          'dockerfile',
          'heroku_buildpacks',
          'paketo_buildpacks',
          'nixpacks',
          'static',
          'railpack',
        ])
        .describe('The build type to use'),
      dockerfile: z.string().nullable().describe('Dockerfile path or content'),
      dockerContextPath: z.string().nullable().describe('Docker build context path'),
      dockerBuildStage: z.string().nullable().describe('Docker multi-stage build target'),
      herokuVersion: z.string().nullable().describe('Heroku buildpacks version'),
      railpackVersion: z.string().nullable().describe('Railpack version'),
      publishDirectory: z.string().nullable().optional().describe('Publish directory'),
      isStaticSpa: z.boolean().nullable().optional().describe('Whether the build is a static SPA'),
    })
    .strict(),
  endpoint: '/application.saveBuildType',
})

const saveEnvironment = postTool({
  name: 'dokploy_application_save_environment',
  title: 'Save Environment Variables',
  description:
    'Save environment variables and Docker build arguments for an application in Dokploy. Requires the application ID. Environment variables are set at runtime while build arguments are available during the Docker build process. Both fields accept newline-separated key=value pairs.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      env: z.string().nullable().describe('Environment variables'),
      buildArgs: z.string().nullable().describe('Docker build arguments'),
      buildSecrets: z.string().nullable().describe('Docker build secrets'),
      createEnvFile: z.boolean().describe('Whether to create an env file'),
    })
    .strict(),
  endpoint: '/application.saveEnvironment',
})

const saveGithubProvider = postTool({
  name: 'dokploy_application_save_github_provider',
  title: 'Configure GitHub Provider',
  description:
    'Configure a GitHub repository as the source for an application in Dokploy. Requires the application ID and the GitHub repository owner. Optionally specify the repository name, branch, build path, GitHub App installation ID, submodule support, watch paths for auto-deploy, and trigger type (push or tag).',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      owner: z.string().min(1).describe('GitHub repository owner'),
      repository: z.string().optional().describe('GitHub repository name'),
      branch: z.string().optional().describe('Branch to deploy from'),
      buildPath: z.string().optional().describe('Build path within the repo'),
      githubId: z.number().optional().describe('GitHub App installation ID'),
      enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
      watchPaths: z
        .array(z.string())
        .optional()
        .describe('Paths to watch for auto-deploy triggers'),
      triggerType: z
        .enum(['push', 'tag'])
        .optional()
        .describe('Event type that triggers deployment'),
    })
    .strict(),
  endpoint: '/application.saveGithubProvider',
})

const saveGitlabProvider = postTool({
  name: 'dokploy_application_save_gitlab_provider',
  title: 'Configure GitLab Provider',
  description:
    'Configure a GitLab repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the GitLab branch, build path, repository owner and name, integration ID, project ID, path namespace, submodule support, and watch paths for auto-deploy triggers.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      gitlabBranch: z.string().optional().describe('GitLab branch'),
      gitlabBuildPath: z.string().optional().describe('Build path within the repo'),
      gitlabOwner: z.string().optional().describe('GitLab repository owner'),
      gitlabRepository: z.string().optional().describe('GitLab repository name'),
      gitlabId: z.number().optional().describe('GitLab integration ID'),
      gitlabProjectId: z.number().optional().describe('GitLab project ID'),
      gitlabPathNamespace: z.string().optional().describe('GitLab path namespace'),
      enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
      watchPaths: z
        .array(z.string())
        .optional()
        .describe('Paths to watch for auto-deploy triggers'),
    })
    .strict(),
  endpoint: '/application.saveGitlabProvider',
})

const saveBitbucketProvider = postTool({
  name: 'dokploy_application_save_bitbucket_provider',
  title: 'Configure Bitbucket Provider',
  description:
    'Configure a Bitbucket repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Bitbucket branch, build path, repository owner and name, integration ID, submodule support, and watch paths for auto-deploy triggers.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      bitbucketBranch: z.string().nullable().describe('Bitbucket branch'),
      bitbucketBuildPath: z.string().nullable().describe('Build path within the repo'),
      bitbucketOwner: z.string().nullable().describe('Bitbucket repository owner'),
      bitbucketRepository: z.string().nullable().describe('Bitbucket repository name'),
      bitbucketRepositorySlug: z.string().nullable().describe('Bitbucket repository slug'),
      bitbucketId: z.string().nullable().describe('Bitbucket integration ID'),
      enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
      watchPaths: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Paths to watch for auto-deploy triggers'),
    })
    .strict(),
  endpoint: '/application.saveBitbucketProvider',
})

const saveGiteaProvider = postTool({
  name: 'dokploy_application_save_gitea_provider',
  title: 'Configure Gitea Provider',
  description:
    'Configure a Gitea repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Gitea branch, build path, repository owner and name, integration ID, submodule support, and watch paths for auto-deploy triggers.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      giteaBranch: z.string().optional().describe('Gitea branch'),
      giteaBuildPath: z.string().optional().describe('Build path within the repo'),
      giteaOwner: z.string().optional().describe('Gitea repository owner'),
      giteaRepository: z.string().optional().describe('Gitea repository name'),
      giteaId: z.number().optional().describe('Gitea integration ID'),
      enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
      watchPaths: z
        .array(z.string())
        .optional()
        .describe('Paths to watch for auto-deploy triggers'),
    })
    .strict(),
  endpoint: '/application.saveGiteaProvider',
})

const saveGitProvider = postTool({
  name: 'dokploy_application_save_git_provider',
  title: 'Configure Custom Git Provider',
  description:
    'Configure a custom Git repository as the source for an application in Dokploy. Requires the application ID. Optionally specify the Git URL, branch, build path, SSH key ID for authentication, submodule support, and watch paths for auto-deploy triggers. Supports any Git-compatible repository.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      customGitUrl: z.string().optional().describe('Custom Git repository URL'),
      customGitBranch: z.string().optional().describe('Branch to deploy from'),
      customGitBuildPath: z.string().optional().describe('Build path within the repo'),
      customGitSSHKeyId: z.string().nullable().optional().describe('SSH key ID for authentication'),
      enableSubmodules: z.boolean().optional().describe('Whether to initialize git submodules'),
      watchPaths: z
        .array(z.string())
        .optional()
        .describe('Paths to watch for auto-deploy triggers'),
    })
    .strict(),
  endpoint: '/application.saveGitProvider',
})

const saveDockerProvider = postTool({
  name: 'dokploy_application_save_docker_provider',
  title: 'Configure Docker Provider',
  description:
    'Configure a Docker image as the source for an application in Dokploy. Requires the application ID and the Docker provider payload defined by the Dokploy API.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      dockerImage: z.string().nullable().describe('Docker image name (e.g., nginx:latest)'),
      username: z.string().nullable().describe('Registry username for private images'),
      password: z.string().nullable().describe('Registry password for private images'),
      registryUrl: z.string().nullable().describe('Docker registry URL'),
    })
    .strict(),
  endpoint: '/application.saveDockerProvider',
})

const disconnectGitProvider = postTool({
  name: 'dokploy_application_disconnect_git_provider',
  title: 'Disconnect Git Provider',
  description:
    'Disconnect the current Git provider from an application in Dokploy. Removes the source repository configuration (GitHub, GitLab, Bitbucket, Gitea, or custom Git) from the application. Requires the application ID. The application will need a new source configured before it can be deployed again.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.disconnectGitProvider',
  annotations: { destructiveHint: true },
})

const readAppMonitoring = getTool({
  name: 'dokploy_application_read_app_monitoring',
  title: 'Read Application Monitoring',
  description:
    'Read monitoring data for an application in Dokploy. Returns resource usage metrics including CPU utilization, memory consumption, network I/O, and disk usage. Requires the app name (not the application ID). Useful for monitoring application health and performance.',
  schema: z
    .object({
      appName: z.string().min(1).describe('The app name to read monitoring for'),
    })
    .strict(),
  endpoint: '/application.readAppMonitoring',
})

const readTraefikConfig = getTool({
  name: 'dokploy_application_read_traefik_config',
  title: 'Read Traefik Configuration',
  description:
    'Read the Traefik reverse proxy configuration for an application in Dokploy. Returns the current Traefik routing rules, middleware settings, and TLS configuration associated with the application. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.readTraefikConfig',
})

const updateTraefikConfig = postTool({
  name: 'dokploy_application_update_traefik_config',
  title: 'Update Traefik Configuration',
  description:
    'Update the Traefik reverse proxy configuration for an application in Dokploy. Requires the application ID and the new Traefik configuration content as a string. Allows customization of routing rules, middleware, TLS settings, and other Traefik-specific options.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
      traefikConfig: z.string().min(1).describe('The new Traefik configuration content'),
    })
    .strict(),
  endpoint: '/application.updateTraefikConfig',
})

const clearDeployments = postTool({
  name: 'dokploy_application_clear_deployments',
  title: 'Clear Application Deployments',
  description:
    'Clear deployment history for an application in Dokploy. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.clearDeployments',
  annotations: { destructiveHint: true },
})

const killBuild = postTool({
  name: 'dokploy_application_kill_build',
  title: 'Kill Application Build',
  description: 'Stop an in-progress application build in Dokploy. Requires the application ID.',
  schema: z
    .object({
      applicationId: z.string().min(1).describe('The unique application ID'),
    })
    .strict(),
  endpoint: '/application.killBuild',
  annotations: { destructiveHint: true },
})

const search = getTool({
  name: 'dokploy_application_search',
  title: 'Search Applications',
  description:
    'Search Dokploy applications by free text or field-specific filters. Supports pagination through limit and offset.',
  schema: z
    .object({
      q: z.string().optional().describe('Free-text query'),
      name: z.string().optional().describe('Application name'),
      appName: z.string().optional().describe('Internal app name'),
      description: z.string().optional().describe('Application description'),
      repository: z.string().optional().describe('Repository name'),
      owner: z.string().optional().describe('Repository owner'),
      dockerImage: z.string().optional().describe('Docker image'),
      projectId: z.string().optional().describe('Project ID'),
      environmentId: z.string().optional().describe('Environment ID'),
      limit: z.number().min(1).max(100).optional().describe('Maximum number of results'),
      offset: z.number().min(0).optional().describe('Number of results to skip'),
    })
    .strict(),
  endpoint: '/application.search',
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
  clearDeployments,
  killBuild,
  search,
]
