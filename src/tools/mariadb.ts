import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const mdbId = z.string().min(1).describe("Unique MariaDB database ID");
const DB = "mariadb";

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `${DB}-one`,
  description: "Get details of a MariaDB database by its ID.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.one`,
});

const create = postTool({
  name: `${DB}-create`,
  description: "Create a new MariaDB database inside a project.",
  schema: z.object({
    name: z.string().min(1).describe("Display name for the database"),
    appName: z.string().min(1).describe("Unique app-level identifier"),
    databaseName: z.string().min(1).describe("Name of the database to create"),
    databaseUser: z.string().min(1).describe("Database user"),
    databasePassword: z.string().min(1).describe("Database password"),
    databaseRootPassword: z.string().min(1).describe("Root password for MariaDB"),
    projectId: z.string().min(1).describe("Project ID to create the database in"),
    dockerImage: z.string().optional().describe("Docker image (default: mariadb:11)"),
    description: z.string().nullable().optional().describe("Optional description"),
    serverId: z.string().nullable().optional().describe("Target server ID (null for local)"),
  }),
  endpoint: `${DB}.create`,
});

const update = postTool({
  name: `${DB}-update`,
  description: "Update an existing MariaDB database configuration.",
  schema: z.object({
    mariadbId: mdbId,
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
  description: "Delete a MariaDB database permanently.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
});

const move = postTool({
  name: `${DB}-move`,
  description: "Move a MariaDB database to a different project.",
  schema: z.object({
    mariadbId: mdbId,
    targetProjectId: z.string().min(1).describe("Destination project ID"),
  }),
  endpoint: `${DB}.move`,
});

const deploy = postTool({
  name: `${DB}-deploy`,
  description: "Deploy the MariaDB database.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.deploy`,
});

const start = postTool({
  name: `${DB}-start`,
  description: "Start a stopped MariaDB database.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.start`,
});

const stop = postTool({
  name: `${DB}-stop`,
  description: "Stop a running MariaDB database.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
});

const reload = postTool({
  name: `${DB}-reload`,
  description: "Reload the MariaDB database container.",
  schema: z.object({
    mariadbId: mdbId,
    appName: z.string().min(1).describe("App-level identifier"),
  }),
  endpoint: `${DB}.reload`,
});

const rebuild = postTool({
  name: `${DB}-rebuild`,
  description: "Rebuild the MariaDB database container from scratch.",
  schema: z.object({ mariadbId: mdbId }),
  endpoint: `${DB}.rebuild`,
});

const changeStatus = postTool({
  name: `${DB}-changeStatus`,
  description: "Manually set the MariaDB database application status.",
  schema: z.object({
    mariadbId: mdbId,
    applicationStatus: z
      .enum(["idle", "running", "done", "error"])
      .describe("New application status"),
  }),
  endpoint: `${DB}.changeStatus`,
});

const saveExternalPort = postTool({
  name: `${DB}-saveExternalPort`,
  description: "Set or clear the external port for a MariaDB database.",
  schema: z.object({
    mariadbId: mdbId,
    externalPort: z.number().nullable().describe("External port number (null to remove)"),
  }),
  endpoint: `${DB}.saveExternalPort`,
});

const saveEnvironment = postTool({
  name: `${DB}-saveEnvironment`,
  description: "Overwrite the environment variables for a MariaDB database.",
  schema: z.object({
    mariadbId: mdbId,
    env: z.string().nullable().optional().describe("Environment variables as a string"),
  }),
  endpoint: `${DB}.saveEnvironment`,
});

// ── export ───────────────────────────────────────────────────────────
export const mariadbTools: ToolDefinition[] = [
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
