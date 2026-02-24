import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const mountId = z.string().min(1).describe("Unique mount ID");
const mountTypeEnum = z
  .enum(["bind", "volume", "file"])
  .describe("Mount type: bind, volume, or file");

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "mounts-one",
  description: "Get details of a specific mount by its ID.",
  schema: z.object({ mountId }),
  endpoint: "/mounts.one",
});

const create = postTool({
  name: "mounts-create",
  description: "Create a new mount (bind, volume, or file) for a service.",
  schema: z.object({
    type: mountTypeEnum,
    mountPath: z
      .string()
      .min(1)
      .describe("Path inside the container where the mount is attached"),
    serviceId: z
      .string()
      .min(1)
      .describe("ID of the service to attach the mount to"),
    hostPath: z
      .string()
      .optional()
      .describe("Host path for bind mounts"),
    volumeName: z
      .string()
      .optional()
      .describe("Volume name for volume mounts"),
    content: z
      .string()
      .optional()
      .describe("File content for file mounts"),
    serviceType: z
      .enum([
        "application",
        "postgres",
        "mysql",
        "mariadb",
        "mongo",
        "redis",
        "compose",
      ])
      .optional()
      .default("application")
      .describe("Type of service the mount belongs to"),
  }),
  endpoint: "/mounts.create",
});

const update = postTool({
  name: "mounts-update",
  description: "Update an existing mount configuration.",
  schema: z.object({
    mountId,
    type: mountTypeEnum.optional().describe("New mount type"),
    mountPath: z
      .string()
      .optional()
      .describe("New path inside the container"),
    hostPath: z
      .string()
      .optional()
      .describe("New host path for bind mounts"),
    volumeName: z
      .string()
      .optional()
      .describe("New volume name for volume mounts"),
    content: z
      .string()
      .optional()
      .describe("New file content for file mounts"),
  }),
  endpoint: "/mounts.update",
});

const remove = postTool({
  name: "mounts-remove",
  description: "Remove a mount permanently. This action is irreversible.",
  schema: z.object({ mountId }),
  endpoint: "/mounts.remove",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const mountsTools: ToolDefinition[] = [one, create, update, remove];
