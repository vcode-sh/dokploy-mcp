import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const create = postTool({
  name: 'dokploy_domain_create',
  title: 'Create Domain',
  description:
    'Create a new domain configuration for an application or compose service. Requires the hostname, HTTPS setting, and certificate type. Optionally specify path-based routing, a target port, and the application or compose service to attach it to. Returns the created domain object.',
  schema: z.object({
    host: z.string().min(1).describe('The domain hostname (e.g., app.example.com)'),
    https: z.boolean().describe('Whether to enable HTTPS'),
    certificateType: z.enum(['letsencrypt', 'none', 'custom']).describe('SSL certificate type'),
    stripPath: z.boolean().describe('Whether to strip the path prefix when forwarding'),
    path: z.string().optional().describe('URL path prefix for routing'),
    port: z.number().nullable().optional().describe('Target port on the container'),
    applicationId: z.string().optional().describe('Application ID to attach the domain to'),
    composeId: z.string().optional().describe('Compose service ID to attach the domain to'),
    serviceName: z.string().optional().describe('Service name within a compose deployment'),
    customCertResolver: z
      .string()
      .nullable()
      .optional()
      .describe('Custom certificate resolver name'),
    domainType: z.string().optional().describe('Domain type'),
    previewDeploymentId: z.string().optional().describe('Preview deployment ID'),
    internalPath: z.string().optional().describe('Internal path for routing'),
  }),
  endpoint: '/domain.create',
})

const one = getTool({
  name: 'dokploy_domain_one',
  title: 'Get Domain',
  description:
    'Get detailed information about a single domain by its ID. Returns the full domain configuration including hostname, HTTPS settings, certificate type, routing rules, and the associated application or compose service.',
  schema: z.object({
    domainId: z.string().min(1).describe('The unique domain ID'),
  }),
  endpoint: '/domain.one',
})

const byApplicationId = getTool({
  name: 'dokploy_domain_by_application_id',
  title: 'List Domains by Application',
  description:
    'List all domains attached to a specific application. Requires the application ID. Returns an array of domain objects with their hostnames, HTTPS settings, certificate types, and routing configurations.',
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }),
  endpoint: '/domain.byApplicationId',
})

const byComposeId = getTool({
  name: 'dokploy_domain_by_compose_id',
  title: 'List Domains by Compose Service',
  description:
    'List all domains attached to a specific compose service. Requires the compose service ID. Returns an array of domain objects with their hostnames, HTTPS settings, certificate types, and routing configurations.',
  schema: z.object({
    composeId: z.string().min(1).describe('The unique compose service ID'),
  }),
  endpoint: '/domain.byComposeId',
})

const update = postTool({
  name: 'dokploy_domain_update',
  title: 'Update Domain',
  description:
    'Update an existing domain configuration. Requires the domain ID along with the hostname, HTTPS setting, certificate type, and strip path option. Optionally modify the path prefix, port, certificate resolver, service name, and routing settings. Returns the updated domain object.',
  schema: z.object({
    domainId: z.string().min(1).describe('The unique domain ID'),
    host: z.string().min(1).describe('The domain hostname'),
    https: z.boolean().describe('Whether to enable HTTPS'),
    certificateType: z.enum(['letsencrypt', 'none', 'custom']).describe('SSL certificate type'),
    stripPath: z.boolean().describe('Whether to strip the path prefix'),
    path: z.string().optional().describe('URL path prefix for routing'),
    port: z.number().nullable().optional().describe('Target port on the container'),
    customCertResolver: z
      .string()
      .nullable()
      .optional()
      .describe('Custom certificate resolver name'),
    serviceName: z.string().optional().describe('Service name within a compose deployment'),
    domainType: z.string().optional().describe('Domain type'),
    internalPath: z.string().optional().describe('Internal path for routing'),
  }),
  endpoint: '/domain.update',
})

const deleteDomain = postTool({
  name: 'dokploy_domain_delete',
  title: 'Delete Domain',
  description:
    'Permanently delete a domain configuration. This removes the domain routing and any associated SSL certificates. This action is irreversible. Requires the domain ID.',
  schema: z.object({
    domainId: z.string().min(1).describe('The unique domain ID to delete'),
  }),
  endpoint: '/domain.delete',
  annotations: { destructiveHint: true },
})

const validateDomain = postTool({
  name: 'dokploy_domain_validate',
  title: 'Validate Domain DNS',
  description:
    "Validate that a domain's DNS records are correctly configured and pointing to the expected server. Requires the domain name and optionally accepts the expected server IP address. Returns the validation result indicating whether DNS resolution matches.",
  schema: z.object({
    domain: z.string().min(1).describe('The domain name to validate'),
    serverIp: z.string().optional().describe('Expected server IP address for DNS validation'),
  }),
  endpoint: '/domain.validateDomain',
})

const generateDomain = postTool({
  name: 'dokploy_domain_generate',
  title: 'Generate Domain',
  description:
    "Generate a default domain for an application using the server's configured base domain. This automatically creates and attaches a subdomain to the specified application. Requires the application ID. Returns the generated domain configuration.",
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }),
  endpoint: '/domain.generateDomain',
})

const generateWildcard = postTool({
  name: 'dokploy_domain_generate_wildcard',
  title: 'Generate Wildcard Domain',
  description:
    "Generate a wildcard domain for an application using the server's configured base domain. A wildcard domain matches all subdomains, enabling dynamic subdomain routing. Requires the application ID. Returns the generated wildcard domain configuration.",
  schema: z.object({
    applicationId: z.string().min(1).describe('The unique application ID'),
  }),
  endpoint: '/domain.generateWildcard',
})

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
]
