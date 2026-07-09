import { DATABASE_KINDS, getStringOrNull, isRecord, validateBooleanFlag } from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

const databaseKindList = DATABASE_KINDS.map((descriptor) => descriptor.kind).join(', ')
const passwordTypeKindList = DATABASE_KINDS.filter((descriptor) => descriptor.supportsPasswordType)
  .map((descriptor) => descriptor.kind)
  .join(' and ')

function createDatabaseIdSchemaProperties() {
  return Object.fromEntries(
    DATABASE_KINDS.map((descriptor) => [descriptor.idField, { type: 'string' }]),
  )
}

function getDatabaseDescriptor(kind: string) {
  return DATABASE_KINDS.find((descriptor) => descriptor.kind === kind)
}

function supportsPasswordType(kind: string) {
  return getDatabaseDescriptor(kind)?.supportsPasswordType === true
}

function createDatabaseManyInputSchema() {
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
            ...createDatabaseIdSchemaProperties(),
            passwordType: { enum: ['user', 'root'] },
          },
          required: ['kind'],
        },
      },
      includePasswordRotationPreview: { type: 'boolean' },
    },
    required: ['requests'],
    additionalProperties: false,
  }
}

function createDatabaseManyOutputSchema() {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: [
            'kind',
            'resourceId',
            'name',
            'appName',
            'environmentId',
            'projectId',
            'detail',
            'passwordRotationPreview',
          ],
          additionalProperties: false,
          properties: {
            kind: { type: 'string' },
            resourceId: { type: 'string' },
            name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            appName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            environmentId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            projectId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            detail: {
              type: 'object',
              additionalProperties: true,
            },
            passwordRotationPreview: {
              anyOf: [
                {
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
                { type: 'null' },
              ],
            },
          },
        },
      },
      total: { type: 'integer' },
    },
    required: ['items', 'total'],
    additionalProperties: false,
  }
}

function validateDatabaseManyRequest(request: Record<string, unknown>, index: number) {
  const kind = getStringOrNull(request.kind)
  if (!kind) {
    return [`requests[${index}].kind must be a non-empty string`]
  }

  const errors: string[] = []
  const descriptor = getDatabaseDescriptor(kind)

  if (descriptor) {
    if (!getStringOrNull(request[descriptor.idField])) {
      errors.push(`requests[${index}].${descriptor.idField} is required`)
    }
  } else {
    errors.push(`requests[${index}].kind must be one of ${databaseKindList}`)
  }

  if (
    'passwordType' in request &&
    request.passwordType !== undefined &&
    request.passwordType !== 'user' &&
    request.passwordType !== 'root'
  ) {
    errors.push(`requests[${index}].passwordType must be one of user, root`)
  }

  if (
    'passwordType' in request &&
    request.passwordType !== undefined &&
    !supportsPasswordType(kind)
  ) {
    errors.push(`requests[${index}].passwordType is only supported for ${passwordTypeKindList}`)
  }

  return errors
}

function validateDatabaseManyInput(input: Record<string, unknown>) {
  const { requests } = input

  if (!Array.isArray(requests)) {
    return ['requests must be an array of database requests']
  }

  const errors: string[] = []

  if (requests.length === 0) {
    errors.push('requests must be a non-empty array of database requests')
  }

  for (const [index, request] of requests.entries()) {
    if (!isRecord(request)) {
      errors.push(`requests[${index}] must be an object`)
      continue
    }

    errors.push(...validateDatabaseManyRequest(request, index))
  }

  errors.push(...validateBooleanFlag(input, 'includePasswordRotationPreview'))

  return errors
}

function createDatabaseRotatePasswordPreviewInputSchema() {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string' },
      ...createDatabaseIdSchemaProperties(),
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

  const descriptor = getDatabaseDescriptor(kind)
  if (!descriptor) {
    return [`kind must be one of ${databaseKindList}`]
  }

  if (!getStringOrNull(input[descriptor.idField])) {
    return [`${descriptor.idField} is required`]
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
  const descriptor = getDatabaseDescriptor(kind)

  if (!descriptor) {
    throw new Error(`Unsupported database preview kind: ${kind}`)
  }

  const resourceId = String(input[descriptor.idField])
  return {
    procedure: descriptor.readProcedure,
    previewProcedure: descriptor.previewProcedure,
    resourceId,
    readInput: { [descriptor.idField]: resourceId },
    inputTemplate: {
      [descriptor.idField]: resourceId,
      ...(descriptor.supportsPasswordType && input.type ? { type: input.type } : {}),
    },
  }
}

function toDatabasePreviewInput(request: Record<string, unknown>) {
  const kind = String(request.kind)
  const descriptor = getDatabaseDescriptor(kind)

  if (!descriptor) {
    throw new Error(`Unsupported database request kind: ${kind}`)
  }

  return {
    kind: descriptor.kind,
    [descriptor.idField]: String(request[descriptor.idField]),
    ...(descriptor.supportsPasswordType && request.passwordType
      ? { type: request.passwordType }
      : {}),
  }
}

async function executeDatabaseMany(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const requests = (input.requests as Record<string, unknown>[] | undefined) ?? []
  const includePasswordRotationPreview = input.includePasswordRotationPreview === true
  const items = []

  for (const request of requests) {
    const previewInput = toDatabasePreviewInput(request)
    const target = resolveDatabasePreviewTarget(previewInput as unknown as Record<string, unknown>)
    const detail = await context.call(target.procedure, target.readInput)
    const record = isRecord(detail) ? detail : {}

    items.push({
      kind: previewInput.kind,
      resourceId: target.resourceId,
      name: getStringOrNull(record.name),
      appName: getStringOrNull(record.appName),
      environmentId: getStringOrNull(record.environmentId),
      projectId: getStringOrNull(record.projectId),
      detail: record,
      passwordRotationPreview: includePasswordRotationPreview
        ? {
            procedure: target.previewProcedure,
            inputTemplate: target.inputTemplate,
            requiredSecretField: 'password' as const,
          }
        : null,
    })
  }

  return {
    items,
    total: items.length,
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
  'database.many': {
    endpoint: {
      procedure: 'database.many',
      method: 'GET',
      path: '/virtual/database.many',
      tag: 'database',
      summary: 'Read multiple mixed databases in one execute workflow',
      description:
        'MCP-only virtual helper that fans out to supported database.one procedures across multiple database kinds, preserves input order, and can include non-mutating password rotation previews without extra upstream calls.',
      inputKind: 'body',
      requiredInputs: ['requests'],
      optionalInputs: ['includePasswordRotationPreview'],
      response: {
        type: 'object',
        keys: ['items', 'total'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/database.many',
      tag: 'database',
      inputKind: 'body',
      inputSchema: createDatabaseManyInputSchema(),
      outputSchema: createDatabaseManyOutputSchema(),
      virtual: true,
    },
    validateInput: validateDatabaseManyInput,
    execute: executeDatabaseMany,
  },
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
      optionalInputs: [...DATABASE_KINDS.map((descriptor) => descriptor.idField), 'type'],
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
