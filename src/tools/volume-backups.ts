import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const serviceTypeSchema = z
  .enum(['application', 'postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'compose'])
  .describe('Service type')

const nullableString = z.string().nullable().optional()
const nullableBoolean = z.boolean().nullable().optional()
const nullableNumber = z.number().nullable().optional()

const volumeBackupPayload = z
  .object({
    name: z.string().describe('Volume backup name'),
    volumeName: z.string().describe('Docker volume name'),
    prefix: z.string().describe('Backup file prefix'),
    serviceType: serviceTypeSchema.optional(),
    appName: z.string().optional().describe('App name'),
    serviceName: nullableString.describe('Compose service name'),
    turnOff: z.boolean().optional().describe('Whether to turn off the service during backup'),
    cronExpression: z.string().describe('Cron expression'),
    keepLatestCount: nullableNumber.describe('Number of backups to keep'),
    enabled: nullableBoolean.describe('Whether the backup is enabled'),
    applicationId: nullableString.describe('Application ID'),
    postgresId: nullableString.describe('Postgres ID'),
    mariadbId: nullableString.describe('MariaDB ID'),
    mongoId: nullableString.describe('MongoDB ID'),
    mysqlId: nullableString.describe('MySQL ID'),
    redisId: nullableString.describe('Redis ID'),
    composeId: nullableString.describe('Compose ID'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    destinationId: z.string().describe('Destination ID'),
  })
  .strict()

const list = getTool({
  name: 'dokploy_volume_backups_list',
  title: 'List Volume Backups',
  description:
    'List volume backup configurations for a Dokploy service type. Requires the entity ID and volume backup type.',
  schema: z
    .object({
      id: z.string().min(1).describe('Entity ID'),
      volumeBackupType: serviceTypeSchema.describe('Volume backup type'),
    })
    .strict(),
  endpoint: '/volumeBackups.list',
})

const one = getTool({
  name: 'dokploy_volume_backups_one',
  title: 'Get Volume Backup',
  description: 'Retrieve a volume backup configuration by its ID.',
  schema: z
    .object({
      volumeBackupId: z.string().min(1).describe('Volume backup ID'),
    })
    .strict(),
  endpoint: '/volumeBackups.one',
})

const create = postTool({
  name: 'dokploy_volume_backups_create',
  title: 'Create Volume Backup',
  description:
    'Create a volume backup configuration in Dokploy. Requires the backup name, volume name, prefix, cron expression, and destination ID.',
  schema: volumeBackupPayload,
  endpoint: '/volumeBackups.create',
})

const update = postTool({
  name: 'dokploy_volume_backups_update',
  title: 'Update Volume Backup',
  description:
    'Update a volume backup configuration in Dokploy. Requires the volume backup ID together with the updated backup payload.',
  schema: volumeBackupPayload
    .extend({
      volumeBackupId: z.string().min(1).describe('Volume backup ID'),
    })
    .strict(),
  endpoint: '/volumeBackups.update',
})

const remove = postTool({
  name: 'dokploy_volume_backups_delete',
  title: 'Delete Volume Backup',
  description:
    'Delete a volume backup configuration from Dokploy. Requires the volume backup ID. This is a destructive action.',
  schema: z
    .object({
      volumeBackupId: z.string().min(1).describe('Volume backup ID'),
    })
    .strict(),
  endpoint: '/volumeBackups.delete',
  annotations: { destructiveHint: true },
})

const runManually = postTool({
  name: 'dokploy_volume_backups_run_manually',
  title: 'Run Volume Backup Manually',
  description: 'Trigger a volume backup immediately in Dokploy. Requires the volume backup ID.',
  schema: z
    .object({
      volumeBackupId: z.string().min(1).describe('Volume backup ID'),
    })
    .strict(),
  endpoint: '/volumeBackups.runManually',
})

export const volumeBackupsTools: ToolDefinition[] = [list, one, create, update, remove, runManually]
