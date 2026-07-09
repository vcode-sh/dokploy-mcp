import {
  buildLogRequestProcedure,
  createManyOutputSchema,
  isRecord,
  validateBooleanFlag,
  validateLogRequestKind,
  validateLogRequestRequiredIds,
  validateLogRequestScalarFields,
  validateStringList,
} from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

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

function createTailManyInputSchema() {
  return {
    type: 'object',
    properties: {
      requests: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            kind: { type: 'string' },
            applicationId: { type: 'string' },
            composeId: { type: 'string' },
            containerId: { type: 'string' },
            deploymentId: { type: 'string' },
            libsqlId: { type: 'string' },
            mariadbId: { type: 'string' },
            mongoId: { type: 'string' },
            mysqlId: { type: 'string' },
            postgresId: { type: 'string' },
            redisId: { type: 'string' },
            tail: { type: 'integer' },
            since: { type: 'string' },
            search: { type: 'string' },
          },
          required: ['kind'],
        },
      },
    },
    required: ['requests'],
    additionalProperties: false,
  }
}

function validateTailManyInput(input: Record<string, unknown>) {
  const { requests } = input

  if (!Array.isArray(requests)) {
    return ['requests must be an array of log requests']
  }

  const errors: string[] = []

  if (requests.length === 0) {
    errors.push('requests must be a non-empty array of log requests')
  }

  for (const [index, request] of requests.entries()) {
    if (!isRecord(request)) {
      errors.push(`requests[${index}] must be an object`)
      continue
    }

    const kindOrErrors = validateLogRequestKind(request, index)
    if (Array.isArray(kindOrErrors)) {
      errors.push(...kindOrErrors)
      continue
    }

    errors.push(...validateLogRequestRequiredIds(request, index, kindOrErrors))
    errors.push(...validateLogRequestScalarFields(request, index))
  }

  return errors
}

async function executeLogsTailMany(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const requests = (input.requests as Record<string, unknown>[] | undefined) ?? []
  const items = []

  for (const request of requests) {
    const { procedure, input: procedureInput } = buildLogRequestProcedure(request)
    try {
      const result = await context.call(procedure, procedureInput)
      items.push({
        ...request,
        procedure,
        result,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      items.push({
        ...request,
        procedure,
        error: {
          message,
        },
      })
    }
  }

  return {
    items,
    total: items.length,
  }
}

function createLibsqlManyInputSchema() {
  return {
    type: 'object',
    properties: {
      libsqlIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['libsqlIds'],
    additionalProperties: false,
  }
}

function validateLibsqlManyInput(input: Record<string, unknown>) {
  return validateStringList(input.libsqlIds, 'libsqlIds')
}

async function executeLibsqlMany(input: Record<string, unknown>, context: VirtualProcedureContext) {
  const libsqlIds = (input.libsqlIds as string[] | undefined)?.map((value) => value.trim()) ?? []
  const items = []

  for (const libsqlId of libsqlIds) {
    const item = await context.call('libsql.one', { libsqlId })
    items.push(item)
  }

  return {
    items,
    total: items.length,
  }
}

export const batchProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
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
      outputSchema: createManyOutputSchema(),
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
      outputSchema: createManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateServerManyInput,
    execute: executeServerMany,
  },
  'logs.tailMany': {
    endpoint: {
      procedure: 'logs.tailMany',
      method: 'GET',
      path: '/virtual/logs.tailMany',
      tag: 'logs',
      summary: 'Read and normalize multiple log tails in one execute workflow',
      description:
        'MCP-only virtual helper that batches supported *.readLogs procedures while preserving input order and execute call budgeting.',
      inputKind: 'body',
      requiredInputs: ['requests'],
      optionalInputs: [],
      response: {
        type: 'object',
        keys: ['items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/logs.tailMany',
      tag: 'logs',
      inputKind: 'body',
      inputSchema: createTailManyInputSchema(),
      outputSchema: createManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateTailManyInput,
    execute: executeLogsTailMany,
  },
  'libsql.many': {
    endpoint: {
      procedure: 'libsql.many',
      method: 'GET',
      path: '/virtual/libsql.many',
      tag: 'libsql',
      summary: 'Read multiple LibSQL services in one execute workflow',
      description:
        'MCP-only virtual helper that fans out to libsql.one while preserving input order and honest execute call budgeting.',
      inputKind: 'body',
      requiredInputs: ['libsqlIds'],
      optionalInputs: [],
      response: {
        type: 'object',
        keys: ['items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/libsql.many',
      tag: 'libsql',
      inputKind: 'body',
      inputSchema: createLibsqlManyInputSchema(),
      outputSchema: createManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateLibsqlManyInput,
    execute: executeLibsqlMany,
  },
}
