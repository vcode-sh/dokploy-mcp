import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: "certificates-all",
  description: "List all SSL/TLS certificates managed by Dokploy.",
  schema: z.object({}),
  endpoint: "/certificates.all",
});

const one = getTool({
  name: "certificates-one",
  description: "Get details of a specific certificate by its ID.",
  schema: z.object({
    certificateId: z.string().min(1).describe("Unique certificate ID"),
  }),
  endpoint: "/certificates.one",
});

const create = postTool({
  name: "certificates-create",
  description: "Create a new SSL/TLS certificate.",
  schema: z.object({
    name: z.string().min(1).describe("Display name for the certificate"),
    certificateData: z
      .string()
      .min(1)
      .describe("The certificate data (PEM format)"),
    privateKey: z
      .string()
      .min(1)
      .describe("The private key for the certificate"),
    certificateId: z
      .string()
      .min(1)
      .optional()
      .describe("Optional certificate ID to assign"),
    certificatePath: z
      .string()
      .optional()
      .describe("Optional filesystem path for the certificate"),
    autoRenew: z
      .boolean()
      .optional()
      .describe("Whether to automatically renew the certificate"),
  }),
  endpoint: "/certificates.create",
});

const remove = postTool({
  name: "certificates-remove",
  description:
    "Remove a certificate permanently. This action is irreversible.",
  schema: z.object({
    certificateId: z
      .string()
      .min(1)
      .describe("Unique certificate ID to remove"),
  }),
  endpoint: "/certificates.remove",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const certificatesTools: ToolDefinition[] = [all, one, create, remove];
