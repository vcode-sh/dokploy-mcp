import { z } from "zod";
import { type ToolDefinition, getTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "deployment-all",
  description: "List all deployments for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/deployment.all",
});

const allByCompose = getTool({
  name: "deployment-allByCompose",
  description: "List all deployments for a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/deployment.allByCompose",
});

// ── export ───────────────────────────────────────────────────────────
export const deploymentTools: ToolDefinition[] = [all, allByCompose];
