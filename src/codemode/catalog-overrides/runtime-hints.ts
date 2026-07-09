import { createSharedHints } from './builders.js'
import type { CatalogResponseHints } from './types.js'

export const runtimeCatalogResponseHints: Record<string, CatalogResponseHints> = {
  ...createSharedHints(
    [
      'application.readLogs',
      'compose.readLogs',
      'deployment.readLogs',
      'libsql.readLogs',
      'mariadb.readLogs',
      'mongo.readLogs',
      'mysql.readLogs',
      'postgres.readLogs',
      'redis.readLogs',
    ],
    {
      commonResponseFields: ['logs', 'timestamp', 'message', 'stream'],
      responseHints: [
        'Read-only log endpoints return recent stdout, stderr, or service log lines for one workload.',
        'Log payloads are token-heavy and can be large, so prefer narrow targets and recent windows when available.',
        'Use these endpoints for workflows like tail application logs, inspect recent compose container logs, or search database logs for errors.',
      ],
      notes: [
        'Treat logs as volatile text output rather than stable structured state.',
        'MCP clamps oversized tail requests and bounds returned log output to recent lines and bytes after redacting common secret patterns.',
      ],
    },
  ),
  'swarm.getContainerStats': {
    commonResponseFields: ['cpuPercent', 'memoryUsage', 'networkRx', 'networkTx'],
    responseHints: [
      'Runtime container stats read for infrastructure health and capacity investigations.',
    ],
  },
  'ai.getEnabledProviders': {
    commonResponseFields: ['providers', 'enabled'],
    responseHints: [
      'AI provider capability read used to inspect which providers are currently enabled.',
    ],
  },
}
