const logRequestIdFields: Record<string, string[]> = {
  application: ['applicationId'],
  compose: ['composeId', 'containerId'],
  deployment: ['deploymentId'],
  libsql: ['libsqlId'],
  mariadb: ['mariadbId'],
  mongo: ['mongoId'],
  mysql: ['mysqlId'],
  postgres: ['postgresId'],
  redis: ['redisId'],
}

const logRequestKinds = new Set(Object.keys(logRequestIdFields))

export const DATABASE_KINDS = [
  {
    kind: 'mariadb',
    idField: 'mariadbId',
    supportsPasswordType: true,
    readProcedure: 'mariadb.one',
    previewProcedure: 'mariadb.changePassword',
  },
  {
    kind: 'mongo',
    idField: 'mongoId',
    supportsPasswordType: false,
    readProcedure: 'mongo.one',
    previewProcedure: 'mongo.changePassword',
  },
  {
    kind: 'mysql',
    idField: 'mysqlId',
    supportsPasswordType: true,
    readProcedure: 'mysql.one',
    previewProcedure: 'mysql.changePassword',
  },
  {
    kind: 'postgres',
    idField: 'postgresId',
    supportsPasswordType: false,
    readProcedure: 'postgres.one',
    previewProcedure: 'postgres.changePassword',
  },
  {
    kind: 'redis',
    idField: 'redisId',
    supportsPasswordType: false,
    readProcedure: 'redis.one',
    previewProcedure: 'redis.changePassword',
  },
] as const

export type DatabaseKind = (typeof DATABASE_KINDS)[number]['kind']

export function createManyOutputSchema() {
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

export function validateStringList(
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

export function validateBooleanFlag(input: Record<string, unknown>, key: string) {
  if (!(key in input)) {
    return []
  }

  return typeof input[key] === 'boolean' ? [] : [`${key} must be a boolean`]
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getStringOrNull(value: unknown) {
  return typeof value === 'string' ? value : null
}

export function getArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

export function getBooleanOrNull(value: unknown) {
  return typeof value === 'boolean' ? value : null
}

export function getServerId(value: unknown) {
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

export function getTagId(value: unknown) {
  return isRecord(value) ? getStringOrNull(value.tagId) : null
}

export function getProjectTagIds(value: unknown) {
  if (!isRecord(value)) {
    return []
  }

  const tags = getArray(value.tags)
  const tagIds: string[] = []

  for (const tag of tags) {
    const tagId = getTagId(tag)
    if (tagId) {
      tagIds.push(tagId)
    }
  }

  return tagIds
}

export function validateLogRequestKind(request: Record<string, unknown>, index: number) {
  const kind = getStringOrNull(request.kind)
  if (kind && logRequestKinds.has(kind)) {
    return kind
  }

  return [`requests[${index}].kind must be one of ${[...logRequestKinds].join(', ')}`]
}

export function validateLogRequestRequiredIds(
  request: Record<string, unknown>,
  index: number,
  kind: string,
) {
  const errors: string[] = []

  for (const idField of logRequestIdFields[kind] ?? []) {
    if (!getStringOrNull(request[idField])) {
      errors.push(`requests[${index}].${idField} is required`)
    }
  }

  return errors
}

export function validateLogRequestScalarFields(request: Record<string, unknown>, index: number) {
  const errors: string[] = []

  if ('tail' in request) {
    if (typeof request.tail !== 'number' || !Number.isInteger(request.tail) || request.tail < 0) {
      errors.push(`requests[${index}].tail must be a non-negative integer`)
    }
  }

  if ('since' in request && request.since !== undefined && typeof request.since !== 'string') {
    errors.push(`requests[${index}].since must be a string`)
  }

  if ('search' in request && request.search !== undefined && typeof request.search !== 'string') {
    errors.push(`requests[${index}].search must be a string`)
  }

  return errors
}

export function buildLogRequestProcedure(request: Record<string, unknown>) {
  const kind = String(request.kind)

  switch (kind) {
    case 'application':
      return {
        procedure: 'application.readLogs',
        input: {
          applicationId: String(request.applicationId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'compose':
      return {
        procedure: 'compose.readLogs',
        input: {
          composeId: String(request.composeId),
          containerId: String(request.containerId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'deployment':
      // deployment.readLogs only accepts deploymentId and tail; since/search are not forwarded.
      return {
        procedure: 'deployment.readLogs',
        input: {
          deploymentId: String(request.deploymentId),
          tail: request.tail,
        },
      }
    case 'libsql':
      return {
        procedure: 'libsql.readLogs',
        input: {
          libsqlId: String(request.libsqlId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'mariadb':
      return {
        procedure: 'mariadb.readLogs',
        input: {
          mariadbId: String(request.mariadbId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'mongo':
      return {
        procedure: 'mongo.readLogs',
        input: {
          mongoId: String(request.mongoId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'mysql':
      return {
        procedure: 'mysql.readLogs',
        input: {
          mysqlId: String(request.mysqlId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'postgres':
      return {
        procedure: 'postgres.readLogs',
        input: {
          postgresId: String(request.postgresId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    case 'redis':
      return {
        procedure: 'redis.readLogs',
        input: {
          redisId: String(request.redisId),
          tail: request.tail,
          since: request.since,
          search: request.search,
        },
      }
    default:
      throw new Error(`Unsupported log request kind: ${kind}`)
  }
}
