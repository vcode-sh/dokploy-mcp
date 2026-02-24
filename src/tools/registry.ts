import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const registryTypeEnum = z
  .enum(["selfHosted", "cloud"])
  .describe("Registry type: selfHosted or cloud");

const registryBaseSchema = {
  registryName: z.string().min(1).describe("Name of the registry"),
  username: z.string().min(1).describe("Registry username"),
  password: z.string().min(1).describe("Registry password"),
  registryUrl: z.string().min(1).describe("Registry URL"),
  registryType: registryTypeEnum,
  imagePrefix: z
    .string()
    .nullable()
    .optional()
    .describe("Optional image prefix for the registry"),
};

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "registry-all",
  description: "List all container registries configured in Dokploy.",
  schema: z.object({}),
  endpoint: "/registry.all",
});

const one = getTool({
  name: "registry-one",
  description: "Get details of a specific container registry by its ID.",
  schema: z.object({
    registryId: z.string().min(1).describe("Unique registry ID"),
  }),
  endpoint: "/registry.one",
});

const create = postTool({
  name: "registry-create",
  description: "Create a new container registry configuration.",
  schema: z.object({
    ...registryBaseSchema,
  }),
  endpoint: "/registry.create",
});

const update = postTool({
  name: "registry-update",
  description: "Update an existing container registry configuration.",
  schema: z.object({
    registryId: z.string().min(1).describe("Unique registry ID to update"),
    ...registryBaseSchema,
  }),
  endpoint: "/registry.update",
});

const remove = postTool({
  name: "registry-remove",
  description:
    "Remove a container registry permanently. This action is irreversible.",
  schema: z.object({
    registryId: z.string().min(1).describe("Unique registry ID to remove"),
  }),
  endpoint: "/registry.remove",
  annotations: { destructiveHint: true },
});

const testRegistry = postTool({
  name: "registry-testRegistry",
  description:
    "Test connection to a container registry with the provided credentials.",
  schema: z.object({
    ...registryBaseSchema,
  }),
  endpoint: "/registry.testRegistry",
});

const enableSelfHostedRegistry = postTool({
  name: "registry-enableSelfHostedRegistry",
  description: "Enable the self-hosted container registry on the server.",
  schema: z.object({}),
  endpoint: "/registry.enableSelfHostedRegistry",
});

// ── export ───────────────────────────────────────────────────────────
export const registryTools: ToolDefinition[] = [
  all,
  one,
  create,
  update,
  remove,
  testRegistry,
  enableSelfHostedRegistry,
];
