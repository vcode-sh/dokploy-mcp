import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const getNodes = getTool({
  name: 'dokploy_cluster_get_nodes',
  title: 'List Cluster Nodes',
  description:
    'List all nodes in the Docker Swarm cluster. No parameters required. Returns an array of node objects including each node ID, hostname, role (manager or worker), availability status, and resource information.',
  schema: z.object({}).strict(),
  endpoint: '/cluster.getNodes',
})

const addWorker = getTool({
  name: 'dokploy_cluster_add_worker',
  title: 'Get Add Worker Command',
  description:
    'Get the Docker Swarm join command to add a new worker node to the cluster. No parameters required. Returns the full docker swarm join command with the appropriate token and manager address that should be executed on the new worker machine.',
  schema: z.object({}).strict(),
  endpoint: '/cluster.addWorker',
})

const addManager = getTool({
  name: 'dokploy_cluster_add_manager',
  title: 'Get Add Manager Command',
  description:
    'Get the Docker Swarm join command to add a new manager node to the cluster. No parameters required. Returns the full docker swarm join command with the appropriate manager token and address that should be executed on the new manager machine.',
  schema: z.object({}).strict(),
  endpoint: '/cluster.addManager',
})

const removeWorker = postTool({
  name: 'dokploy_cluster_remove_worker',
  title: 'Remove Worker Node',
  description:
    'Remove a worker node from the Docker Swarm cluster. This action is irreversible and any services running on the node will be rescheduled to other available nodes. Requires the nodeId parameter identifying the worker to remove. Returns a confirmation of the removal.',
  schema: z
    .object({
      nodeId: z.string().min(1).describe('ID of the worker node to remove from the cluster'),
    })
    .strict(),
  endpoint: '/cluster.removeWorker',
  annotations: { destructiveHint: true },
})

// ── export ───────────────────────────────────────────────────────────
export const clusterTools: ToolDefinition[] = [getNodes, addWorker, addManager, removeWorker]
