import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: "domain-create",
  description:
    "Create a new domain configuration for an application or compose service.",
  schema: z.object({
    host: z
      .string()
      .min(1)
      .describe("The domain hostname (e.g., app.example.com)"),
    https: z.boolean().describe("Whether to enable HTTPS"),
    certificateType: z
      .enum(["letsencrypt", "none", "custom"])
      .describe("SSL certificate type"),
    stripPath: z
      .boolean()
      .describe("Whether to strip the path prefix when forwarding"),
    path: z.string().optional().describe("URL path prefix for routing"),
    port: z
      .number()
      .nullable()
      .optional()
      .describe("Target port on the container"),
    applicationId: z
      .string()
      .optional()
      .describe("Application ID to attach the domain to"),
    composeId: z
      .string()
      .optional()
      .describe("Compose service ID to attach the domain to"),
    serviceName: z
      .string()
      .optional()
      .describe("Service name within a compose deployment"),
    customCertResolver: z
      .string()
      .nullable()
      .optional()
      .describe("Custom certificate resolver name"),
    domainType: z.string().optional().describe("Domain type"),
    previewDeploymentId: z
      .string()
      .optional()
      .describe("Preview deployment ID"),
    internalPath: z
      .string()
      .optional()
      .describe("Internal path for routing"),
  }),
  endpoint: "/domain.create",
});

const one = getTool({
  name: "domain-one",
  description: "Get detailed information about a single domain.",
  schema: z.object({
    domainId: z.string().min(1).describe("The unique domain ID"),
  }),
  endpoint: "/domain.one",
});

const byApplicationId = getTool({
  name: "domain-byApplicationId",
  description: "List all domains attached to an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/domain.byApplicationId",
});

const byComposeId = getTool({
  name: "domain-byComposeId",
  description: "List all domains attached to a compose service.",
  schema: z.object({
    composeId: z
      .string()
      .min(1)
      .describe("The unique compose service ID"),
  }),
  endpoint: "/domain.byComposeId",
});

const update = postTool({
  name: "domain-update",
  description: "Update an existing domain configuration.",
  schema: z.object({
    domainId: z.string().min(1).describe("The unique domain ID"),
    host: z.string().min(1).describe("The domain hostname"),
    https: z.boolean().describe("Whether to enable HTTPS"),
    certificateType: z
      .enum(["letsencrypt", "none", "custom"])
      .describe("SSL certificate type"),
    stripPath: z
      .boolean()
      .describe("Whether to strip the path prefix"),
    path: z.string().optional().describe("URL path prefix for routing"),
    port: z
      .number()
      .nullable()
      .optional()
      .describe("Target port on the container"),
    customCertResolver: z
      .string()
      .nullable()
      .optional()
      .describe("Custom certificate resolver name"),
    serviceName: z
      .string()
      .optional()
      .describe("Service name within a compose deployment"),
    domainType: z.string().optional().describe("Domain type"),
    internalPath: z
      .string()
      .optional()
      .describe("Internal path for routing"),
  }),
  endpoint: "/domain.update",
});

const deleteDomain = postTool({
  name: "domain-delete",
  description:
    "Delete a domain configuration. This action is irreversible.",
  schema: z.object({
    domainId: z
      .string()
      .min(1)
      .describe("The unique domain ID to delete"),
  }),
  endpoint: "/domain.delete",
  annotations: { destructiveHint: true },
});

const validateDomain = postTool({
  name: "domain-validateDomain",
  description:
    "Validate that a domain's DNS is correctly configured and pointing to the server.",
  schema: z.object({
    domain: z.string().min(1).describe("The domain name to validate"),
    serverIp: z
      .string()
      .optional()
      .describe("Expected server IP address for DNS validation"),
  }),
  endpoint: "/domain.validateDomain",
});

const generateDomain = postTool({
  name: "domain-generateDomain",
  description:
    "Generate a default domain for an application using the server's base domain.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/domain.generateDomain",
});

const generateWildcard = postTool({
  name: "domain-generateWildcard",
  description: "Generate a wildcard domain for an application.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1)
      .describe("The unique application ID"),
  }),
  endpoint: "/domain.generateWildcard",
});

// ── export ───────────────────────────────────────────────────────────
export const domainTools: ToolDefinition[] = [
  create,
  one,
  byApplicationId,
  byComposeId,
  update,
  deleteDomain,
  validateDomain,
  generateDomain,
  generateWildcard,
];
