import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const reloadServer = postTool({
  name: "settings-reloadServer",
  description: "Reload the Dokploy server process.",
  schema: z.object({}),
  endpoint: "/settings.reloadServer",
});

const reloadTraefik = postTool({
  name: "settings-reloadTraefik",
  description: "Reload the Traefik reverse proxy configuration.",
  schema: z.object({}),
  endpoint: "/settings.reloadTraefik",
});

const cleanUnusedImages = postTool({
  name: "settings-cleanUnusedImages",
  description: "Remove unused Docker images to free disk space.",
  schema: z.object({}),
  endpoint: "/settings.cleanUnusedImages",
});

const cleanUnusedVolumes = postTool({
  name: "settings-cleanUnusedVolumes",
  description:
    "Remove unused Docker volumes. This action is irreversible and may delete data.",
  schema: z.object({}),
  endpoint: "/settings.cleanUnusedVolumes",
  annotations: { destructiveHint: true },
});

const cleanStoppedContainers = postTool({
  name: "settings-cleanStoppedContainers",
  description:
    "Remove all stopped Docker containers. This action is irreversible.",
  schema: z.object({}),
  endpoint: "/settings.cleanStoppedContainers",
  annotations: { destructiveHint: true },
});

const cleanDockerBuilder = postTool({
  name: "settings-cleanDockerBuilder",
  description: "Clean Docker builder cache to free disk space.",
  schema: z.object({}),
  endpoint: "/settings.cleanDockerBuilder",
});

const cleanDockerPrune = postTool({
  name: "settings-cleanDockerPrune",
  description:
    "Run a full Docker system prune to remove unused resources. This action is irreversible.",
  schema: z.object({}),
  endpoint: "/settings.cleanDockerPrune",
  annotations: { destructiveHint: true },
});

const cleanAll = postTool({
  name: "settings-cleanAll",
  description:
    "Clean all unused Docker resources (images, volumes, containers, builder cache). This action is irreversible.",
  schema: z.object({}),
  endpoint: "/settings.cleanAll",
  annotations: { destructiveHint: true },
});

const cleanMonitoring = postTool({
  name: "settings-cleanMonitoring",
  description:
    "Clear all monitoring data. This action is irreversible.",
  schema: z.object({}),
  endpoint: "/settings.cleanMonitoring",
  annotations: { destructiveHint: true },
});

const saveSSHPrivateKey = postTool({
  name: "settings-saveSSHPrivateKey",
  description: "Save an SSH private key for server access.",
  schema: z.object({
    sshPrivateKey: z
      .string()
      .nullable()
      .describe("The SSH private key content, or null to clear"),
  }),
  endpoint: "/settings.saveSSHPrivateKey",
});

const cleanSSHPrivateKey = postTool({
  name: "settings-cleanSSHPrivateKey",
  description:
    "Remove the stored SSH private key. This action is irreversible.",
  schema: z.object({}),
  endpoint: "/settings.cleanSSHPrivateKey",
  annotations: { destructiveHint: true },
});

const assignDomainServer = postTool({
  name: "settings-assignDomainServer",
  description: "Assign a domain to the Dokploy server with optional SSL.",
  schema: z.object({
    letsEncryptEmail: z
      .string()
      .optional()
      .describe("Email for Let's Encrypt certificate registration"),
    certificateType: z
      .enum(["letsencrypt", "none"])
      .optional()
      .describe("Type of SSL certificate: letsencrypt or none"),
  }),
  endpoint: "/settings.assignDomainServer",
});

const updateDockerCleanup = postTool({
  name: "settings-updateDockerCleanup",
  description: "Configure automatic Docker cleanup scheduling.",
  schema: z.object({
    enabled: z.boolean().describe("Whether automatic cleanup is enabled"),
    schedule: z
      .string()
      .optional()
      .describe("Cron schedule expression for the cleanup job"),
  }),
  endpoint: "/settings.updateDockerCleanup",
});

const readTraefikConfig = getTool({
  name: "settings-readTraefikConfig",
  description: "Read the current Traefik configuration file.",
  schema: z.object({}),
  endpoint: "/settings.readTraefikConfig",
});

const updateTraefikConfig = postTool({
  name: "settings-updateTraefikConfig",
  description: "Update the Traefik configuration file.",
  schema: z.object({
    traefikConfig: z
      .string()
      .min(1)
      .describe("The new Traefik configuration content"),
  }),
  endpoint: "/settings.updateTraefikConfig",
});

const readWebServerTraefikConfig = getTool({
  name: "settings-readWebServerTraefikConfig",
  description: "Read the Traefik configuration for the web server.",
  schema: z.object({}),
  endpoint: "/settings.readWebServerTraefikConfig",
});

const updateWebServerTraefikConfig = postTool({
  name: "settings-updateWebServerTraefikConfig",
  description: "Update the Traefik configuration for the web server.",
  schema: z.object({
    traefikConfig: z
      .string()
      .min(1)
      .describe("The new web server Traefik configuration content"),
  }),
  endpoint: "/settings.updateWebServerTraefikConfig",
});

const readMiddlewareTraefikConfig = getTool({
  name: "settings-readMiddlewareTraefikConfig",
  description: "Read the Traefik middleware configuration.",
  schema: z.object({}),
  endpoint: "/settings.readMiddlewareTraefikConfig",
});

const updateMiddlewareTraefikConfig = postTool({
  name: "settings-updateMiddlewareTraefikConfig",
  description: "Update the Traefik middleware configuration.",
  schema: z.object({
    traefikConfig: z
      .string()
      .min(1)
      .describe("The new middleware Traefik configuration content"),
  }),
  endpoint: "/settings.updateMiddlewareTraefikConfig",
});

const checkAndUpdateImage = postTool({
  name: "settings-checkAndUpdateImage",
  description: "Check for and apply Dokploy Docker image updates.",
  schema: z.object({}),
  endpoint: "/settings.checkAndUpdateImage",
});

const updateServer = postTool({
  name: "settings-updateServer",
  description: "Update the Dokploy server to the latest version.",
  schema: z.object({}),
  endpoint: "/settings.updateServer",
});

const getDokployVersion = getTool({
  name: "settings-getDokployVersion",
  description: "Get the current Dokploy version.",
  schema: z.object({}),
  endpoint: "/settings.getDokployVersion",
});

const readDirectories = getTool({
  name: "settings-readDirectories",
  description: "Read the server directory listing.",
  schema: z.object({}),
  endpoint: "/settings.readDirectories",
});

const getOpenApiDocument = getTool({
  name: "settings-getOpenApiDocument",
  description: "Get the Dokploy OpenAPI specification document.",
  schema: z.object({}),
  endpoint: "/settings.getOpenApiDocument",
});

// ── export ───────────────────────────────────────────────────────────
export const settingsTools: ToolDefinition[] = [
  reloadServer,
  reloadTraefik,
  cleanUnusedImages,
  cleanUnusedVolumes,
  cleanStoppedContainers,
  cleanDockerBuilder,
  cleanDockerPrune,
  cleanAll,
  cleanMonitoring,
  saveSSHPrivateKey,
  cleanSSHPrivateKey,
  assignDomainServer,
  updateDockerCleanup,
  readTraefikConfig,
  updateTraefikConfig,
  readWebServerTraefikConfig,
  updateWebServerTraefikConfig,
  readMiddlewareTraefikConfig,
  updateMiddlewareTraefikConfig,
  checkAndUpdateImage,
  updateServer,
  getDokployVersion,
  readDirectories,
  getOpenApiDocument,
];
