import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const destinationBaseSchema = {
  name: z.string().min(1).describe("Name for the S3 destination"),
  accessKey: z.string().min(1).describe("S3 access key"),
  bucket: z.string().min(1).describe("S3 bucket name"),
  region: z.string().min(1).describe("S3 region"),
  endpoint: z.string().min(1).describe("S3 endpoint URL"),
  secretAccessKey: z.string().min(1).describe("S3 secret access key"),
};

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "destination-all",
  description: "List all backup destinations configured in Dokploy.",
  schema: z.object({}),
  endpoint: "/destination.all",
});

const one = getTool({
  name: "destination-one",
  description: "Get details of a specific backup destination by its ID.",
  schema: z.object({
    destinationId: z.string().min(1).describe("Unique destination ID"),
  }),
  endpoint: "/destination.one",
});

const create = postTool({
  name: "destination-create",
  description: "Create a new S3-compatible backup destination.",
  schema: z.object({
    ...destinationBaseSchema,
  }),
  endpoint: "/destination.create",
});

const update = postTool({
  name: "destination-update",
  description: "Update an existing backup destination configuration.",
  schema: z.object({
    destinationId: z
      .string()
      .min(1)
      .describe("Unique destination ID to update"),
    ...destinationBaseSchema,
  }),
  endpoint: "/destination.update",
});

const remove = postTool({
  name: "destination-remove",
  description:
    "Remove a backup destination permanently. This action is irreversible.",
  schema: z.object({
    destinationId: z
      .string()
      .min(1)
      .describe("Unique destination ID to remove"),
  }),
  endpoint: "/destination.remove",
  annotations: { destructiveHint: true },
});

const testConnection = postTool({
  name: "destination-testConnection",
  description:
    "Test connection to an S3-compatible backup destination with the provided credentials.",
  schema: z.object({
    ...destinationBaseSchema,
  }),
  endpoint: "/destination.testConnection",
});

// ── export ───────────────────────────────────────────────────────────
export const destinationTools: ToolDefinition[] = [
  all,
  one,
  create,
  update,
  remove,
  testConnection,
];
