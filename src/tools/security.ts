import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const securityId = z.string().min(1).describe("Unique security entry ID");

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "security-one",
  description:
    "Get details of a specific HTTP basic-auth security entry by its ID.",
  schema: z.object({ securityId }),
  endpoint: "/security.one",
});

const create = postTool({
  name: "security-create",
  description:
    "Create a new HTTP basic-auth security entry for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("ID of the application to protect"),
    username: z
      .string()
      .min(1)
      .describe("Username for basic-auth access"),
    password: z
      .string()
      .min(1)
      .describe("Password for basic-auth access"),
  }),
  endpoint: "/security.create",
});

const update = postTool({
  name: "security-update",
  description: "Update an existing HTTP basic-auth security entry.",
  schema: z.object({
    securityId,
    username: z
      .string()
      .optional()
      .describe("New username for basic-auth access"),
    password: z
      .string()
      .optional()
      .describe("New password for basic-auth access"),
  }),
  endpoint: "/security.update",
});

const deleteTool = postTool({
  name: "security-delete",
  description:
    "Delete an HTTP basic-auth security entry permanently. This action is irreversible.",
  schema: z.object({ securityId }),
  endpoint: "/security.delete",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const securityTools: ToolDefinition[] = [
  one,
  create,
  update,
  deleteTool,
];
