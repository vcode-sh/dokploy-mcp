import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const portId = z.string().min(1).describe('Unique port mapping ID')

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_port_one',
  title: 'Get Port Mapping',
  description:
    'Retrieve the full configuration of a specific port mapping by its unique ID. Requires the portId parameter. Returns the port mapping object including the published port, target port, protocol (TCP/UDP), and associated application ID.',
  schema: z.object({ portId }).strict(),
  endpoint: '/port.one',
})

const create = postTool({
  name: 'dokploy_port_create',
  title: 'Create Port Mapping',
  description:
    'Create a new port mapping for a Dokploy application. Maps an externally published port to a target port inside the container. Requires the published port number, target port number, and application ID. Optionally specify the protocol as TCP (default) or UDP. Returns the created port mapping configuration.',
  schema: z
    .object({
      publishedPort: z.number().describe('The externally published port number'),
      targetPort: z.number().describe('The target port inside the container'),
      applicationId: z.string().min(1).describe('ID of the application to add the port mapping to'),
      protocol: z
        .enum(['tcp', 'udp'])
        .optional()
        .default('tcp')
        .describe('Network protocol for the port mapping'),
    })
    .strict(),
  endpoint: '/port.create',
})

const update = postTool({
  name: 'dokploy_port_update',
  title: 'Update Port Mapping',
  description:
    'Update an existing port mapping configuration for a Dokploy application. Requires the portId of the mapping to modify. Optionally update the published port, target port, or protocol (TCP/UDP). Returns the updated port mapping configuration.',
  schema: z
    .object({
      portId,
      publishedPort: z.number().optional().describe('New externally published port number'),
      targetPort: z.number().optional().describe('New target port inside the container'),
      protocol: z.enum(['tcp', 'udp']).optional().describe('New network protocol'),
    })
    .strict(),
  endpoint: '/port.update',
})

const deleteTool = postTool({
  name: 'dokploy_port_delete',
  title: 'Delete Port Mapping',
  description:
    'Permanently delete a port mapping from a Dokploy application. This action is irreversible and removes the external port exposure for the container. Requires the portId parameter. The container port will no longer be accessible on the previously published port.',
  schema: z.object({ portId }).strict(),
  endpoint: '/port.delete',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const portTools: ToolDefinition[] = [one, create, update, deleteTool]
