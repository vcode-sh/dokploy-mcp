import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: "compose-create",
  description: "Create a new Docker Compose service within a project.",
  schema: z.object({
    name: z.string().min(1).describe("The name of the compose service"),
    projectId: z
      .string()
      .min(1)
      .describe("The project ID to create the compose service in"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Compose service description"),
    composeType: z
      .enum(["docker-compose", "stack"])
      .optional()
      .describe("Compose type: docker-compose or stack"),
    appName: z
      .string()
      .optional()
      .describe("Custom app name (auto-generated if not provided)"),
    serverId: z
      .string()
      .nullable()
      .optional()
      .describe("Target server ID for deployment"),
  }),
  endpoint: "/compose.create",
});

const one = getTool({
  name: "compose-one",
  description: "Get detailed information about a single compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.one",
});

const update = postTool({
  name: "compose-update",
  description: "Update an existing compose service configuration.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
    name: z.string().optional().describe("Compose service name"),
    appName: z.string().optional().describe("Internal app name"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Service description"),
    env: z
      .string()
      .nullable()
      .optional()
      .describe("Environment variables"),
    composeFile: z
      .string()
      .nullable()
      .optional()
      .describe("Docker Compose file content"),
    sourceType: z
      .enum(["git", "github", "raw"])
      .optional()
      .describe("Source type for the compose file"),
    composeType: z
      .enum(["docker-compose", "stack"])
      .optional()
      .describe("Compose type: docker-compose or stack"),
    repository: z.string().optional().describe("Git repository name"),
    owner: z.string().optional().describe("Git repository owner"),
    branch: z.string().optional().describe("Git branch"),
    autoDeploy: z
      .boolean()
      .optional()
      .describe("Whether auto-deploy is enabled"),
    customGitUrl: z
      .string()
      .optional()
      .describe("Custom Git repository URL"),
    customGitBranch: z
      .string()
      .optional()
      .describe("Custom Git branch"),
    customGitSSHKey: z
      .string()
      .nullable()
      .optional()
      .describe("SSH key for custom Git authentication"),
    command: z
      .string()
      .nullable()
      .optional()
      .describe("Custom command override"),
    composePath: z
      .string()
      .optional()
      .describe("Path to the compose file within the repo"),
    composeStatus: z
      .string()
      .optional()
      .describe("Compose service status"),
    projectId: z.string().optional().describe("Project ID"),
  }),
  endpoint: "/compose.update",
});

const deleteCompose = postTool({
  name: "compose-delete",
  description:
    "Delete a compose service. This action is irreversible and will remove all associated data.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID to delete"),
  }),
  endpoint: "/compose.delete",
  annotations: { destructiveHint: true },
});

const deploy = postTool({
  name: "compose-deploy",
  description: "Deploy a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID to deploy"),
  }),
  endpoint: "/compose.deploy",
});

const redeploy = postTool({
  name: "compose-redeploy",
  description: "Redeploy a compose service (rebuild and restart).",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID to redeploy"),
  }),
  endpoint: "/compose.redeploy",
});

const stop = postTool({
  name: "compose-stop",
  description: "Stop a running compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID to stop"),
  }),
  endpoint: "/compose.stop",
  annotations: { destructiveHint: true },
});

const cleanQueues = postTool({
  name: "compose-cleanQueues",
  description: "Clean the deployment queues for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.cleanQueues",
});

const allServices = getTool({
  name: "compose-allServices",
  description: "List all services within a compose deployment.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.allServices",
});

const randomizeCompose = postTool({
  name: "compose-randomizeCompose",
  description:
    "Randomize the compose service names with an optional prefix.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
    prefix: z
      .string()
      .optional()
      .describe("Optional prefix for randomized names"),
  }),
  endpoint: "/compose.randomizeCompose",
});

const getDefaultCommand = getTool({
  name: "compose-getDefaultCommand",
  description: "Get the default deploy command for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.getDefaultCommand",
});

const generateSSHKey = postTool({
  name: "compose-generateSSHKey",
  description: "Generate an SSH key pair for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.generateSSHKey",
});

const refreshToken = postTool({
  name: "compose-refreshToken",
  description: "Refresh the webhook token for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.refreshToken",
});

const removeSSHKey = postTool({
  name: "compose-removeSSHKey",
  description: "Remove the SSH key from a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/compose.removeSSHKey",
});

const deployTemplate = postTool({
  name: "compose-deployTemplate",
  description: "Deploy a compose service from a predefined template.",
  schema: z.object({
    projectId: z
      .string()
      .min(1)
      .describe("The project ID to deploy the template in"),
    id: z.string().min(1).describe("The template ID to deploy"),
  }),
  endpoint: "/compose.deployTemplate",
});

const templates = getTool({
  name: "compose-templates",
  description: "List all available compose templates.",
  schema: z.object({}),
  endpoint: "/compose.templates",
});

const saveEnvironment = postTool({
  name: "compose-saveEnvironment",
  description:
    "Save environment variables and build arguments for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
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
  endpoint: "/compose.saveEnvironment",
});

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
  allServices,
  randomizeCompose,
  getDefaultCommand,
  generateSSHKey,
  refreshToken,
  removeSSHKey,
  deployTemplate,
  templates,
  saveEnvironment,
];
