import { invokeProcedure } from '../../codemode/gateway/api-gateway.js'
import {
  executeVirtualProcedure,
  isVirtualProcedure,
  validateVirtualProcedureInput,
} from '../../codemode/overrides/virtual-procedures.js'
import { getServerId, getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'
import {
  asMcpError,
  buildDokployResourceUri,
  createJsonResourceResult,
  extractItems,
  getOptionalId,
  type ListedResource,
  notFound,
  pickDefinedFields,
  takeStringArray,
} from './shared.js'

export type ResourceExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<unknown>

type ResourceVariables = Record<string, string | string[]>

interface ResourceTemplateDefinition {
  name: string
  title: string
  description: string
  uriTemplate: string
  listResources?: (executor: ResourceExecutor) => Promise<ListedResource[]>
  readResource: (variables: ResourceVariables, executor: ResourceExecutor) => Promise<unknown>
}

function getRecordId(value: unknown, key: string) {
  return isRecord(value) ? getOptionalId(value, key) : null
}

function createListResourcesBySearch(options: {
  procedure: string
  idKey: string
  kind: 'project' | 'application' | 'server'
  view: string
  limit?: number
  name: (value: Record<string, unknown>, id: string) => string
  title?: (value: Record<string, unknown>, id: string) => string | undefined
  description?: (value: Record<string, unknown>) => string | undefined
}) {
  return async (executor: ResourceExecutor) => {
    const data = await executor(options.procedure, options.limit ? { limit: options.limit } : {})
    const items = extractItems(data)
    const resources: ListedResource[] = []

    for (const item of items) {
      const id = getRecordId(item, options.idKey)
      if (!(id && isRecord(item))) {
        continue
      }

      resources.push({
        uri: buildDokployResourceUri(options.kind, id, options.view),
        name: options.name(item, id),
        title: options.title?.(item, id),
        description: options.description?.(item),
        mimeType: 'application/json',
      })
    }

    return resources
  }
}

function buildProjectRelatedResources(projectId: string) {
  return {
    infrastructure: buildDokployResourceUri('project', projectId, 'infrastructure'),
    logsOverview: buildDokployResourceUri('project', projectId, 'logs-overview'),
    overview: buildDokployResourceUri('project', projectId, 'overview'),
  }
}

function buildApplicationSummary(value: unknown, applicationId: string) {
  const record = isRecord(value) ? value : {}
  const deployments = extractItems(record.deployments)
  const latestDeployment = deployments[0] ?? null
  const latestDeploymentId =
    isRecord(latestDeployment) && typeof latestDeployment.deploymentId === 'string'
      ? latestDeployment.deploymentId
      : null

  return {
    ...pickDefinedFields(record, [
      'applicationId',
      'name',
      'appName',
      'description',
      'applicationStatus',
      'projectId',
      'environmentId',
      'serverId',
    ]),
    applicationId,
    domains: extractItems(record.domains).slice(0, 8),
    mounts: extractItems(record.mounts).slice(0, 8),
    watchPaths: takeStringArray(record.watchPaths),
    latestDeployment,
    relatedResources: {
      ...(latestDeploymentId
        ? {
            deploymentSummary: buildDokployResourceUri('deployment', latestDeploymentId, 'summary'),
          }
        : {}),
    },
  }
}

function buildServerSummary(value: unknown, serverId: string) {
  const record = isRecord(value) ? value : {}

  return {
    ...pickDefinedFields(record, [
      'serverId',
      'name',
      'hostname',
      'ipAddress',
      'status',
      'provider',
      'region',
      'isRemote',
      'dockerVersion',
      'swarmStatus',
      'createdAt',
    ]),
    serverId,
  }
}

function buildDeploymentSummary(value: unknown, deploymentId: string) {
  const record = isRecord(value) ? value : {}
  const applicationId = getOptionalId(record, 'applicationId')
  const serverId = getServerId(record)

  return {
    ...pickDefinedFields(record, [
      'deploymentId',
      'title',
      'description',
      'status',
      'createdAt',
      'updatedAt',
      'finishedAt',
      'startedAt',
      'applicationId',
      'composeId',
      'serverId',
      'source',
      'type',
    ]),
    deploymentId,
    relatedResources: {
      ...(applicationId
        ? {
            applicationSummary: buildDokployResourceUri('application', applicationId, 'summary'),
          }
        : {}),
      ...(serverId
        ? {
            serverSummary: buildDokployResourceUri('server', serverId, 'summary'),
          }
        : {}),
    },
  }
}

async function readProjectOverview(variables: ResourceVariables, executor: ResourceExecutor) {
  const projectId = getRequiredVariable(variables, 'projectId')
  const overview = await executor('project.overview', { projectId })
  const overviewRecord = isRecord(overview) ? overview : { value: overview }

  return {
    ...overviewRecord,
    relatedResources: buildProjectRelatedResources(projectId),
  }
}

async function readProjectInfrastructure(variables: ResourceVariables, executor: ResourceExecutor) {
  const projectId = getRequiredVariable(variables, 'projectId')
  const overview = await executor('project.infrastructureOverview', {
    projectId,
    includeServerSecurity: false,
  })
  const overviewRecord = isRecord(overview) ? overview : { value: overview }

  return {
    ...overviewRecord,
    relatedResources: buildProjectRelatedResources(projectId),
  }
}

async function readProjectLogsOverview(variables: ResourceVariables, executor: ResourceExecutor) {
  const projectId = getRequiredVariable(variables, 'projectId')
  const overview = await executor('project.logsOverview', {
    projectId,
    includeDatabases: true,
    maxApplications: 5,
    maxDatabases: 5,
    tail: 20,
  })
  const overviewRecord = isRecord(overview) ? overview : { value: overview }

  return {
    ...overviewRecord,
    relatedResources: buildProjectRelatedResources(projectId),
  }
}

async function readApplicationSummary(variables: ResourceVariables, executor: ResourceExecutor) {
  const applicationId = getRequiredVariable(variables, 'applicationId')
  const detail = await executor('application.one', {
    applicationId,
    select: [
      'applicationId',
      'name',
      'appName',
      'description',
      'applicationStatus',
      'projectId',
      'environmentId',
      'serverId',
      'domains',
      'mounts',
      'watchPaths',
      'deployments',
    ],
    deploymentLimit: 1,
  })

  return buildApplicationSummary(detail, applicationId)
}

async function readServerSummary(variables: ResourceVariables, executor: ResourceExecutor) {
  const serverId = getRequiredVariable(variables, 'serverId')
  const detail = await executor('server.one', { serverId })
  return buildServerSummary(detail, serverId)
}

async function readDeploymentSummary(variables: ResourceVariables, executor: ResourceExecutor) {
  const deploymentId = getRequiredVariable(variables, 'deploymentId')
  const deployments = extractItems(await executor('deployment.allCentralized', {}))
  const deployment = deployments.find(
    (entry) => isRecord(entry) && entry.deploymentId === deploymentId,
  )

  if (!deployment) {
    notFound(`Deployment ${deploymentId} not found`)
  }

  return buildDeploymentSummary(deployment, deploymentId)
}

function getRequiredVariable(variables: ResourceVariables, key: string) {
  const value = variables[key]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (Array.isArray(value)) {
    const firstValue = value.find((entry) => entry.trim().length > 0)
    if (firstValue) {
      return firstValue
    }
  }

  notFound(`Missing resource variable: ${key}`)
}

export const codeModeResourceTemplates: readonly ResourceTemplateDefinition[] = [
  {
    name: 'project-overview',
    title: 'Project Overview',
    description: 'Compact per-environment project state with application summaries.',
    uriTemplate: 'dokploy://project/{projectId}/overview',
    listResources: createListResourcesBySearch({
      procedure: 'project.search',
      idKey: 'projectId',
      kind: 'project',
      view: 'overview',
      limit: 10,
      name: (value, id) => `Project overview: ${getOptionalId(value, 'name') ?? id}`,
      title: (value) => getStringOrNull(value.name) ?? undefined,
    }),
    readResource: readProjectOverview,
  },
  {
    name: 'project-infrastructure',
    title: 'Project Infrastructure',
    description: 'Infrastructure summary with environment, database, and server counts.',
    uriTemplate: 'dokploy://project/{projectId}/infrastructure',
    listResources: createListResourcesBySearch({
      procedure: 'project.search',
      idKey: 'projectId',
      kind: 'project',
      view: 'infrastructure',
      limit: 10,
      name: (value, id) => `Project infrastructure: ${getOptionalId(value, 'name') ?? id}`,
      title: (value) => getStringOrNull(value.name) ?? undefined,
    }),
    readResource: readProjectInfrastructure,
  },
  {
    name: 'project-logs-overview',
    title: 'Project Logs Overview',
    description: 'Bounded multi-source log summary across project environments.',
    uriTemplate: 'dokploy://project/{projectId}/logs-overview',
    listResources: createListResourcesBySearch({
      procedure: 'project.search',
      idKey: 'projectId',
      kind: 'project',
      view: 'logs-overview',
      limit: 10,
      name: (value, id) => `Project logs overview: ${getOptionalId(value, 'name') ?? id}`,
      title: (value) => getStringOrNull(value.name) ?? undefined,
    }),
    readResource: readProjectLogsOverview,
  },
  {
    name: 'application-summary',
    title: 'Application Summary',
    description: 'Compact application detail with latest deployment and related resource links.',
    uriTemplate: 'dokploy://application/{applicationId}/summary',
    listResources: createListResourcesBySearch({
      procedure: 'application.search',
      idKey: 'applicationId',
      kind: 'application',
      view: 'summary',
      limit: 25,
      name: (value, id) =>
        `Application summary: ${getOptionalId(value, 'name') ?? getOptionalId(value, 'appName') ?? id}`,
      title: (value) => getStringOrNull(value.name) ?? getStringOrNull(value.appName) ?? undefined,
      description: (value) => getStringOrNull(value.description) ?? undefined,
    }),
    readResource: readApplicationSummary,
  },
  {
    name: 'deployment-summary',
    title: 'Deployment Summary',
    description: 'Compact deployment detail resolved from centralized deployment history.',
    uriTemplate: 'dokploy://deployment/{deploymentId}/summary',
    readResource: readDeploymentSummary,
  },
  {
    name: 'server-summary',
    title: 'Server Summary',
    description: 'Compact server detail with common operational fields.',
    uriTemplate: 'dokploy://server/{serverId}/summary',
    listResources: createListResourcesBySearch({
      procedure: 'server.all',
      idKey: 'serverId',
      kind: 'server',
      view: 'summary',
      name: (value, id) => `Server summary: ${getOptionalId(value, 'name') ?? id}`,
      title: (value) => getStringOrNull(value.name) ?? undefined,
    }),
    readResource: readServerSummary,
  },
] as const

export function createResourceExecutor(baseExecutor: ResourceExecutor = createGatewayExecutor()) {
  const dispatch = async (procedure: string, input: Record<string, unknown> = {}) => {
    if (!isVirtualProcedure(procedure)) {
      return baseExecutor(procedure, input)
    }

    const validationErrors = validateVirtualProcedureInput(procedure, input)
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '))
    }

    return executeVirtualProcedure(procedure, input, {
      call: dispatch,
    })
  }

  return dispatch
}

export async function listCodeModeResources(executor = createResourceExecutor()) {
  const listedResources: ListedResource[] = []

  for (const definition of codeModeResourceTemplates) {
    if (!definition.listResources) {
      continue
    }

    try {
      listedResources.push(...(await definition.listResources(executor)))
    } catch (error) {
      asMcpError(error)
    }
  }

  return listedResources
}

export async function readCodeModeResource(
  uri: URL | string,
  variables: ResourceVariables,
  definitionName: string,
  executor = createResourceExecutor(),
) {
  const definition = codeModeResourceTemplates.find((entry) => entry.name === definitionName)
  if (!definition) {
    notFound(`Unknown Dokploy resource template: ${definitionName}`)
  }

  const resourceUri = typeof uri === 'string' ? uri : uri.toString()

  try {
    const payload = await definition.readResource(variables, executor)
    return createJsonResourceResult(resourceUri, payload)
  } catch (error) {
    asMcpError(error)
  }
}

function createGatewayExecutor(): ResourceExecutor {
  return async (procedure, input) => {
    const result = await invokeProcedure(procedure, input)
    return result.data
  }
}
