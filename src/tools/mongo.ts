import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── helpers ──────────────────────────────────────────────────────────
const mgId = z.string().min(1).describe("Unique MongoDB database ID");
const DB = "mongo";

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: `${DB}-one`,
  description: "Get details of a MongoDB database by its ID.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.one`,
});

const create = postTool({
  name: `${DB}-create`,
  description: "Create a new MongoDB database inside a project.",
  schema: z.object({
    name: z.string().min(1).describe("Display name for the database"),
    appName: z.string().min(1).describe("Unique app-level identifier"),
    databaseUser: z.string().min(1).describe("Database user"),
    databasePassword: z.string().min(1).describe("Database password"),
    projectId: z.string().min(1).describe("Project ID to create the database in"),
    dockerImage: z.string().optional().describe("Docker image (default: mongo:6)"),
    description: z.string().nullable().optional().describe("Optional description"),
    serverId: z.string().nullable().optional().describe("Target server ID (null for local)"),
  }),
  endpoint: `${DB}.create`,
});

const update = postTool({
  name: `${DB}-update`,
  description: "Update an existing MongoDB database configuration.",
  schema: z.object({
    mongoId: mgId,
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
  description: "Delete a MongoDB database permanently.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.remove`,
  annotations: { destructiveHint: true },
});

const move = postTool({
  name: `${DB}-move`,
  description: "Move a MongoDB database to a different project.",
  schema: z.object({
    mongoId: mgId,
    targetProjectId: z.string().min(1).describe("Destination project ID"),
  }),
  endpoint: `${DB}.move`,
});

const deploy = postTool({
  name: `${DB}-deploy`,
  description: "Deploy the MongoDB database.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.deploy`,
});

const start = postTool({
  name: `${DB}-start`,
  description: "Start a stopped MongoDB database.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.start`,
});

const stop = postTool({
  name: `${DB}-stop`,
  description: "Stop a running MongoDB database.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.stop`,
  annotations: { destructiveHint: true },
});

const reload = postTool({
  name: `${DB}-reload`,
  description: "Reload the MongoDB database container.",
  schema: z.object({
    mongoId: mgId,
    appName: z.string().min(1).describe("App-level identifier"),
  }),
  endpoint: `${DB}.reload`,
});

const rebuild = postTool({
  name: `${DB}-rebuild`,
  description: "Rebuild the MongoDB database container from scratch.",
  schema: z.object({ mongoId: mgId }),
  endpoint: `${DB}.rebuild`,
});

const changeStatus = postTool({
  name: `${DB}-changeStatus`,
  description: "Manually set the MongoDB database application status.",
  schema: z.object({
    mongoId: mgId,
    applicationStatus: z
      .enum(["idle", "running", "done", "error"])
      .describe("New application status"),
  }),
  endpoint: `${DB}.changeStatus`,
});

const saveExternalPort = postTool({
  name: `${DB}-saveExternalPort`,
  description: "Set or clear the external port for a MongoDB database.",
  schema: z.object({
    mongoId: mgId,
    externalPort: z.number().nullable().describe("External port number (null to remove)"),
  }),
  endpoint: `${DB}.saveExternalPort`,
});

const saveEnvironment = postTool({
  name: `${DB}-saveEnvironment`,
  description: "Overwrite the environment variables for a MongoDB database.",
  schema: z.object({
    mongoId: mgId,
    env: z.string().nullable().optional().describe("Environment variables as a string"),
  }),
  endpoint: `${DB}.saveEnvironment`,
});

// ── export ───────────────────────────────────────────────────────────
export const mongoTools: ToolDefinition[] = [
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
