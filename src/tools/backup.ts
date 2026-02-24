import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const backupId = z.string().min(1).describe("Unique backup ID");

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: "backup-one",
  description: "Get details of a specific backup configuration by its ID.",
  schema: z.object({ backupId }),
  endpoint: "/backup.one",
});

const create = postTool({
  name: "backup-create",
  description: "Create a new scheduled backup configuration for a database.",
  schema: z.object({
    schedule: z.string().min(1).describe("Cron schedule expression for the backup"),
    prefix: z.string().min(1).describe("Prefix for backup file names"),
    destinationId: z
      .string()
      .min(1)
      .describe("Destination ID where backups will be stored"),
    database: z.string().min(1).describe("Name of the database to back up"),
    databaseType: z
      .enum(["postgres", "mariadb", "mysql", "mongo"])
      .describe("Type of the database"),
    enabled: z.boolean().optional().describe("Whether the backup is enabled"),
    postgresId: z
      .string()
      .optional()
      .describe("Postgres database ID (when databaseType is postgres)"),
    mysqlId: z
      .string()
      .optional()
      .describe("MySQL database ID (when databaseType is mysql)"),
    mariadbId: z
      .string()
      .optional()
      .describe("MariaDB database ID (when databaseType is mariadb)"),
    mongoId: z
      .string()
      .optional()
      .describe("MongoDB database ID (when databaseType is mongo)"),
  }),
  endpoint: "/backup.create",
});

const update = postTool({
  name: "backup-update",
  description: "Update an existing backup configuration.",
  schema: z.object({
    backupId,
    schedule: z.string().min(1).describe("Cron schedule expression for the backup"),
    prefix: z.string().min(1).describe("Prefix for backup file names"),
    destinationId: z
      .string()
      .min(1)
      .describe("Destination ID where backups will be stored"),
    database: z.string().min(1).describe("Name of the database to back up"),
    enabled: z.boolean().optional().describe("Whether the backup is enabled"),
  }),
  endpoint: "/backup.update",
});

const remove = postTool({
  name: "backup-remove",
  description:
    "Remove a backup configuration permanently. This action is irreversible.",
  schema: z.object({ backupId }),
  endpoint: "/backup.remove",
  annotations: { destructiveHint: true },
});

const manualBackupPostgres = postTool({
  name: "backup-manualBackupPostgres",
  description: "Trigger an immediate manual backup of a Postgres database.",
  schema: z.object({ backupId }),
  endpoint: "/backup.manualBackupPostgres",
});

const manualBackupMySql = postTool({
  name: "backup-manualBackupMySql",
  description: "Trigger an immediate manual backup of a MySQL database.",
  schema: z.object({ backupId }),
  endpoint: "/backup.manualBackupMySql",
});

const manualBackupMariadb = postTool({
  name: "backup-manualBackupMariadb",
  description: "Trigger an immediate manual backup of a MariaDB database.",
  schema: z.object({ backupId }),
  endpoint: "/backup.manualBackupMariadb",
});

const manualBackupMongo = postTool({
  name: "backup-manualBackupMongo",
  description: "Trigger an immediate manual backup of a MongoDB database.",
  schema: z.object({ backupId }),
  endpoint: "/backup.manualBackupMongo",
});

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
];
