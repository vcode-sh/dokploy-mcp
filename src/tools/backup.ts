import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── helpers ──────────────────────────────────────────────────────────
const backupId = z.string().min(1).describe('Unique backup ID')

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_backup_one',
  title: 'Get Backup Configuration',
  description:
    'Retrieve the full details of a specific backup configuration by its unique ID. Requires the backupId parameter. Returns the backup object including its schedule, prefix, destination, database type, and enabled status.',
  schema: z.object({ backupId }),
  endpoint: '/backup.one',
})

const create = postTool({
  name: 'dokploy_backup_create',
  title: 'Create Backup Schedule',
  description:
    'Create a new scheduled backup configuration for a database service in Dokploy. Requires a cron schedule expression, file name prefix, destination ID, database name, and database type (postgres, mysql, mariadb, or mongo). Optionally accepts the specific database service ID and an enabled flag. Returns the created backup configuration.',
  schema: z.object({
    schedule: z.string().min(1).describe('Cron schedule expression for the backup'),
    prefix: z.string().min(1).describe('Prefix for backup file names'),
    destinationId: z.string().min(1).describe('Destination ID where backups will be stored'),
    database: z.string().min(1).describe('Name of the database to back up'),
    databaseType: z
      .enum(['postgres', 'mariadb', 'mysql', 'mongo'])
      .describe('Type of the database'),
    enabled: z.boolean().optional().describe('Whether the backup is enabled'),
    postgresId: z
      .string()
      .optional()
      .describe('Postgres database ID (when databaseType is postgres)'),
    mysqlId: z.string().optional().describe('MySQL database ID (when databaseType is mysql)'),
    mariadbId: z.string().optional().describe('MariaDB database ID (when databaseType is mariadb)'),
    mongoId: z.string().optional().describe('MongoDB database ID (when databaseType is mongo)'),
  }),
  endpoint: '/backup.create',
})

const update = postTool({
  name: 'dokploy_backup_update',
  title: 'Update Backup Schedule',
  description:
    'Update an existing backup schedule configuration. Requires the backupId along with the updated cron schedule, file name prefix, destination ID, and database name. Optionally accepts an enabled flag to activate or deactivate the schedule. Returns the updated backup configuration.',
  schema: z.object({
    backupId,
    schedule: z.string().min(1).describe('Cron schedule expression for the backup'),
    prefix: z.string().min(1).describe('Prefix for backup file names'),
    destinationId: z.string().min(1).describe('Destination ID where backups will be stored'),
    database: z.string().min(1).describe('Name of the database to back up'),
    enabled: z.boolean().optional().describe('Whether the backup is enabled'),
  }),
  endpoint: '/backup.update',
})

const remove = postTool({
  name: 'dokploy_backup_remove',
  title: 'Remove Backup Schedule',
  description:
    'Permanently remove a backup schedule configuration from Dokploy. This action is irreversible and stops all future scheduled backups for this configuration. Requires the backupId parameter. Previously created backup files at the destination are not deleted.',
  schema: z.object({ backupId }),
  endpoint: '/backup.remove',
  annotations: { destructiveHint: true },
})

const manualBackupPostgres = postTool({
  name: 'dokploy_backup_manual_postgres',
  title: 'Manual Postgres Backup',
  description:
    'Trigger an immediate manual backup of a PostgreSQL database. Requires the backupId of an existing backup configuration that specifies the destination and database details. The backup runs asynchronously and stores the dump file at the configured S3 destination.',
  schema: z.object({ backupId }),
  endpoint: '/backup.manualBackupPostgres',
})

const manualBackupMySql = postTool({
  name: 'dokploy_backup_manual_mysql',
  title: 'Manual MySQL Backup',
  description:
    'Trigger an immediate manual backup of a MySQL database. Requires the backupId of an existing backup configuration that specifies the destination and database details. The backup runs asynchronously and stores the dump file at the configured S3 destination.',
  schema: z.object({ backupId }),
  endpoint: '/backup.manualBackupMySql',
})

const manualBackupMariadb = postTool({
  name: 'dokploy_backup_manual_mariadb',
  title: 'Manual MariaDB Backup',
  description:
    'Trigger an immediate manual backup of a MariaDB database. Requires the backupId of an existing backup configuration that specifies the destination and database details. The backup runs asynchronously and stores the dump file at the configured S3 destination.',
  schema: z.object({ backupId }),
  endpoint: '/backup.manualBackupMariadb',
})

const manualBackupMongo = postTool({
  name: 'dokploy_backup_manual_mongo',
  title: 'Manual MongoDB Backup',
  description:
    'Trigger an immediate manual backup of a MongoDB database. Requires the backupId of an existing backup configuration that specifies the destination and database details. The backup runs asynchronously and stores the dump file at the configured S3 destination.',
  schema: z.object({ backupId }),
  endpoint: '/backup.manualBackupMongo',
})

// ── export ───────────────────────────────────────────────────────────
export const backupTools: ToolDefinition[] = [
  one,
  create,
  update,
  remove,
  manualBackupPostgres,
  manualBackupMySql,
  manualBackupMariadb,
  manualBackupMongo,
]
