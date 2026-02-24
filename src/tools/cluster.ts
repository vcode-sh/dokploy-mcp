import { z } from "zod";
import { type ToolDefinition, getTool, postTool } from "./_factory.js";

// ── tools ────────────────────────────────────────────────────────────

const getNodes = getTool({
  name: "cluster-getNodes",
  description: "List all nodes in the Docker Swarm cluster.",
  schema: z.object({}),
  endpoint: "/cluster.getNodes",
});

const addWorker = getTool({
  name: "cluster-addWorker",
  description:
    "Get the command to add a new worker node to the Docker Swarm cluster.",
  schema: z.object({}),
  endpoint: "/cluster.addWorker",
});

const addManager = getTool({
  name: "cluster-addManager",
  description:
    "Get the command to add a new manager node to the Docker Swarm cluster.",
  schema: z.object({}),
  endpoint: "/cluster.addManager",
});

const removeWorker = postTool({
  name: "cluster-removeWorker",
  description:
    "Remove a worker node from the Docker Swarm cluster. This action is irreversible.",
  schema: z.object({
    nodeId: z
      .string()
      .min(1)
      .describe("ID of the worker node to remove from the cluster"),
  }),
  endpoint: "/cluster.removeWorker",
  annotations: { destructiveHint: true },
});

// ── export ───────────────────────────────────────────────────────────
export const clusterTools: ToolDefinition[] = [
  getNodes,
  addWorker,
  addManager,
  removeWorker,
];
