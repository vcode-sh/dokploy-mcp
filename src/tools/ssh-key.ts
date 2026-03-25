import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const nullableString = z.string().nullable().optional()

const all = getTool({
  name: 'dokploy_ssh_key_all',
  title: 'List SSH Keys',
  description:
    'List all SSH keys available in Dokploy. Returns stored keys together with their metadata and organization context.',
  schema: z.object({}).strict(),
  endpoint: '/sshKey.all',
})

const create = postTool({
  name: 'dokploy_ssh_key_create',
  title: 'Create SSH Key',
  description:
    'Create a new SSH key record in Dokploy. Requires the key pair and a name. Optionally set a description and organization ID.',
  schema: z
    .object({
      name: z.string().min(1).describe('SSH key name'),
      description: z.string().nullable().optional().describe('SSH key description'),
      privateKey: z.string().describe('Private key content'),
      publicKey: z.string().describe('Public key content'),
      organizationId: z.string().optional().describe('Organization ID'),
    })
    .strict(),
  endpoint: '/sshKey.create',
})

const generate = postTool({
  name: 'dokploy_ssh_key_generate',
  title: 'Generate SSH Key Pair',
  description:
    'Generate a new SSH key pair in Dokploy. Optionally specify the key type; supported values are rsa and ed25519.',
  schema: z
    .object({
      type: z.enum(['rsa', 'ed25519']).optional().describe('SSH key type'),
    })
    .strict(),
  endpoint: '/sshKey.generate',
})

const one = getTool({
  name: 'dokploy_ssh_key_one',
  title: 'Get SSH Key',
  description: 'Retrieve detailed information about a Dokploy SSH key by its ID.',
  schema: z
    .object({
      sshKeyId: z.string().min(1).describe('SSH key ID'),
    })
    .strict(),
  endpoint: '/sshKey.one',
})

const remove = postTool({
  name: 'dokploy_ssh_key_remove',
  title: 'Remove SSH Key',
  description:
    'Permanently remove an SSH key from Dokploy. Requires the SSH key ID. This is a destructive action.',
  schema: z
    .object({
      sshKeyId: z.string().min(1).describe('SSH key ID'),
    })
    .strict(),
  endpoint: '/sshKey.remove',
  annotations: { destructiveHint: true },
})

const update = postTool({
  name: 'dokploy_ssh_key_update',
  title: 'Update SSH Key',
  description:
    'Update metadata for a Dokploy SSH key. Requires the SSH key ID and accepts optional name, description, and last-used timestamp changes.',
  schema: z
    .object({
      sshKeyId: z.string().min(1).describe('SSH key ID'),
      name: z.string().min(1).optional().describe('SSH key name'),
      description: nullableString.describe('SSH key description'),
      lastUsedAt: nullableString.describe('Last used timestamp'),
    })
    .strict(),
  endpoint: '/sshKey.update',
})

export const sshKeyTools: ToolDefinition[] = [all, create, generate, one, remove, update]
