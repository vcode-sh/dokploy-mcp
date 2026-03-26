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
