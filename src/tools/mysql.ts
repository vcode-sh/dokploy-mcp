import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const myId = z.string().min(1).describe("Unique MySQL database ID");
const DB = "mysql";

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `${DB}-one`,
  description: "Get details of a MySQL database by its ID.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.one`,
});

const create = postTool({
  name: `${DB}-create`,
  description: "Create a new MySQL database inside a project.",
  schema: z.object({
    name: z.string().min(1).describe("Display name for the database"),
    appName: z.string().min(1).describe("Unique app-level identifier"),
    databaseName: z.string().min(1).describe("Name of the database to create"),
    databaseUser: z.string().min(1).describe("Database user"),
    databasePassword: z.string().min(1).describe("Database password"),
    databaseRootPassword: z.string().min(1).describe("Root password for MySQL"),
    projectId: z.string().min(1).describe("Project ID to create the database in"),
    dockerImage: z.string().optional().describe("Docker image (default: mysql:8)"),
    description: z.string().nullable().optional().describe("Optional description"),
    serverId: z.string().nullable().optional().describe("Target server ID (null for local)"),
  }),
  endpoint: `${DB}.create`,
});

const update = postTool({
  name: `${DB}-update`,
  description: "Update an existing MySQL database configuration.",
  schema: z.object({
    mysqlId: myId,
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
  description: "Delete a MySQL database permanently.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
});

const move = postTool({
  name: `${DB}-move`,
  description: "Move a MySQL database to a different project.",
  schema: z.object({
    mysqlId: myId,
    targetProjectId: z.string().min(1).describe("Destination project ID"),
  }),
  endpoint: `${DB}.move`,
});

const deploy = postTool({
  name: `${DB}-deploy`,
  description: "Deploy the MySQL database.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.deploy`,
});

const start = postTool({
  name: `${DB}-start`,
  description: "Start a stopped MySQL database.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.start`,
});

const stop = postTool({
  name: `${DB}-stop`,
  description: "Stop a running MySQL database.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
});

const reload = postTool({
  name: `${DB}-reload`,
  description: "Reload the MySQL database container.",
  schema: z.object({
    mysqlId: myId,
    appName: z.string().min(1).describe("App-level identifier"),
  }),
  endpoint: `${DB}.reload`,
});

const rebuild = postTool({
  name: `${DB}-rebuild`,
  description: "Rebuild the MySQL database container from scratch.",
  schema: z.object({ mysqlId: myId }),
  endpoint: `${DB}.rebuild`,
});

const changeStatus = postTool({
  name: `${DB}-changeStatus`,
  description: "Manually set the MySQL database application status.",
  schema: z.object({
    mysqlId: myId,
    applicationStatus: z
      .enum(["idle", "running", "done", "error"])
      .describe("New application status"),
  }),
  endpoint: `${DB}.changeStatus`,
});

const saveExternalPort = postTool({
  name: `${DB}-saveExternalPort`,
  description: "Set or clear the external port for a MySQL database.",
  schema: z.object({
    mysqlId: myId,
    externalPort: z.number().nullable().describe("External port number (null to remove)"),
  }),
  endpoint: `${DB}.saveExternalPort`,
});

const saveEnvironment = postTool({
  name: `${DB}-saveEnvironment`,
  description: "Overwrite the environment variables for a MySQL database.",
  schema: z.object({
    mysqlId: myId,
    env: z.string().nullable().optional().describe("Environment variables as a string"),
  }),
  endpoint: `${DB}.saveEnvironment`,
});

// ── export ───────────────────────────────────────────────────────────
export const mysqlTools: ToolDefinition[] = [
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
