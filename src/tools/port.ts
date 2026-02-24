import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const portId = z.string().min(1).describe("Unique port mapping ID");

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "port-one",
  description: "Get details of a specific port mapping by its ID.",
  schema: z.object({ portId }),
  endpoint: "/port.one",
});

const create = postTool({
  name: "port-create",
  description: "Create a new port mapping for an application.",
  schema: z.object({
    publishedPort: z.number().describe("The externally published port number"),
    targetPort: z.number().describe("The target port inside the container"),
    applicationId: z
      .string()
      .min(1)
      .describe("ID of the application to add the port mapping to"),
    protocol: z
      .enum(["tcp", "udp"])
      .optional()
      .default("tcp")
      .describe("Network protocol for the port mapping"),
  }),
  endpoint: "/port.create",
});

const update = postTool({
  name: "port-update",
  description: "Update an existing port mapping configuration.",
  schema: z.object({
    portId,
    publishedPort: z
      .number()
      .optional()
      .describe("New externally published port number"),
    targetPort: z
      .number()
      .optional()
      .describe("New target port inside the container"),
    protocol: z
      .enum(["tcp", "udp"])
      .optional()
      .describe("New network protocol"),
  }),
  endpoint: "/port.update",
});

const deleteTool = postTool({
  name: "port-delete",
  description:
    "Delete a port mapping permanently. This action is irreversible.",
  schema: z.object({ portId }),
  endpoint: "/port.delete",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const portTools: ToolDefinition[] = [one, create, update, deleteTool];
