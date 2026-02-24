import { z } from "zod";
import { type ToolDefinition, getTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const getContainers = getTool({
  name: "docker-getContainers",
  description: "List all Docker containers on the server.",
  schema: z.object({}),
  endpoint: "/docker.getContainers",
});

const getConfig = getTool({
  name: "docker-getConfig",
  description: "Get the configuration of a specific Docker container.",
  schema: z.object({
    containerId: z
      .string()
      .min(1)
      .describe("The Docker container ID"),
  }),
  endpoint: "/docker.getConfig",
});

const getContainersByAppNameMatch = getTool({
  name: "docker-getContainersByAppNameMatch",
  description:
    "Find Docker containers whose name matches the given app name.",
  schema: z.object({
    appName: z
      .string()
      .min(1)
      .describe("The app name to match against container names"),
  }),
  endpoint: "/docker.getContainersByAppNameMatch",
});

const getContainersByAppLabel = getTool({
  name: "docker-getContainersByAppLabel",
  description: "Find Docker containers by their app label.",
  schema: z.object({
    appName: z
      .string()
      .min(1)
      .describe("The app name label to search for"),
  }),
  endpoint: "/docker.getContainersByAppLabel",
});

// ── export ───────────────────────────────────────────────────────────
export const dockerTools: ToolDefinition[] = [
  getContainers,
  getConfig,
  getContainersByAppNameMatch,
  getContainersByAppLabel,
];
