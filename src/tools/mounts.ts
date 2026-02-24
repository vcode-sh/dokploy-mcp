import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const mountId = z.string().min(1).describe('Unique mount ID')
const mountTypeEnum = z
  .enum(['bind', 'volume', 'file'])
  .describe('Mount type: bind, volume, or file')

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_mount_one',
  title: 'Get Mount',
  description:
    'Retrieve the full configuration of a specific mount by its unique ID. Requires the mountId parameter. Returns the mount object including its type (bind, volume, or file), container path, host path or volume name, and associated service ID.',
  schema: z.object({ mountId }),
  endpoint: '/mounts.one',
})

const create = postTool({
  name: 'dokploy_mount_create',
  title: 'Create Mount',
  description:
    'Create a new mount for a Dokploy service. Supports bind mounts (host path to container), volume mounts (named Docker volumes), and file mounts (inline file content). Requires the mount type, container path, and service ID. Returns the created mount configuration.',
  schema: z.object({
    type: mountTypeEnum,
    mountPath: z.string().min(1).describe('Path inside the container where the mount is attached'),
    serviceId: z.string().min(1).describe('ID of the service to attach the mount to'),
    hostPath: z.string().optional().describe('Host path for bind mounts'),
    volumeName: z.string().optional().describe('Volume name for volume mounts'),
    content: z.string().optional().describe('File content for file mounts'),
    serviceType: z
      .enum(['application', 'postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'compose'])
      .optional()
      .default('application')
      .describe('Type of service the mount belongs to'),
  }),
  endpoint: '/mounts.create',
})

const update = postTool({
  name: 'dokploy_mount_update',
  title: 'Update Mount',
  description:
    'Update an existing mount configuration for a Dokploy service. Requires the mountId of the mount to modify. Optionally update the mount type, container path, host path (for bind mounts), volume name (for volume mounts), or file content (for file mounts). Returns the updated mount configuration.',
  schema: z.object({
    mountId,
    type: mountTypeEnum.optional().describe('New mount type'),
    mountPath: z.string().optional().describe('New path inside the container'),
    hostPath: z.string().optional().describe('New host path for bind mounts'),
    volumeName: z.string().optional().describe('New volume name for volume mounts'),
    content: z.string().optional().describe('New file content for file mounts'),
  }),
  endpoint: '/mounts.update',
})

const remove = postTool({
  name: 'dokploy_mount_remove',
  title: 'Remove Mount',
  description:
    'Permanently remove a mount from a Dokploy service. This action is irreversible and detaches the mount from the service container. Requires the mountId parameter. The underlying host path, volume, or file content is not automatically deleted.',
  schema: z.object({ mountId }),
  endpoint: '/mounts.remove',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const mountsTools: ToolDefinition[] = [one, create, update, remove]
