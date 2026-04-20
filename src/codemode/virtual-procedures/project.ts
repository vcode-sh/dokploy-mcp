import {
  getArray,
  getBooleanOrNull,
  getServerId,
  getStringOrNull,
  isRecord,
  validateBooleanFlag,
  validateStringList,
} from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

function createProjectOverviewInputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        minLength: 1,
      },
      pageSize: {
        type: 'integer',
      },
    },
    required: ['projectId'],
    additionalProperties: false,
  }
}

function createProjectOverviewOutputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
      },
      name: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      environments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
    required: ['projectId', 'name', 'environments'],
    additionalProperties: false,
  }
}

function validateProjectOverviewInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if (typeof input.projectId !== 'string' || input.projectId.trim().length === 0) {
    errors.push('projectId must be a non-empty string')
  }

  if ('pageSize' in input) {
    if (
      typeof input.pageSize !== 'number' ||
      !Number.isInteger(input.pageSize) ||
      input.pageSize <= 0
    ) {
      errors.push('pageSize must be a positive integer')
    }
  }

  return errors
}

function buildProjectOverviewApplication(value: unknown) {
  if (!isRecord(value)) {
    return {
      applicationId: null,
      name: null,
      appName: null,
      applicationStatus: null,
      domains: [],
      mounts: [],
      watchPaths: [],
      lastDeployment: null,
    }
  }

  const deployments = getArray(value.deployments)

  return {
    applicationId: getStringOrNull(value.applicationId),
    name: getStringOrNull(value.name),
    appName: getStringOrNull(value.appName),
    applicationStatus: getStringOrNull(value.applicationStatus),
    domains: getArray(value.domains),
    mounts: getArray(value.mounts),
    watchPaths: getArray(value.watchPaths),
    lastDeployment: deployments[0] ?? null,
  }
}

async function executeProjectOverview(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const projectId = String(input.projectId)
  const project = await context.call('project.one', { projectId })
  const environments = await context.call('environment.byProjectId', { projectId })
  const environmentItems = getArray(environments)

  const overviewEnvironments = []

  for (const environment of environmentItems) {
    if (!isRecord(environment)) {
      continue
    }

    const environmentId = getStringOrNull(environment.environmentId)
    if (!environmentId) {
      continue
    }

    const envDetail = await context.call('environment.one', { environmentId })
    const appRefs = isRecord(envDetail) ? getArray(envDetail.applications) : []
    const overviewApplications = []

    for (const appRef of appRefs) {
      const applicationId = isRecord(appRef) ? getStringOrNull(appRef.applicationId) : null
      if (!applicationId) {
        continue
      }

      const detail = await context.call('application.one', {
        applicationId,
        select: [
          'applicationId',
          'name',
          'appName',
          'applicationStatus',
          'domains',
          'mounts',
          'watchPaths',
          'deployments',
        ],
        deploymentLimit: 1,
      })
      overviewApplications.push(buildProjectOverviewApplication(detail))
    }

    overviewEnvironments.push({
      environmentId,
      name: getStringOrNull(environment.name),
      applications: overviewApplications,
    })
  }

  return {
    projectId,
    name: isRecord(project) ? getStringOrNull(project.name) : null,
    environments: overviewEnvironments,
  }
}

function createProjectInfrastructureOverviewInputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        minLength: 1,
      },
      includeServerSecurity: {
        type: 'boolean',
      },
    },
    required: ['projectId'],
    additionalProperties: false,
  }
}

function createProjectLogsOverviewInputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        minLength: 1,
      },
      environmentIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      tail: {
        type: 'integer',
      },
      search: {
        type: 'string',
      },
      includeDatabases: {
        type: 'boolean',
      },
      maxApplications: {
        type: 'integer',
      },
      maxDatabases: {
        type: 'integer',
      },
    },
    required: ['projectId'],
    additionalProperties: false,
  }
}

function createProjectLogsOverviewOutputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      projectName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['kind', 'resourceId', 'name', 'environmentId', 'environmentName'],
          properties: {
            kind: { type: 'string' },
            resourceId: { type: 'string' },
            name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            environmentId: { type: 'string' },
            environmentName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      total: { type: 'integer' },
    },
    required: ['projectId', 'projectName', 'sources', 'items', 'total'],
    additionalProperties: false,
  }
}

function createProjectInfrastructureOverviewOutputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
      },
      name: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      description: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      },
      environments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      servers: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      totals: {
        type: 'object',
        additionalProperties: false,
        required: ['environments', 'applications', 'compose', 'databases', 'servers'],
        properties: {
          environments: { type: 'integer' },
          applications: { type: 'integer' },
          compose: { type: 'integer' },
          databases: { type: 'integer' },
          servers: { type: 'integer' },
        },
      },
    },
    required: ['projectId', 'name', 'description', 'environments', 'servers', 'totals'],
    additionalProperties: false,
  }
}

function validateProjectInfrastructureOverviewInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if (typeof input.projectId !== 'string' || input.projectId.trim().length === 0) {
    errors.push('projectId must be a non-empty string')
  }

  errors.push(...validateBooleanFlag(input, 'includeServerSecurity'))

  return errors
}

function validateOptionalPositiveInteger(input: Record<string, unknown>, key: string) {
  if (!(key in input)) {
    return []
  }

  const value = input[key]
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return []
  }

  return [`${key} must be a positive integer`]
}

function validateOptionalNonNegativeInteger(input: Record<string, unknown>, key: string) {
  if (!(key in input)) {
    return []
  }

  const value = input[key]
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return []
  }

  return [`${key} must be a non-negative integer`]
}

function validateProjectLogsOverviewInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if (typeof input.projectId !== 'string' || input.projectId.trim().length === 0) {
    errors.push('projectId must be a non-empty string')
  }

  if ('search' in input && input.search !== undefined && typeof input.search !== 'string') {
    errors.push('search must be a string')
  }

  if ('environmentIds' in input) {
    errors.push(
      ...validateStringList(input.environmentIds, 'environmentIds', {
        requireNonEmptyArray: true,
      }),
    )
  }

  errors.push(...validateBooleanFlag(input, 'includeDatabases'))
  errors.push(...validateOptionalNonNegativeInteger(input, 'tail'))
  errors.push(...validateOptionalPositiveInteger(input, 'maxApplications'))
  errors.push(...validateOptionalPositiveInteger(input, 'maxDatabases'))

  return errors
}

function buildStatusSummary(items: unknown[], statusKey: string) {
  const statusCounts: Record<string, number> = {}

  for (const item of items) {
    const status = isRecord(item) ? getStringOrNull(item[statusKey]) : null
    const normalizedStatus = status ?? 'unknown'
    statusCounts[normalizedStatus] = (statusCounts[normalizedStatus] ?? 0) + 1
  }

  return {
    total: items.length,
    statusCounts,
  }
}

const databaseResourceKeys = ['mariadb', 'mongo', 'mysql', 'postgres', 'redis'] as const

function buildDatabaseSummary(environment: Record<string, unknown>) {
  const counts = {
    mariadb: getArray(environment.mariadb).length,
    mongo: getArray(environment.mongo).length,
    mysql: getArray(environment.mysql).length,
    postgres: getArray(environment.postgres).length,
    redis: getArray(environment.redis).length,
  }

  return {
    ...counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  }
}

function collectEnvironmentServerIds(environment: Record<string, unknown>) {
  const resourceKeys = ['applications', 'compose', ...databaseResourceKeys]
  const serverIds = new Set<string>()

  for (const resourceKey of resourceKeys) {
    for (const resource of getArray(environment[resourceKey])) {
      const serverId = getServerId(resource)
      if (serverId) {
        serverIds.add(serverId)
      }
    }
  }

  return [...serverIds]
}

function buildProjectInfrastructureEnvironment(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  const environmentId = getStringOrNull(value.environmentId)
  if (!environmentId) {
    return null
  }

  const applications = getArray(value.applications)
  const compose = getArray(value.compose)

  return {
    environmentId,
    name: getStringOrNull(value.name),
    description: getStringOrNull(value.description),
    isDefault: value.isDefault === true,
    serverIds: collectEnvironmentServerIds(value),
    applications: buildStatusSummary(applications, 'applicationStatus'),
    compose: buildStatusSummary(compose, 'composeStatus'),
    databases: buildDatabaseSummary(value),
  }
}

function buildSecuritySummary(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  const ufw = isRecord(value.ufw) ? value.ufw : {}
  const ssh = isRecord(value.ssh) ? value.ssh : {}
  const fail2ban = isRecord(value.fail2ban) ? value.fail2ban : {}

  return {
    ufw: {
      installed: getBooleanOrNull(ufw.installed),
      active: getBooleanOrNull(ufw.active),
      defaultIncoming: getStringOrNull(ufw.defaultIncoming),
    },
    ssh: {
      enabled: getBooleanOrNull(ssh.enabled),
      keyAuth: getBooleanOrNull(ssh.keyAuth),
      passwordAuth: getBooleanOrNull(ssh.passwordAuth),
      permitRootLogin: getStringOrNull(ssh.permitRootLogin),
      usePam: getBooleanOrNull(ssh.usePam),
    },
    fail2ban: {
      installed: getBooleanOrNull(fail2ban.installed),
      enabled: getBooleanOrNull(fail2ban.enabled),
      active: getBooleanOrNull(fail2ban.active),
      sshEnabled: getBooleanOrNull(fail2ban.sshEnabled),
      sshMode: getStringOrNull(fail2ban.sshMode),
    },
  }
}

function buildInfrastructureServer(value: unknown, includeSecurity: boolean) {
  if (!isRecord(value)) {
    return {
      serverId: null,
      name: null,
      serverStatus: null,
      serverType: null,
      ipAddress: null,
      lastDeployment: null,
      security: null,
    }
  }

  const deployments = getArray(value.deployments)

  return {
    serverId: getStringOrNull(value.serverId),
    name: getStringOrNull(value.name),
    serverStatus: getStringOrNull(value.serverStatus),
    serverType: getStringOrNull(value.serverType),
    ipAddress: getStringOrNull(value.ipAddress),
    lastDeployment: deployments[0] ?? null,
    security: includeSecurity ? buildSecuritySummary(value.security) : null,
  }
}

function buildProjectInfrastructureTotals(
  environments: {
    applications: { total: number }
    compose: { total: number }
    databases: { total: number }
  }[],
  servers: unknown[],
) {
  return {
    environments: environments.length,
    applications: environments.reduce(
      (sum, environment) => sum + environment.applications.total,
      0,
    ),
    compose: environments.reduce((sum, environment) => sum + environment.compose.total, 0),
    databases: environments.reduce((sum, environment) => sum + environment.databases.total, 0),
    servers: servers.length,
  }
}

async function executeProjectInfrastructureOverview(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const projectId = String(input.projectId)
  const includeServerSecurity = input.includeServerSecurity === true
  const project = await context.call('project.one', { projectId })
  const environmentItems = isRecord(project) ? getArray(project.environments) : []
  const resolvedEnvironments =
    environmentItems.length > 0
      ? environmentItems
      : getArray(await context.call('environment.byProjectId', { projectId }))

  const environments = []
  const uniqueServerIds = new Set<string>()

  for (const environment of resolvedEnvironments) {
    const nextEnvironment = buildProjectInfrastructureEnvironment(environment)
    if (!nextEnvironment) {
      continue
    }

    for (const serverId of nextEnvironment.serverIds) {
      uniqueServerIds.add(serverId)
    }

    environments.push(nextEnvironment)
  }

  const serverIds = [...uniqueServerIds]
  const serverResult =
    serverIds.length > 0
      ? await context.call('server.many', {
          serverIds,
          includeSecurity: includeServerSecurity,
        })
      : { items: [] }
  const serverItems = isRecord(serverResult) ? getArray(serverResult.items) : []
  const servers = serverItems.map((server) =>
    buildInfrastructureServer(server, includeServerSecurity),
  )

  return {
    projectId,
    name: isRecord(project) ? getStringOrNull(project.name) : null,
    description: isRecord(project) ? getStringOrNull(project.description) : null,
    environments,
    servers,
    totals: buildProjectInfrastructureTotals(environments, servers),
  }
}

function getDisplayName(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  return getStringOrNull(value.name) ?? getStringOrNull(value.appName)
}

function createProjectLogSource(
  environment: Record<string, unknown>,
  resource: Record<string, unknown>,
  kind: string,
  resourceId: string,
) {
  return {
    kind,
    resourceId,
    name: getDisplayName(resource),
    environmentId: String(environment.environmentId),
    environmentName: getStringOrNull(environment.name),
  }
}

function resolveProjectLogsOptions(input: Record<string, unknown>) {
  return {
    environmentIds: Array.isArray(input.environmentIds)
      ? new Set(
          input.environmentIds
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        )
      : null,
    tail: typeof input.tail === 'number' ? input.tail : undefined,
    search: typeof input.search === 'string' ? input.search : undefined,
    includeDatabases: input.includeDatabases === true,
    maxApplications: typeof input.maxApplications === 'number' ? input.maxApplications : 5,
    maxDatabases: typeof input.maxDatabases === 'number' ? input.maxDatabases : 5,
  }
}

function isValidProjectLogsEnvironment(value: unknown): value is Record<string, unknown> {
  return Boolean(isRecord(value) && getStringOrNull(value.environmentId))
}

async function resolveProjectLogEnvironments(
  projectId: string,
  project: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const environments = getArray(project.environments)
  if (environments.length > 0) {
    return environments
  }

  return getArray(await context.call('environment.byProjectId', { projectId }))
}

function appendProjectApplicationLogRequests(
  environment: Record<string, unknown>,
  options: ReturnType<typeof resolveProjectLogsOptions>,
  state: {
    sources: Record<string, unknown>[]
    requests: Record<string, unknown>[]
    applicationCount: number
  },
) {
  for (const application of getArray(environment.applications)) {
    if (!isRecord(application) || state.applicationCount >= options.maxApplications) {
      continue
    }

    const applicationId = getStringOrNull(application.applicationId)
    if (!applicationId) {
      continue
    }

    state.sources.push(
      createProjectLogSource(environment, application, 'application', applicationId),
    )
    state.requests.push({
      kind: 'application',
      applicationId,
      tail: options.tail,
      search: options.search,
    })
    state.applicationCount += 1
  }
}

function appendProjectDatabaseLogRequests(
  environment: Record<string, unknown>,
  options: ReturnType<typeof resolveProjectLogsOptions>,
  state: {
    sources: Record<string, unknown>[]
    requests: Record<string, unknown>[]
    databaseCount: number
  },
) {
  const databaseKinds = [
    ['libsql', 'libsqlId'],
    ['mariadb', 'mariadbId'],
    ['mongo', 'mongoId'],
    ['mysql', 'mysqlId'],
    ['postgres', 'postgresId'],
    ['redis', 'redisId'],
  ] as const

  for (const [kind, idKey] of databaseKinds) {
    for (const resource of getArray(environment[kind])) {
      if (!isRecord(resource) || state.databaseCount >= options.maxDatabases) {
        continue
      }

      const resourceId = getStringOrNull(resource[idKey])
      if (!resourceId) {
        continue
      }

      state.sources.push(createProjectLogSource(environment, resource, kind, resourceId))
      state.requests.push({
        kind,
        [idKey]: resourceId,
        tail: options.tail,
        search: options.search,
      })
      state.databaseCount += 1
    }
  }
}

function buildProjectLogRequests(environments: unknown[], input: Record<string, unknown>) {
  const options = resolveProjectLogsOptions(input)
  const sources: {
    kind: string
    resourceId: string
    name: string | null
    environmentId: string
    environmentName: string | null
  }[] = []
  const requests: Record<string, unknown>[] = []

  let applicationCount = 0
  let databaseCount = 0

  for (const environment of environments) {
    if (!isValidProjectLogsEnvironment(environment)) {
      continue
    }

    if (
      options.environmentIds &&
      options.environmentIds.size > 0 &&
      !options.environmentIds.has(String(environment.environmentId))
    ) {
      continue
    }

    appendProjectApplicationLogRequests(environment, options, {
      sources,
      requests,
      applicationCount,
    })
    applicationCount = requests.filter((request) => request.kind === 'application').length

    if (!options.includeDatabases) {
      continue
    }

    appendProjectDatabaseLogRequests(environment, options, {
      sources,
      requests,
      databaseCount,
    })
    databaseCount = requests.filter((request) => request.kind !== 'application').length
  }

  return { sources, requests }
}

async function executeProjectLogsOverview(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const projectId = String(input.projectId)
  const project = await context.call('project.one', { projectId })
  const projectRecord = isRecord(project) ? project : {}
  const environments = await resolveProjectLogEnvironments(projectId, projectRecord, context)
  const { sources, requests } = buildProjectLogRequests(environments, input)
  const logsResult =
    requests.length > 0
      ? await context.call('logs.tailMany', { requests })
      : { items: [], total: 0 }
  const items = isRecord(logsResult) ? getArray(logsResult.items) : []
  const total = isRecord(logsResult) && typeof logsResult.total === 'number' ? logsResult.total : 0

  return {
    projectId,
    projectName: getStringOrNull(projectRecord.name),
    sources,
    items,
    total,
  }
}

export const projectProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
  'project.overview': {
    endpoint: {
      procedure: 'project.overview',
      method: 'GET',
      path: '/virtual/project.overview',
      tag: 'project',
      summary: 'Read an opinionated overview of one project',
      description:
        'MCP-only virtual helper that aggregates project, environment, application, mounts, watch paths, domains, and the latest deployment.',
      inputKind: 'body',
      requiredInputs: ['projectId'],
      optionalInputs: ['pageSize'],
      response: {
        type: 'object',
        keys: ['projectId', 'name', 'environments'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/project.overview',
      tag: 'project',
      inputKind: 'body',
      inputSchema: createProjectOverviewInputSchema(),
      outputSchema: createProjectOverviewOutputSchema(),
      virtual: true,
    },
    validateInput: validateProjectOverviewInput,
    execute: executeProjectOverview,
  },
  'project.logsOverview': {
    endpoint: {
      procedure: 'project.logsOverview',
      method: 'GET',
      path: '/virtual/project.logsOverview',
      tag: 'project',
      summary: 'Read a bounded logs overview for one project',
      description:
        'MCP-only virtual helper that discovers project applications and optional databases, then batches their log reads through logs.tailMany.',
      inputKind: 'body',
      requiredInputs: ['projectId'],
      optionalInputs: [
        'environmentIds',
        'tail',
        'search',
        'includeDatabases',
        'maxApplications',
        'maxDatabases',
      ],
      response: {
        type: 'object',
        keys: ['projectId', 'projectName', 'sources', 'items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/project.logsOverview',
      tag: 'project',
      inputKind: 'body',
      inputSchema: createProjectLogsOverviewInputSchema(),
      outputSchema: createProjectLogsOverviewOutputSchema(),
      virtual: true,
    },
    validateInput: validateProjectLogsOverviewInput,
    execute: executeProjectLogsOverview,
  },
  'project.infrastructureOverview': {
    endpoint: {
      procedure: 'project.infrastructureOverview',
      method: 'GET',
      path: '/virtual/project.infrastructureOverview',
      tag: 'project',
      summary: 'Read a compact infrastructure overview for one project',
      description:
        'MCP-only virtual helper that aggregates per-environment application and compose statusCounts, database totals, referenced serverIds, and optional server security snapshots.',
      inputKind: 'body',
      requiredInputs: ['projectId'],
      optionalInputs: ['includeServerSecurity'],
      response: {
        type: 'object',
        keys: ['projectId', 'name', 'description', 'environments', 'servers', 'totals'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/project.infrastructureOverview',
      tag: 'project',
      inputKind: 'body',
      inputSchema: createProjectInfrastructureOverviewInputSchema(),
      outputSchema: createProjectInfrastructureOverviewOutputSchema(),
      virtual: true,
    },
    validateInput: validateProjectInfrastructureOverviewInput,
    execute: executeProjectInfrastructureOverview,
  },
}
