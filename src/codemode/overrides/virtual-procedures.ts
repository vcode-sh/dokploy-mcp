import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

export interface VirtualCatalogEndpoint extends CatalogEndpoint {
  virtual: true
}

export interface VirtualProcedureSchema {
  method: 'GET' | 'POST'
  path: string
  tag: string
  inputKind: 'query' | 'body'
  inputSchema: unknown
  outputSchema: unknown
  virtual: true
}

interface VirtualProcedureContext {
  call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}

interface VirtualProcedureDefinition {
  endpoint: VirtualCatalogEndpoint
  schema: VirtualProcedureSchema
  validateInput?: (input: Record<string, unknown>) => string[]
  execute: (input: Record<string, unknown>, context: VirtualProcedureContext) => Promise<unknown>
}

function createApplicationManyInputSchema() {
  return {
    type: 'object',
    properties: {
      applicationIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      select: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      includeDeployments: {
        type: 'boolean',
      },
      deploymentLimit: {
        type: 'integer',
      },
      includeSecrets: {
        type: 'boolean',
      },
    },
    required: ['applicationIds'],
    additionalProperties: false,
  }
}

function createApplicationManyOutputSchema() {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: true,
        },
      },
      total: {
        type: 'integer',
      },
    },
    required: ['items', 'total'],
    additionalProperties: false,
  }
}

function validateStringList(
  value: unknown,
  key: string,
  options: { requireNonEmptyArray?: boolean } = {},
) {
  const errors: string[] = []

  if (!Array.isArray(value)) {
    return [`${key} must be an array of strings`]
  }

  if (options.requireNonEmptyArray && value.length === 0) {
    errors.push(`${key} must be a non-empty array of field names`)
  }

  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      errors.push(`${key}[${index}] must be a non-empty string`)
    }
  }

  return errors
}

function validateBooleanFlag(input: Record<string, unknown>, key: string) {
  if (!(key in input)) {
    return []
  }

  return typeof input[key] === 'boolean' ? [] : [`${key} must be a boolean`]
}

function validateDeploymentControls(input: Record<string, unknown>) {
  const errors: string[] = []

  if ('deploymentLimit' in input) {
    if (
      typeof input.deploymentLimit !== 'number' ||
      !Number.isInteger(input.deploymentLimit) ||
      input.deploymentLimit < 0
    ) {
      errors.push('deploymentLimit must be a non-negative integer')
    }
  }

  if (input.includeDeployments === false && input.deploymentLimit !== undefined) {
    errors.push('deploymentLimit cannot be used when includeDeployments is false')
  }

  return errors
}

function validateApplicationManyInput(input: Record<string, unknown>) {
  const errors: string[] = []

  errors.push(...validateStringList(input.applicationIds, 'applicationIds'))

  if ('select' in input) {
    errors.push(...validateStringList(input.select, 'select', { requireNonEmptyArray: true }))
  }

  errors.push(...validateDeploymentControls(input))

  return errors
}

function buildApplicationOneInput(
  applicationId: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const nextInput: Record<string, unknown> = { applicationId }

  if ('select' in input) {
    nextInput.select = input.select
  }

  if ('includeDeployments' in input) {
    nextInput.includeDeployments = input.includeDeployments
  }

  if ('deploymentLimit' in input) {
    nextInput.deploymentLimit = input.deploymentLimit
  }

  if ('includeSecrets' in input) {
    nextInput.includeSecrets = input.includeSecrets
  }

  return nextInput
}

async function executeApplicationMany(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const applicationIds =
    (input.applicationIds as string[] | undefined)?.map((applicationId) => applicationId.trim()) ??
    []
  const items = []

  for (const applicationId of applicationIds) {
    const item = await context.call(
      'application.one',
      buildApplicationOneInput(applicationId, input),
    )
    items.push(item)
  }

  return {
    items,
    total: items.length,
  }
}

function createServerManyInputSchema() {
  return {
    type: 'object',
    properties: {
      serverIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      includeSecurity: {
        type: 'boolean',
      },
    },
    required: ['serverIds'],
    additionalProperties: false,
  }
}

function createServerManyOutputSchema() {
  return createApplicationManyOutputSchema()
}

function validateServerManyInput(input: Record<string, unknown>) {
  const errors: string[] = []

  errors.push(...validateStringList(input.serverIds, 'serverIds'))
  errors.push(...validateBooleanFlag(input, 'includeSecurity'))

  return errors
}

async function executeServerMany(input: Record<string, unknown>, context: VirtualProcedureContext) {
  const serverIds =
    (input.serverIds as string[] | undefined)?.map((serverId) => serverId.trim()) ?? []
  const includeSecurity = input.includeSecurity === true
  const items = []

  for (const serverId of serverIds) {
    const detail = await context.call('server.one', { serverId })
    const nextItem: Record<string, unknown> = isRecord(detail) ? { ...detail } : { serverId }

    if (includeSecurity) {
      nextItem.security = await context.call('server.security', { serverId })
    }

    items.push(nextItem)
  }

  return {
    items,
    total: items.length,
  }
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

function getArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function getBooleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

function getServerId(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.serverId === 'string' && value.serverId.trim().length > 0) {
    return value.serverId
  }

  if (isRecord(value.server)) {
    const nestedServerId = getStringOrNull(value.server.serverId)
    if (nestedServerId) {
      return nestedServerId
    }
  }

  return null
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

    // Use environment.one to get application references (application.search
    // does not reliably filter by environmentId in all Dokploy versions)
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

const virtualProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
  'application.many': {
    endpoint: {
      procedure: 'application.many',
      method: 'GET',
      path: '/virtual/application.many',
      tag: 'application',
      summary: 'Read multiple applications in one execute workflow',
      description:
        'MCP-only virtual helper that fans out to application.one while preserving input order and execute call budgeting.',
      inputKind: 'body',
      requiredInputs: ['applicationIds'],
      optionalInputs: ['select', 'includeDeployments', 'deploymentLimit', 'includeSecrets'],
      response: {
        type: 'object',
        keys: ['items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/application.many',
      tag: 'application',
      inputKind: 'body',
      inputSchema: createApplicationManyInputSchema(),
      outputSchema: createApplicationManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateApplicationManyInput,
    execute: executeApplicationMany,
  },
  'server.many': {
    endpoint: {
      procedure: 'server.many',
      method: 'GET',
      path: '/virtual/server.many',
      tag: 'server',
      summary: 'Read multiple servers in one execute workflow',
      description:
        'MCP-only virtual helper that fans out to server.one and can optionally include server.security while preserving input order and honest execute call budgeting.',
      inputKind: 'body',
      requiredInputs: ['serverIds'],
      optionalInputs: ['includeSecurity'],
      response: {
        type: 'object',
        keys: ['items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/server.many',
      tag: 'server',
      inputKind: 'body',
      inputSchema: createServerManyInputSchema(),
      outputSchema: createServerManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateServerManyInput,
    execute: executeServerMany,
  },
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

export function getVirtualProcedureDefinition(procedure: string) {
  return virtualProcedureDefinitions[procedure] ?? null
}

export function getVirtualProcedureSchema(procedure: string) {
  return getVirtualProcedureDefinition(procedure)?.schema ?? null
}

export function getVirtualCatalogEndpoints() {
  return Object.values(virtualProcedureDefinitions).map((definition) => definition.endpoint)
}

export function isVirtualProcedure(procedure: string) {
  return procedure in virtualProcedureDefinitions
}

export function validateVirtualProcedureInput(procedure: string, input: Record<string, unknown>) {
  return getVirtualProcedureDefinition(procedure)?.validateInput?.(input) ?? []
}

export async function executeVirtualProcedure(
  procedure: string,
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const definition = getVirtualProcedureDefinition(procedure)
  if (!definition) {
    throw new Error(`Unknown virtual procedure: ${procedure}`)
  }

  return definition.execute(input, context)
}
