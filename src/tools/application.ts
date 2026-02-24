import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: "application-create",
  description: "Create a new application within a project.",
  schema: z.object({
    name: z.string().min(1).describe("The name of the application"),
    projectId: z
      .string()
      .min(1)
      .describe("The project ID to create the application in"),
    appName: z
      .string()
      .optional()
      .describe("Custom app name (auto-generated if not provided)"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Application description"),
    serverId: z
      .string()
      .nullable()
      .optional()
      .describe("Target server ID for deployment"),
  }),
  endpoint: "/application.create",
});

const one = getTool({
  name: "application-one",
  description: "Get detailed information about a single application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.one",
});

const update = postTool({
  name: "application-update",
  description: "Update an existing application's configuration.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    name: z.string().optional().describe("Application name"),
    appName: z.string().optional().describe("Internal app name"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Application description"),
    env: z
      .string()
      .nullable()
      .optional()
      .describe("Environment variables"),
    buildArgs: z
      .string()
      .nullable()
      .optional()
      .describe("Docker build arguments"),
    memoryReservation: z
      .number()
      .nullable()
      .optional()
      .describe("Memory reservation in bytes"),
    memoryLimit: z
      .number()
      .nullable()
      .optional()
      .describe("Memory limit in bytes"),
    cpuReservation: z
      .number()
      .nullable()
      .optional()
      .describe("CPU reservation"),
    cpuLimit: z.number().nullable().optional().describe("CPU limit"),
    title: z.string().nullable().optional().describe("Display title"),
    enabled: z
      .boolean()
      .optional()
      .describe("Whether the application is enabled"),
    subtitle: z
      .string()
      .nullable()
      .optional()
      .describe("Display subtitle"),
    command: z
      .string()
      .nullable()
      .optional()
      .describe("Custom start command"),
    publishDirectory: z
      .string()
      .nullable()
      .optional()
      .describe("Publish directory for static builds"),
    dockerfile: z
      .string()
      .nullable()
      .optional()
      .describe("Dockerfile path or content"),
    dockerContextPath: z
      .string()
      .optional()
      .describe("Docker build context path"),
    dockerBuildStage: z
      .string()
      .optional()
      .describe("Docker multi-stage build target"),
    replicas: z
      .number()
      .optional()
      .describe("Number of replicas to run"),
    applicationStatus: z
      .string()
      .optional()
      .describe("Application status"),
    buildType: z.string().optional().describe("Build type"),
    autoDeploy: z
      .boolean()
      .optional()
      .describe("Whether auto-deploy is enabled"),
    createdAt: z.string().optional().describe("Creation timestamp"),
    registryId: z
      .string()
      .nullable()
      .optional()
      .describe("Docker registry ID"),
    projectId: z.string().optional().describe("Project ID"),
    sourceType: z
      .string()
      .optional()
      .describe("Source type (github, docker, git, etc.)"),
    healthCheckSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm health check configuration"),
    restartPolicySwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm restart policy configuration"),
    placementSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm placement configuration"),
    updateConfigSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm update configuration"),
    rollbackConfigSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm rollback configuration"),
    modeSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm mode configuration"),
    labelsSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm labels configuration"),
    networkSwarm: z
      .array(z.any())
      .nullable()
      .optional()
      .describe("Swarm network configuration"),
    resourcesSwarm: z
      .record(z.any())
      .nullable()
      .optional()
      .describe("Swarm resources configuration"),
  }),
  endpoint: "/application.update",
});

const deleteApp = postTool({
  name: "application-delete",
  description:
    "Delete an application. This action is irreversible and will remove all associated data.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to delete"),
  }),
  endpoint: "/application.delete",
  annotations: { destructiveHint: true },
});

const move = postTool({
  name: "application-move",
  description: "Move an application to a different project.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to move"),
    targetProjectId: z
      .string()
      .min(1)
      .describe("The target project ID"),
  }),
  endpoint: "/application.move",
});

const deploy = postTool({
  name: "application-deploy",
  description: "Deploy an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to deploy"),
  }),
  endpoint: "/application.deploy",
});

const redeploy = postTool({
  name: "application-redeploy",
  description: "Redeploy an application (rebuild and restart).",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to redeploy"),
  }),
  endpoint: "/application.redeploy",
});

const start = postTool({
  name: "application-start",
  description: "Start a stopped application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to start"),
  }),
  endpoint: "/application.start",
});

const stop = postTool({
  name: "application-stop",
  description: "Stop a running application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID to stop"),
  }),
  endpoint: "/application.stop",
  annotations: { destructiveHint: true },
});

const cancelDeployment = postTool({
  name: "application-cancelDeployment",
  description: "Cancel an in-progress deployment.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.cancelDeployment",
});

const reload = postTool({
  name: "application-reload",
  description: "Reload an application without a full redeploy.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    appName: z.string().min(1).describe("The app name to reload"),
  }),
  endpoint: "/application.reload",
});

const markRunning = postTool({
  name: "application-markRunning",
  description: "Manually mark an application as running.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.markRunning",
});

const cleanQueues = postTool({
  name: "application-cleanQueues",
  description: "Clean the deployment queues for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.cleanQueues",
});

const refreshToken = postTool({
  name: "application-refreshToken",
  description: "Refresh the webhook token for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.refreshToken",
});

const saveBuildType = postTool({
  name: "application-saveBuildType",
  description: "Set the build type and related settings for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    buildType: z
      .enum(["dockerfile", "heroku", "nixpacks", "buildpacks", "docker"])
      .describe("The build type to use"),
    dockerContextPath: z
      .string()
      .optional()
      .describe("Docker build context path"),
    dockerBuildStage: z
      .string()
      .optional()
      .describe("Docker multi-stage build target"),
  }),
  endpoint: "/application.saveBuildType",
});

const saveEnvironment = postTool({
  name: "application-saveEnvironment",
  description:
    "Save environment variables and build arguments for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    env: z
      .string()
      .nullable()
      .optional()
      .describe("Environment variables"),
    buildArgs: z
      .string()
      .nullable()
      .optional()
      .describe("Docker build arguments"),
  }),
  endpoint: "/application.saveEnvironment",
});

const saveGithubProvider = postTool({
  name: "application-saveGithubProvider",
  description:
    "Configure a GitHub repository as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    owner: z.string().min(1).describe("GitHub repository owner"),
    repository: z.string().optional().describe("GitHub repository name"),
    branch: z.string().optional().describe("Branch to deploy from"),
    buildPath: z.string().optional().describe("Build path within the repo"),
    githubId: z
      .number()
      .optional()
      .describe("GitHub App installation ID"),
    enableSubmodules: z
      .boolean()
      .optional()
      .describe("Whether to initialize git submodules"),
    watchPaths: z
      .array(z.string())
      .optional()
      .describe("Paths to watch for auto-deploy triggers"),
    triggerType: z
      .enum(["push", "tag"])
      .optional()
      .describe("Event type that triggers deployment"),
  }),
  endpoint: "/application.saveGithubProvider",
});

const saveGitlabProvider = postTool({
  name: "application-saveGitlabProvider",
  description:
    "Configure a GitLab repository as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    gitlabBranch: z.string().optional().describe("GitLab branch"),
    gitlabBuildPath: z
      .string()
      .optional()
      .describe("Build path within the repo"),
    gitlabOwner: z.string().optional().describe("GitLab repository owner"),
    gitlabRepository: z
      .string()
      .optional()
      .describe("GitLab repository name"),
    gitlabId: z.number().optional().describe("GitLab integration ID"),
    gitlabProjectId: z
      .number()
      .optional()
      .describe("GitLab project ID"),
    gitlabPathNamespace: z
      .string()
      .optional()
      .describe("GitLab path namespace"),
    enableSubmodules: z
      .boolean()
      .optional()
      .describe("Whether to initialize git submodules"),
    watchPaths: z
      .array(z.string())
      .optional()
      .describe("Paths to watch for auto-deploy triggers"),
  }),
  endpoint: "/application.saveGitlabProvider",
});

const saveBitbucketProvider = postTool({
  name: "application-saveBitbucketProvider",
  description:
    "Configure a Bitbucket repository as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    bitbucketBranch: z
      .string()
      .optional()
      .describe("Bitbucket branch"),
    bitbucketBuildPath: z
      .string()
      .optional()
      .describe("Build path within the repo"),
    bitbucketOwner: z
      .string()
      .optional()
      .describe("Bitbucket repository owner"),
    bitbucketRepository: z
      .string()
      .optional()
      .describe("Bitbucket repository name"),
    bitbucketId: z
      .string()
      .optional()
      .describe("Bitbucket integration ID"),
    enableSubmodules: z
      .boolean()
      .optional()
      .describe("Whether to initialize git submodules"),
    watchPaths: z
      .array(z.string())
      .optional()
      .describe("Paths to watch for auto-deploy triggers"),
  }),
  endpoint: "/application.saveBitbucketProvider",
});

const saveGiteaProvider = postTool({
  name: "application-saveGiteaProvider",
  description:
    "Configure a Gitea repository as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    giteaBranch: z.string().optional().describe("Gitea branch"),
    giteaBuildPath: z
      .string()
      .optional()
      .describe("Build path within the repo"),
    giteaOwner: z.string().optional().describe("Gitea repository owner"),
    giteaRepository: z
      .string()
      .optional()
      .describe("Gitea repository name"),
    giteaId: z.number().optional().describe("Gitea integration ID"),
    enableSubmodules: z
      .boolean()
      .optional()
      .describe("Whether to initialize git submodules"),
    watchPaths: z
      .array(z.string())
      .optional()
      .describe("Paths to watch for auto-deploy triggers"),
  }),
  endpoint: "/application.saveGiteaProvider",
});

const saveGitProvider = postTool({
  name: "application-saveGitProvider",
  description:
    "Configure a custom Git repository as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    customGitUrl: z
      .string()
      .optional()
      .describe("Custom Git repository URL"),
    customGitBranch: z
      .string()
      .optional()
      .describe("Branch to deploy from"),
    customGitBuildPath: z
      .string()
      .optional()
      .describe("Build path within the repo"),
    customGitSSHKeyId: z
      .string()
      .nullable()
      .optional()
      .describe("SSH key ID for authentication"),
    enableSubmodules: z
      .boolean()
      .optional()
      .describe("Whether to initialize git submodules"),
    watchPaths: z
      .array(z.string())
      .optional()
      .describe("Paths to watch for auto-deploy triggers"),
  }),
  endpoint: "/application.saveGitProdiver",
});

const saveDockerProvider = postTool({
  name: "application-saveDockerProvider",
  description: "Configure a Docker image as the source for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    dockerImage: z
      .string()
      .min(1)
      .describe("Docker image name (e.g., nginx:latest)"),
    username: z
      .string()
      .optional()
      .describe("Registry username for private images"),
    password: z
      .string()
      .optional()
      .describe("Registry password for private images"),
  }),
  endpoint: "/application.saveDockerProvider",
});

const disconnectGitProvider = postTool({
  name: "application-disconnectGitProvider",
  description: "Disconnect the current git provider from an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.disconnectGitProvider",
});

const readAppMonitoring = getTool({
  name: "application-readAppMonitoring",
  description: "Read monitoring data for an application.",
  schema: z.object({
    appName: z
      .string()
      .min(1)
      .describe("The app name to read monitoring for"),
  }),
  endpoint: "/application.readAppMonitoring",
});

const readTraefikConfig = getTool({
  name: "application-readTraefikConfig",
  description:
    "Read the Traefik reverse proxy configuration for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/application.readTraefikConfig",
});

const updateTraefikConfig = postTool({
  name: "application-updateTraefikConfig",
  description:
    "Update the Traefik reverse proxy configuration for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
    traefikConfig: z
      .string()
      .min(1)
      .describe("The new Traefik configuration content"),
  }),
  endpoint: "/application.updateTraefikConfig",
});

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
];
