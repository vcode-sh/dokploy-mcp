import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "project-all",
  description: "List all projects in Dokploy.",
  schema: z.object({}),
  endpoint: "/project.all",
});

const one = getTool({
  name: "project-one",
  description: "Get a single project by ID.",
  schema: z.object({
    projectId: z.string().min(1).describe("The unique project ID"),
  }),
  endpoint: "/project.one",
});

const create = postTool({
  name: "project-create",
  description: "Create a new project.",
  schema: z.object({
    name: z.string().min(1).describe("The name of the project"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("Optional project description"),
  }),
  endpoint: "/project.create",
});

const update = postTool({
  name: "project-update",
  description: "Update an existing project.",
  schema: z.object({
    projectId: z.string().min(1).describe("The unique project ID"),
    name: z.string().optional().describe("New project name"),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("New project description"),
    env: z
      .string()
      .nullable()
      .optional()
      .describe("Environment variables for the project"),
  }),
  endpoint: "/project.update",
});

const duplicate = postTool({
  name: "project-duplicate",
  description: "Duplicate an existing project with optional service selection.",
  schema: z.object({
    sourceProjectId: z
      .string()
      .min(1)
      .describe("The ID of the project to duplicate"),
    name: z.string().min(1).describe("The name for the duplicated project"),
    description: z
      .string()
      .optional()
      .describe("Description for the duplicated project"),
    includeServices: z
      .boolean()
      .optional()
      .describe("Whether to include services in the duplicate"),
    selectedServices: z
      .array(
        z.object({
          id: z.string().min(1).describe("The service ID"),
          type: z.string().min(1).describe("The service type"),
        })
      )
      .optional()
      .describe("Specific services to include in the duplicate"),
  }),
  endpoint: "/project.duplicate",
});

const remove = postTool({
  name: "project-remove",
  description:
    "Remove a project and all its associated resources. This action is irreversible.",
  schema: z.object({
    projectId: z.string().min(1).describe("The unique project ID to remove"),
  }),
  endpoint: "/project.remove",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const projectTools: ToolDefinition[] = [
  all,
  one,
  create,
  update,
  duplicate,
  remove,
];
