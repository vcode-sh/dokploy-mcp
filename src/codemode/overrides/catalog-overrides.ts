import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

export interface CatalogResponseHints {
  commonResponseFields?: string[]
  responseHints?: string[]
  examples?: string[]
  notes?: string[]
}

export type CatalogEndpointWithHints = CatalogEndpoint & CatalogResponseHints

function createSharedHints(procedures: string[], hints: CatalogResponseHints) {
  return Object.fromEntries(procedures.map((procedure) => [procedure, hints]))
}

const catalogResponseHints: Record<string, CatalogResponseHints> = {
  'application.one': {
    commonResponseFields: [
      'name',
      'appName',
      'applicationStatus',
      'mounts',
      'watchPaths',
      'domains',
      'deployments',
    ],
    responseHints: [
      'Heavy detail endpoint for application config, runtime status, mounts, domains, and deployment history.',
      'Deployment history can dominate token usage because entries may include long commit messages.',
    ],
    examples: [
      'await dokploy.application.one({ applicationId: "app-123" })',
      'await dokploy.application.one({ applicationId: "app-123", select: ["name", "watchPaths"], deploymentLimit: 1 })',
      'catalog.get("application.one")',
    ],
    notes: [
      'Generated OpenAPI output schema is currently incomplete for this endpoint, so these are common observed fields rather than a full contract.',
      'MCP adds optional shaping inputs for this endpoint: select, includeDeployments, and deploymentLimit.',
    ],
  },
  'application.many': {
    commonResponseFields: ['items', 'total'],
    responseHints: [
      'MCP-only virtual helper that reads several applications by delegating to application.one.',
      'Preserves input order and supports the same shaping inputs as application.one.',
    ],
    examples: [
      'await dokploy.application.many({ applicationIds: ["app-1", "app-2"], select: ["name", "watchPaths"] })',
    ],
    notes: [
      'This helper is available in execute workflows and is not backed by a Dokploy HTTP endpoint.',
    ],
  },
  'project.all': {
    commonResponseFields: ['projectId', 'name', 'environments'],
    responseHints: ['Commonly returns projects with nested environments and service references.'],
    examples: ['await dokploy.project.all({})'],
  },
  'project.overview': {
    commonResponseFields: ['projectId', 'name', 'environments'],
    responseHints: [
      'MCP-only virtual helper that returns a compact per-environment and per-application project state view.',
      'Per application it focuses on applicationId, name, appName, applicationStatus, domains, mounts, watchPaths, and lastDeployment.',
    ],
    examples: ['await dokploy.project.overview({ projectId: "project-1" })'],
    notes: [
      'This helper is available in execute workflows and is not backed by a Dokploy HTTP endpoint.',
    ],
  },
  'project.one': {
    commonResponseFields: ['projectId', 'name', 'description', 'environments'],
    responseHints: ['Project detail endpoint used to inspect one project and its environments.'],
    notes: [
      'Generated OpenAPI output schema is currently incomplete for this endpoint, so nested service details may not be visible from the schema alone.',
    ],
  },
  'deployment.all': {
    commonResponseFields: ['deploymentId', 'title', 'status', 'createdAt'],
    responseHints: ['Returns deployment history entries ordered for inspection workflows.'],
    examples: ['await dokploy.deployment.all({ applicationId: "app-123" })'],
  },
  'compose.search': {
    commonResponseFields: ['items', 'total'],
    responseHints: ['Search endpoints commonly return paginated results with items and total.'],
    examples: ['await dokploy.compose.search({ name: "wordpress", limit: 5 })'],
  },
  ...createSharedHints(['sshKey.one', 'sshKey.all', 'sshKey.generate', 'sshKey.allForApps'], {
    commonResponseFields: ['sshKeyId', 'name', 'description', 'publicKey', 'privateKey'],
    responseHints: [
      'SSH key read endpoints are used for inventory and key-audit workflows.',
      'Some responses may contain private key material, so MCP redacts it by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw key material is explicitly required.'],
  }),
  'server.withSSHKey': {
    commonResponseFields: ['serverId', 'name', 'ipAddress', 'sshKey'],
    responseHints: [
      'Server inventory endpoint that joins servers with their attached SSH keys.',
      'Nested sshKey objects may contain private key material, so MCP redacts it by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw key material is explicitly required.'],
  },
  ...createSharedHints(['certificates.one', 'certificates.all'], {
    commonResponseFields: ['certificateId', 'name', 'domain', 'certificateData', 'privateKey'],
    responseHints: [
      'TLS certificate reads are useful for certificate inventory, expiry checks, and domain audits.',
      'Certificate records may include a private key, so MCP redacts it by default.',
    ],
    notes: [
      'Certificate bodies are typically safe to inspect, but private keys require includeSecrets.',
    ],
  }),
  ...createSharedHints(['destination.one', 'destination.all'], {
    commonResponseFields: [
      'destinationId',
      'name',
      'provider',
      'bucket',
      'region',
      'endpoint',
      'accessKey',
      'secretAccessKey',
    ],
    responseHints: [
      'Object storage destination config used by backup and export flows.',
      'Read outputs can include accessKey and secretAccessKey, so MCP redacts them by default.',
    ],
    notes: ['Pass includeSecrets: true only when credential inspection is explicitly required.'],
  }),
  ...createSharedHints(['notification.one', 'notification.all'], {
    commonResponseFields: [
      'notificationId',
      'name',
      'provider',
      'appDeploy',
      'databaseBackup',
      'dockerCleanup',
      'serverThreshold',
    ],
    responseHints: [
      'Notification read endpoints return provider-specific alert config for Slack, Discord, Email, Resend, Gotify, Ntfy, Teams, and more.',
      'Read outputs can include smtp password, webhook URL, bot token, API key, access token, user key, or custom headers.',
    ],
    notes: [
      'Secret-bearing provider fields are redacted by default unless includeSecrets is true.',
    ],
  }),
  'sso.one': {
    commonResponseFields: ['providerId', 'issuer', 'domains', 'oidcConfig', 'samlConfig'],
    responseHints: [
      'SSO provider detail endpoint for OIDC and SAML configuration audits.',
      'Provider configs may include clientSecret and private key material, so MCP redacts them by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw SSO secrets are explicitly required.'],
  },
  'project.allForPermissions': {
    commonResponseFields: ['projectId', 'name'],
    responseHints: [
      'Permission-scoped project list for picker and authorization-aware selection flows.',
    ],
    examples: ['await dokploy.project.allForPermissions({})'],
  },
  'server.allForPermissions': {
    commonResponseFields: ['serverId', 'name'],
    responseHints: [
      'Permission-scoped server list for picker and authorization-aware selection flows.',
    ],
  },
  ...createSharedHints(['settings.health', 'settings.checkInfrastructureHealth'], {
    commonResponseFields: ['status', 'message', 'version'],
    responseHints: [
      'Infrastructure status and health endpoint for Dokploy core services and dependencies.',
    ],
  }),
  'settings.getDockerDiskUsage': {
    commonResponseFields: ['images', 'containers', 'volumes', 'buildCache'],
    responseHints: ['Disk usage read for Docker cleanup planning and capacity audits.'],
  },
  ...createSharedHints(
    [
      'settings.readTraefikConfig',
      'settings.readWebServerTraefikConfig',
      'settings.readMiddlewareTraefikConfig',
      'settings.readTraefikFile',
      'settings.readTraefikEnv',
    ],
    {
      commonResponseFields: ['content', 'path'],
      responseHints: [
        'Read-only Traefik config and env endpoints return raw config text for proxy audits.',
        'These responses are token-heavy because they often return full config files or environment files.',
      ],
      notes: ['Prefer the narrowest config read endpoint available to reduce output volume.'],
    },
  ),
  ...createSharedHints(['settings.getWebServerSettings', 'settings.getTraefikPorts'], {
    commonResponseFields: ['httpPort', 'httpsPort', 'dashboardPort'],
    responseHints: [
      'Infra and proxy settings reads used to inspect the current web server and port configuration.',
    ],
  }),
  ...createSharedHints(
    ['settings.getDokployVersion', 'settings.getReleaseTag', 'settings.getUpdateData'],
    {
      commonResponseFields: ['version', 'releaseTag', 'latestVersion'],
      responseHints: [
        'Version and update status endpoints used for upgrade planning and release audits.',
      ],
    },
  ),
  'settings.getLogCleanupStatus': {
    commonResponseFields: ['enabled', 'schedule', 'retentionDays'],
    responseHints: ['Infra settings read for log cleanup, retention, and storage policy checks.'],
  },
  'settings.readDirectories': {
    commonResponseFields: ['rootDir', 'composeDir', 'uploadDir'],
    responseHints: [
      'Filesystem settings read used to inspect Dokploy directory layout and path configuration.',
    ],
  },
  ...createSharedHints(
    [
      'application.readLogs',
      'compose.readLogs',
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

export function getCatalogResponseHints(procedure: string): CatalogResponseHints | null {
  return catalogResponseHints[procedure] ?? null
}

export function applyCatalogResponseHints(endpoint: CatalogEndpoint): CatalogEndpointWithHints {
  const hints = getCatalogResponseHints(endpoint.procedure)
  return hints ? { ...endpoint, ...hints } : endpoint
}
