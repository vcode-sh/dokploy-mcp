import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const serverIdSchema = z.string().min(1).describe('The server ID')

const metricsConfigSchema = z
  .object({
    server: z
      .object({
        refreshRate: z.number().min(2).describe('Refresh rate in seconds'),
        port: z.number().min(1).describe('Monitoring port'),
        token: z.string().describe('Monitoring token'),
        urlCallback: z.string().url().describe('Callback URL'),
        retentionDays: z.number().min(1).describe('Retention period in days'),
        cronJob: z.string().min(1).describe('Cron expression'),
        thresholds: z
          .object({
            cpu: z.number().min(0).describe('CPU threshold'),
            memory: z.number().min(0).describe('Memory threshold'),
          })
          .strict(),
      })
      .strict(),
    containers: z
      .object({
        refreshRate: z.number().min(2).describe('Container refresh rate in seconds'),
        services: z
          .object({
            include: z.array(z.string()).optional().describe('Services to include'),
            exclude: z.array(z.string()).optional().describe('Services to exclude'),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()

const serverPayload = z
  .object({
    name: z.string().min(1).describe('Server name'),
    description: z.string().nullable().describe('Server description'),
    ipAddress: z.string().describe('Server IP address'),
    port: z.number().describe('SSH port'),
    username: z.string().describe('SSH username'),
    sshKeyId: z.string().nullable().describe('SSH key ID'),
    serverType: z.enum(['deploy', 'build']).describe('Server role'),
  })
  .strict()

const all = getTool({
  name: 'dokploy_server_all',
  title: 'List Servers',
  description:
    'List all Dokploy servers available to the current account. Returns deploy and build servers with their metadata.',
  schema: z.object({}).strict(),
  endpoint: '/server.all',
})

const one = getTool({
  name: 'dokploy_server_one',
  title: 'Get Server',
  description:
    'Retrieve detailed information about a Dokploy server by its ID. Returns connection settings, monitoring state, and security details.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.one',
})

const count = getTool({
  name: 'dokploy_server_count',
  title: 'Count Servers',
  description: 'Return the number of servers configured in Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/server.count',
})

const withSshKey = getTool({
  name: 'dokploy_server_with_ssh_key',
  title: 'List Servers with SSH Keys',
  description:
    'List Dokploy servers together with their linked SSH key information. Useful when selecting a server-key pair for operations.',
  schema: z.object({}).strict(),
  endpoint: '/server.withSSHKey',
})

const buildServers = getTool({
  name: 'dokploy_server_build_servers',
  title: 'List Build Servers',
  description: 'List Dokploy servers configured specifically for build workloads.',
  schema: z.object({}).strict(),
  endpoint: '/server.buildServers',
})

const validate = getTool({
  name: 'dokploy_server_validate',
  title: 'Validate Server',
  description:
    'Validate the SSH connectivity and server configuration for a Dokploy server. Requires the server ID.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.validate',
})

const security = getTool({
  name: 'dokploy_server_security',
  title: 'Get Server Security',
  description:
    'Retrieve the server security posture and checks for a Dokploy server. Requires the server ID.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.security',
})

const publicIp = getTool({
  name: 'dokploy_server_public_ip',
  title: 'Get Public IP',
  description: 'Get the public IP address detected by Dokploy for the current installation.',
  schema: z.object({}).strict(),
  endpoint: '/server.publicIp',
})

const getServerTime = getTool({
  name: 'dokploy_server_get_server_time',
  title: 'Get Server Time',
  description: 'Get the current server time reported by Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/server.getServerTime',
})

const getServerMetrics = getTool({
  name: 'dokploy_server_get_server_metrics',
  title: 'Get Server Metrics',
  description:
    'Retrieve server monitoring metrics from Dokploy. Requires the monitoring URL, token, and number of data points.',
  schema: z
    .object({
      url: z.string().describe('Monitoring URL'),
      token: z.string().describe('Monitoring token'),
      dataPoints: z.string().describe('Number of data points'),
    })
    .strict(),
  endpoint: '/server.getServerMetrics',
})

const getDefaultCommand = getTool({
  name: 'dokploy_server_get_default_command',
  title: 'Get Default Server Command',
  description: 'Get the default provisioning command for a Dokploy server. Requires the server ID.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.getDefaultCommand',
})

const create = postTool({
  name: 'dokploy_server_create',
  title: 'Create Server',
  description:
    'Create a new Dokploy server. Requires connection details, server type, and the linked SSH key ID or null for an unmanaged key.',
  schema: serverPayload,
  endpoint: '/server.create',
})

const update = postTool({
  name: 'dokploy_server_update',
  title: 'Update Server',
  description:
    'Update an existing Dokploy server. Requires the server ID together with the current server connection details and role. Optionally provide a command override.',
  schema: serverPayload
    .extend({
      serverId: serverIdSchema,
      command: z.string().optional().describe('Optional command override'),
    })
    .strict(),
  endpoint: '/server.update',
})

const remove = postTool({
  name: 'dokploy_server_remove',
  title: 'Remove Server',
  description:
    'Permanently remove a Dokploy server from the installation. Requires the server ID. This operation is destructive.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.remove',
  annotations: { destructiveHint: true },
})

const setup = postTool({
  name: 'dokploy_server_setup',
  title: 'Setup Server',
  description: 'Run the Dokploy setup workflow on an existing server. Requires the server ID.',
  schema: z.object({ serverId: serverIdSchema }).strict(),
  endpoint: '/server.setup',
})

const setupMonitoring = postTool({
  name: 'dokploy_server_setup_monitoring',
  title: 'Setup Server Monitoring',
  description:
    'Configure monitoring for a Dokploy server. Requires the server ID and a complete monitoring configuration.',
  schema: z
    .object({
      serverId: serverIdSchema,
      metricsConfig: metricsConfigSchema.describe('Monitoring configuration'),
    })
    .strict(),
  endpoint: '/server.setupMonitoring',
})

export const serverTools: ToolDefinition[] = [
  all,
  one,
  count,
  withSshKey,
  buildServers,
  validate,
  security,
  publicIp,
  getServerTime,
  getServerMetrics,
  getDefaultCommand,
  create,
  update,
  remove,
  setup,
  setupMonitoring,
]
