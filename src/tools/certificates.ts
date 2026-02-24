import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const all = getTool({
  name: 'dokploy_certificate_all',
  title: 'List Certificates',
  description:
    'List all SSL/TLS certificates managed by Dokploy. Returns an array of certificate objects including their names, expiration dates, associated domains, and auto-renewal status. Takes no parameters. Useful for auditing certificate coverage across your deployments.',
  schema: z.object({}).strict(),
  endpoint: '/certificates.all',
})

const one = getTool({
  name: 'dokploy_certificate_one',
  title: 'Get Certificate Details',
  description:
    'Get the full details of a specific SSL/TLS certificate by its unique ID. Returns the certificate name, PEM data, private key reference, associated domain, expiration date, and auto-renewal configuration. Requires the certificate ID.',
  schema: z
    .object({
      certificateId: z.string().min(1).describe('Unique certificate ID'),
    })
    .strict(),
  endpoint: '/certificates.one',
})

const create = postTool({
  name: 'dokploy_certificate_create',
  title: 'Create Certificate',
  description:
    'Create a new SSL/TLS certificate in Dokploy. Requires the certificate name, PEM-encoded certificate data, and private key. Optionally accepts a certificate ID, filesystem path, and auto-renewal flag. Returns the newly created certificate object.',
  schema: z
    .object({
      name: z.string().min(1).describe('Display name for the certificate'),
      certificateData: z.string().min(1).describe('The certificate data (PEM format)'),
      privateKey: z.string().min(1).describe('The private key for the certificate'),
      certificateId: z.string().min(1).optional().describe('Optional certificate ID to assign'),
      certificatePath: z
        .string()
        .optional()
        .describe('Optional filesystem path for the certificate'),
      autoRenew: z.boolean().optional().describe('Whether to automatically renew the certificate'),
    })
    .strict(),
  endpoint: '/certificates.create',
})

const remove = postTool({
  name: 'dokploy_certificate_remove',
  title: 'Remove Certificate',
  description:
    'Permanently remove an SSL/TLS certificate from Dokploy. This action is irreversible and will delete the certificate data and private key. Requires the certificate ID. Any domains using this certificate will lose their TLS configuration.',
  schema: z
    .object({
      certificateId: z.string().min(1).describe('Unique certificate ID to remove'),
    })
    .strict(),
  endpoint: '/certificates.remove',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const certificatesTools: ToolDefinition[] = [all, one, create, remove]
