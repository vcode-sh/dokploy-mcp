import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const pgId = z.string().min(1).describe("Unique Postgres database ID");
const DB = "postgres";

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `${DB}-one`,
  description: "Get details of a Postgres database by its ID.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.one`,
});

const create = postTool({
  name: `${DB}-create`,
  description: "Create a new Postgres database inside a project.",
  schema: z.object({
    name: z.string().min(1).describe("Display name for the database"),
    appName: z.string().min(1).describe("Unique app-level identifier"),
    databaseName: z.string().min(1).describe("Name of the database to create"),
    databaseUser: z.string().min(1).describe("Database user"),
    databasePassword: z.string().min(1).describe("Database password"),
    projectId: z.string().min(1).describe("Project ID to create the database in"),
    dockerImage: z.string().optional().describe("Docker image (default: postgres:15)"),
    description: z.string().nullable().optional().describe("Optional description"),
    serverId: z.string().nullable().optional().describe("Target server ID (null for local)"),
  }),
  endpoint: `${DB}.create`,
});

const update = postTool({
  name: `${DB}-update`,
  description: "Update an existing Postgres database configuration.",
  schema: z.object({
    postgresId: pgId,
    name: z.string().min(1).optional().describe("Display name"),
    appName: z.string().min(1).optional().describe("App-level identifier"),
    description: z.string().nullable().optional().describe("Description"),
    dockerImage: z.string().optional().describe("Docker image"),
    memoryReservation: z.number().nullable().optional().describe("Memory reservation in MB"),
    memoryLimit: z.number().nullable().optional().describe("Memory limit in MB"),
    cpuReservation: z.number().nullable().optional().describe("CPU reservation"),
    cpuLimit: z.number().nullable().optional().describe("CPU limit"),
    command: z.string().nullable().optional().describe("Custom start command"),
    env: z.string().nullable().optional().describe("Environment variables"),
    externalPort: z.number().nullable().optional().describe("External port"),
  }),
  endpoint: `${DB}.update`,
});

const remove = postTool({
  name: `${DB}-remove`,
  description: "Delete a Postgres database permanently.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
});

const move = postTool({
  name: `${DB}-move`,
  description: "Move a Postgres database to a different project.",
  schema: z.object({
    postgresId: pgId,
    targetProjectId: z.string().min(1).describe("Destination project ID"),
  }),
  endpoint: `${DB}.move`,
});

const deploy = postTool({
  name: `${DB}-deploy`,
  description: "Deploy the Postgres database.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.deploy`,
});

const start = postTool({
  name: `${DB}-start`,
  description: "Start a stopped Postgres database.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.start`,
});

const stop = postTool({
  name: `${DB}-stop`,
  description: "Stop a running Postgres database.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
});

const reload = postTool({
  name: `${DB}-reload`,
  description: "Reload the Postgres database container.",
  schema: z.object({
    postgresId: pgId,
    appName: z.string().min(1).describe("App-level identifier"),
  }),
  endpoint: `${DB}.reload`,
});

const rebuild = postTool({
  name: `${DB}-rebuild`,
  description: "Rebuild the Postgres database container from scratch.",
  schema: z.object({ postgresId: pgId }),
  endpoint: `${DB}.rebuild`,
});

const changeStatus = postTool({
  name: `${DB}-changeStatus`,
  description: "Manually set the Postgres database application status.",
  schema: z.object({
    postgresId: pgId,
    applicationStatus: z
      .enum(["idle", "running", "done", "error"])
      .describe("New application status"),
  }),
  endpoint: `${DB}.changeStatus`,
});

const saveExternalPort = postTool({
  name: `${DB}-saveExternalPort`,
  description: "Set or clear the external port for a Postgres database.",
  schema: z.object({
    postgresId: pgId,
    externalPort: z.number().nullable().describe("External port number (null to remove)"),
  }),
  endpoint: `${DB}.saveExternalPort`,
});

const saveEnvironment = postTool({
  name: `${DB}-saveEnvironment`,
  description: "Overwrite the environment variables for a Postgres database.",
  schema: z.object({
    postgresId: pgId,
    env: z.string().nullable().optional().describe("Environment variables as a string"),
  }),
  endpoint: `${DB}.saveEnvironment`,
});

// ── export ───────────────────────────────────────────────────────────
export const postgresTools: ToolDefinition[] = [
  one,
  create,
  update,
  remove,
  move,
  deploy,
  start,
  stop,
  reload,
  rebuild,
  changeStatus,
  saveExternalPort,
  saveEnvironment,
];
