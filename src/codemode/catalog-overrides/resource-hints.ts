import { createSharedHints } from './builders.js'
import type { CatalogResponseHints } from './types.js'

const dokployResourceFieldNotes = [
  'memoryReservation and memoryLimit are string fields containing bytes, not Docker shorthand. Example: 256MB -> "268435456".',
  'cpuReservation and cpuLimit are numeric strings such as "0.25", "0.50", or "1".',
  'When users say "max memory" or "max CPU", map that to memoryLimit and cpuLimit.',
]

export const resourceCatalogResponseHints: Record<string, CatalogResponseHints> = {
  'application.create': {
    commonResponseFields: [
      'applicationId',
      'name',
      'appName',
      'applicationStatus',
      'sourceType',
      'buildType',
      'environmentId',
    ],
    responseHints: [
      'Creates the application shell in Dokploy, but most real workloads still need a follow-up application.update before first deploy.',
      'After create, verify sourceType, buildType, ports, resource limits, and mounts before calling application.deploy.',
    ],
    examples: [
      'await dokploy.application.create({ name: "my-app", appName: "my-app", environmentId: "env-1" })',
    ],
  },
  'application.update': {
    responseHints: [
      'Primary mutation endpoint for application build config, runtime settings, and resource tuning.',
      'Use this endpoint to set Docker image/source config, CPU and memory fields, ports, and deployment-related settings before application.deploy.',
    ],
    examples: [
      'await dokploy.application.update({ applicationId: "app-123", sourceType: "docker", dockerImage: "nginx:alpine" })',
      'await dokploy.application.update({ applicationId: "app-123", memoryReservation: "134217728", memoryLimit: "268435456", cpuReservation: "0.10", cpuLimit: "0.50" })',
    ],
    notes: dokployResourceFieldNotes,
  },
  ...createSharedHints(
    [
      'libsql.update',
      'mariadb.update',
      'mongo.update',
      'mysql.update',
      'postgres.update',
      'redis.update',
    ],
    {
      responseHints: [
        'Resource tuning endpoint for Dokploy data services, including CPU and memory reservation and limit fields.',
      ],
      notes: dokployResourceFieldNotes,
    },
  ),
  'application.deploy': {
    responseHints: [
      'Deploys the current application configuration. Make sure sourceType/build config and resource fields are already valid before calling it.',
    ],
    examples: [
      'await dokploy.application.deploy({ applicationId: "app-123", title: "Audit deploy" })',
    ],
  },
  'mounts.create': {
    commonResponseFields: [
      'mountId',
      'type',
      'mountPath',
      'serviceType',
      'applicationId',
      'volumeName',
    ],
    responseHints: [
      'Creates a mount for one Dokploy service. Dokploy supports three mount types: bind, volume, and file.',
      'Use type "volume" for the default portable persistent-data case. This is the safest default for clustered or production-sensitive deployments.',
      'Use type "bind" only when the service must read or write a specific existing host path. serviceId is the target resource id; for application mounts use serviceType: "application".',
      'Use type "file" for managed config files or small generated file content rather than directories.',
    ],
    examples: [
      'await dokploy.mounts.create({ type: "volume", serviceType: "application", serviceId: "app-123", mountPath: "/data", volumeName: "audit-volume" })',
      'await dokploy.mounts.create({ type: "bind", serviceType: "application", serviceId: "app-123", mountPath: "/usr/share/nginx/html", hostPath: "/srv/my-app/public" })',
      'await dokploy.mounts.create({ type: "file", serviceType: "application", serviceId: "app-123", mountPath: "/app/config/app.json", filePath: "config/app.json", content: "{"ok":true}" })',
    ],
    notes: [
      'Bind mounts require hostPath, and the path must already exist on the Dokploy host machine.',
      'Cluster warning: bind mounts can fail on worker or manager nodes if the same hostPath does not exist on every node.',
      'Prefer named volume mounts unless you explicitly need a host directory or a managed file mount.',
      'MCP can validate the shape of hostPath input, but it cannot prove that the path exists on the remote Dokploy host.',
      'File mounts should include filePath and usually include content when creating a managed file.',
    ],
  },
  'mounts.update': {
    responseHints: [
      'Updates an existing mount. When changing the mount type, include the required type-specific field again: hostPath for bind, volumeName for volume, filePath for file.',
      'After mounts.update, verify the persisted state through mounts.one, mounts.listByServiceId, or application.one.',
    ],
    notes: [
      'Bind mount updates still depend on the host path existing on the Dokploy host.',
      'In clustered Dokploy deployments, bind mount changes can still fail if the path does not exist on every relevant node.',
    ],
  },
  'mounts.listByServiceId': {
    commonResponseFields: ['mountId', 'type', 'mountPath', 'serviceType', 'volumeName'],
    responseHints: [
      'Use this endpoint to verify the exact persisted mounts for one service after mounts.create or mounts.update.',
      'This is especially important for bind and file mounts because the persisted Dokploy record is the first sanity check before deployment.',
    ],
  },
  'mounts.one': {
    commonResponseFields: [
      'mountId',
      'type',
      'mountPath',
      'hostPath',
      'volumeName',
      'filePath',
      'serviceType',
    ],
    responseHints: [
      'Use this endpoint to inspect one mount in detail after create or update operations.',
    ],
  },
}
