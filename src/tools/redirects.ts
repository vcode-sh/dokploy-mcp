import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const redirectId = z.string().min(1).describe("Unique redirect rule ID");

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "redirects-one",
  description: "Get details of a specific redirect rule by its ID.",
  schema: z.object({ redirectId }),
  endpoint: "/redirects.one",
});

const create = postTool({
  name: "redirects-create",
  description: "Create a new redirect rule for an application.",
  schema: z.object({
    regex: z
      .string()
      .min(1)
      .describe("Regular expression pattern to match incoming requests"),
    replacement: z
      .string()
      .min(1)
      .describe("Replacement URL or path for matched requests"),
    permanent: z
      .boolean()
      .describe("Whether the redirect is permanent (301) or temporary (302)"),
    applicationId: z
      .string()
      .min(1)
      .describe("ID of the application to add the redirect to"),
  }),
  endpoint: "/redirects.create",
});

const update = postTool({
  name: "redirects-update",
  description: "Update an existing redirect rule.",
  schema: z.object({
    redirectId,
    regex: z
      .string()
      .optional()
      .describe("New regular expression pattern"),
    replacement: z
      .string()
      .optional()
      .describe("New replacement URL or path"),
    permanent: z
      .boolean()
      .optional()
      .describe("Whether the redirect is permanent (301) or temporary (302)"),
  }),
  endpoint: "/redirects.update",
});

const deleteTool = postTool({
  name: "redirects-delete",
  description:
    "Delete a redirect rule permanently. This action is irreversible.",
  schema: z.object({ redirectId }),
  endpoint: "/redirects.delete",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const redirectsTools: ToolDefinition[] = [
  one,
  create,
  update,
  deleteTool,
];
