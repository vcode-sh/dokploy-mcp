import { getStringOrNull, isRecord } from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

function createDatabaseRotatePasswordPreviewInputSchema() {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string' },
      mariadbId: { type: 'string' },
      mongoId: { type: 'string' },
      mysqlId: { type: 'string' },
      postgresId: { type: 'string' },
      redisId: { type: 'string' },
      type: { enum: ['user', 'root'] },
    },
    required: ['kind'],
    additionalProperties: false,
  }
}

function createDatabaseRotatePasswordPreviewOutputSchema() {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string' },
      resourceId: { type: 'string' },
      name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      appName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      environmentId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      projectId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      previewOperation: {
        type: 'object',
        additionalProperties: false,
        required: ['procedure', 'inputTemplate', 'requiredSecretField'],
        properties: {
          procedure: { type: 'string' },
          inputTemplate: {
            type: 'object',
            additionalProperties: true,
          },
          requiredSecretField: { type: 'string' },
        },
      },
    },
    required: [
      'kind',
      'resourceId',
      'name',
      'appName',
      'environmentId',
      'projectId',
      'previewOperation',
    ],
    additionalProperties: false,
  }
}

function validateDatabaseRotatePasswordPreviewInput(input: Record<string, unknown>) {
  const kind = getStringOrNull(input.kind)
  if (!kind) {
    return ['kind must be a non-empty string']
  }

  switch (kind) {
    case 'mariadb':
      if (!getStringOrNull(input.mariadbId)) {
        return ['mariadbId is required']
      }
      break
    case 'mongo':
      if (!getStringOrNull(input.mongoId)) {
        return ['mongoId is required']
      }
      break
    case 'mysql':
      if (!getStringOrNull(input.mysqlId)) {
        return ['mysqlId is required']
      }
      break
    case 'postgres':
      if (!getStringOrNull(input.postgresId)) {
        return ['postgresId is required']
      }
      break
    case 'redis':
      if (!getStringOrNull(input.redisId)) {
        return ['redisId is required']
      }
      break
    default:
      return ['kind must be one of mariadb, mongo, mysql, postgres, redis']
  }

  if (
    'type' in input &&
    input.type !== undefined &&
    input.type !== 'user' &&
    input.type !== 'root'
  ) {
    return ['type must be one of user, root']
  }

  return []
}

function resolveDatabasePreviewTarget(input: Record<string, unknown>) {
  const kind = String(input.kind)

  switch (kind) {
    case 'mariadb':
      return {
        procedure: 'mariadb.one',
        previewProcedure: 'mariadb.changePassword' as const,
        resourceId: String(input.mariadbId),
        readInput: { mariadbId: String(input.mariadbId) },
        inputTemplate: {
          mariadbId: String(input.mariadbId),
          ...(input.type ? { type: input.type } : {}),
        },
      }
    case 'mongo':
      return {
        procedure: 'mongo.one',
        previewProcedure: 'mongo.changePassword' as const,
        resourceId: String(input.mongoId),
        readInput: { mongoId: String(input.mongoId) },
        inputTemplate: { mongoId: String(input.mongoId) },
      }
    case 'mysql':
      return {
        procedure: 'mysql.one',
        previewProcedure: 'mysql.changePassword' as const,
        resourceId: String(input.mysqlId),
        readInput: { mysqlId: String(input.mysqlId) },
        inputTemplate: {
          mysqlId: String(input.mysqlId),
          ...(input.type ? { type: input.type } : {}),
        },
      }
    case 'postgres':
      return {
        procedure: 'postgres.one',
        previewProcedure: 'postgres.changePassword' as const,
        resourceId: String(input.postgresId),
        readInput: { postgresId: String(input.postgresId) },
        inputTemplate: { postgresId: String(input.postgresId) },
      }
    case 'redis':
      return {
        procedure: 'redis.one',
        previewProcedure: 'redis.changePassword' as const,
        resourceId: String(input.redisId),
        readInput: { redisId: String(input.redisId) },
        inputTemplate: { redisId: String(input.redisId) },
      }
    default:
      throw new Error(`Unsupported database preview kind: ${kind}`)
  }
}

async function executeDatabaseRotatePasswordPreview(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const target = resolveDatabasePreviewTarget(input)
  const detail = await context.call(target.procedure, target.readInput)
  const record = isRecord(detail) ? detail : {}

  return {
    kind: String(input.kind),
    resourceId: target.resourceId,
    name: getStringOrNull(record.name),
    appName: getStringOrNull(record.appName),
    environmentId: getStringOrNull(record.environmentId),
    projectId: getStringOrNull(record.projectId),
    previewOperation: {
      procedure: target.previewProcedure,
      inputTemplate: target.inputTemplate,
      requiredSecretField: 'password' as const,
    },
  }
}

export const databaseProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
  'database.rotatePasswordPreview': {
    endpoint: {
      procedure: 'database.rotatePasswordPreview',
      method: 'GET',
      path: '/virtual/database.rotatePasswordPreview',
      tag: 'database',
      summary: 'Preview a database password rotation without mutating anything',
      description:
        'MCP-only virtual helper that resolves one database resource and returns the exact changePassword operation template without including a password.',
      inputKind: 'body',
      requiredInputs: ['kind'],
      optionalInputs: ['mariadbId', 'mongoId', 'mysqlId', 'postgresId', 'redisId', 'type'],
      response: {
        type: 'object',
        keys: [
          'kind',
          'resourceId',
          'name',
          'appName',
          'environmentId',
          'projectId',
          'previewOperation',
        ],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/database.rotatePasswordPreview',
      tag: 'database',
      inputKind: 'body',
      inputSchema: createDatabaseRotatePasswordPreviewInputSchema(),
      outputSchema: createDatabaseRotatePasswordPreviewOutputSchema(),
      virtual: true,
    },
    validateInput: validateDatabaseRotatePasswordPreviewInput,
    execute: executeDatabaseRotatePasswordPreview,
  },
}
