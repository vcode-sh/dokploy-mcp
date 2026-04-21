import type { BackendVersionInfo } from '../../api/client.js'
import { ApiError, api } from '../../api/client.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import {
  getEffectiveProcedureSchema,
  mapProcedureInput,
  transformProcedureResponse,
  validateProcedureInput,
} from '../overrides/procedure-overrides.js'
import { formatCompatibilityNotFoundMessage, formatGatewayError } from './error-format.js'
import { finishTrace, type GatewayTraceEntry, startTrace } from './trace.js'

type ProcedureName = keyof typeof procedureSchemas

interface RequestApi {
  get: typeof api.get
  post: typeof api.post
  getBackendVersionInfo?: () => Promise<BackendVersionInfo>
}

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])
const MINIMUM_BACKEND_VERSION = 'v0.29.0'

const MINIMUM_BACKEND_VERSION_BY_PROCEDURE = {
  'ai.getEnabledProviders': MINIMUM_BACKEND_VERSION,
  'gitProvider.allForPermissions': MINIMUM_BACKEND_VERSION,
  'project.homeStats': MINIMUM_BACKEND_VERSION,
  'server.allForPermissions': MINIMUM_BACKEND_VERSION,
  'settings.checkInfrastructureHealth': MINIMUM_BACKEND_VERSION,
  'settings.getDockerDiskUsage': MINIMUM_BACKEND_VERSION,
  'sshKey.allForApps': MINIMUM_BACKEND_VERSION,
  'user.getBookmarkedTemplates': MINIMUM_BACKEND_VERSION,
} as const

const MINIMUM_BACKEND_VERSION_BY_PREFIX = {
  'libsql.': MINIMUM_BACKEND_VERSION,
  'tag.': MINIMUM_BACKEND_VERSION,
} as const

function resolveGatewayRetryCount() {
  const parsed = Number.parseInt(process.env.DOKPLOY_MCP_GATEWAY_RETRIES ?? '2', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2
}

function shouldRetryGatewayError(
  error: unknown,
  method: 'GET' | 'POST',
  attempt: number,
  maxRetries: number,
) {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (method !== 'GET') {
    return false
  }

  if (attempt >= maxRetries) {
    return false
  }

  return RETRYABLE_STATUS_CODES.has(error.status)
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveProcedureMinimumVersion(procedure: string): string | null {
  if (procedure in MINIMUM_BACKEND_VERSION_BY_PROCEDURE) {
    return MINIMUM_BACKEND_VERSION_BY_PROCEDURE[
      procedure as keyof typeof MINIMUM_BACKEND_VERSION_BY_PROCEDURE
    ]
  }

  for (const [prefix, version] of Object.entries(MINIMUM_BACKEND_VERSION_BY_PREFIX)) {
    if (procedure.startsWith(prefix)) {
      return version
    }
  }

  return null
}

function parseDokployVersion(version: string) {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }

  const numbers = match.slice(1).map((entry) => Number.parseInt(entry, 10))
  if (!numbers.every((entry) => Number.isFinite(entry))) {
    return null
  }

  const [major, minor, patch] = numbers
  if (major === undefined || minor === undefined || patch === undefined) {
    return null
  }

  return [major, minor, patch] as const
}

function compareDokployVersions(left: string, right: string) {
  const leftParts = parseDokployVersion(left)
  const rightParts = parseDokployVersion(right)
  if (!(leftParts && rightParts)) {
    return null
  }

  const versionPairs = [
    [leftParts[0], rightParts[0]],
    [leftParts[1], rightParts[1]],
    [leftParts[2], rightParts[2]],
  ] as const

  for (const [leftPart, rightPart] of versionPairs) {
    const delta = leftPart - rightPart
    if (delta !== 0) {
      return delta
    }
  }

  return 0
}

async function resolveCompatibilityAwareMessage(
  procedure: string,
  error: ApiError,
  requestApi: RequestApi,
) {
  if (error.status !== 404) {
    return error.message
  }

  const minimumVersion = resolveProcedureMinimumVersion(procedure)
  if (!minimumVersion || typeof requestApi.getBackendVersionInfo !== 'function') {
    return error.message
  }

  try {
    const backendVersionInfo = await requestApi.getBackendVersionInfo()
    if (backendVersionInfo.state !== 'detected' || !backendVersionInfo.version) {
      return error.message
    }

    const versionDelta = compareDokployVersions(backendVersionInfo.version, minimumVersion)
    if (versionDelta === null || versionDelta >= 0) {
      return error.message
    }

    return formatCompatibilityNotFoundMessage({
      procedure,
      backendVersion: backendVersionInfo.version,
      minimumVersion,
    })
  } catch {
    return error.message
  }
}

function validateAgainstSchema(value: unknown, schema: unknown, path = ''): string[] {
  if (!schema || typeof schema !== 'object') {
    return []
  }

  const schemaObject = schema as Record<string, unknown>

  if (schemaObject.anyOf && Array.isArray(schemaObject.anyOf)) {
    const variants = schemaObject.anyOf as unknown[]
    const variantErrors = variants.map((variant) => validateAgainstSchema(value, variant, path))
    if (variantErrors.some((errors) => errors.length === 0)) {
      return []
    }
    return variantErrors[0] ?? []
  }

  if (schemaObject.enum && Array.isArray(schemaObject.enum)) {
    if (!schemaObject.enum.includes(value)) {
      return [`${path || 'value'} must be one of ${schemaObject.enum.join(', ')}`]
    }
    return []
  }

  return validateTypedSchema(value, schemaObject, path)
}

function validateTypedSchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  switch (schemaObject.type) {
    case 'object':
      return validateObjectSchema(value, schemaObject, path)
    case 'array':
      return validateArraySchema(value, schemaObject, path)
    case 'string':
      return validateStringSchema(value, schemaObject, path)
    case 'number':
      return validateNumberSchema(value, schemaObject, path)
    case 'integer':
      return validateIntegerSchema(value, schemaObject, path)
    case 'boolean':
      return validatePrimitive(value, 'boolean', path)
    case 'null':
      return value === null ? [] : [`${path || 'value'} must be null`]
    default:
      return []
  }
}

function validateObjectSchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [`${path || 'value'} must be an object`]
  }

  const objectValue = value as Record<string, unknown>
  const properties = (schemaObject.properties as Record<string, unknown>) ?? {}
  const required = (schemaObject.required as string[] | undefined) ?? []
  const additionalProperties = schemaObject.additionalProperties
  return [
    ...validateRequiredObjectKeys(objectValue, required, path),
    ...validateUnexpectedObjectKeys(objectValue, properties, additionalProperties, path),
    ...validateObjectProperties(objectValue, properties, path),
  ]
}

function validateRequiredObjectKeys(
  objectValue: Record<string, unknown>,
  required: string[],
  path: string,
) {
  const errors = []

  for (const key of required) {
    if (!(key in objectValue) || objectValue[key] == null) {
      errors.push(`${path ? `${path}.` : ''}${key} is required`)
    }
  }

  return errors
}

function validateUnexpectedObjectKeys(
  objectValue: Record<string, unknown>,
  properties: Record<string, unknown>,
  additionalProperties: unknown,
  path: string,
) {
  if (additionalProperties !== false) {
    return []
  }

  const errors = []

  for (const key of Object.keys(objectValue)) {
    if (!(key in properties)) {
      errors.push(`${path ? `${path}.` : ''}${key} is not allowed`)
    }
  }

  return errors
}

function validateObjectProperties(
  objectValue: Record<string, unknown>,
  properties: Record<string, unknown>,
  path: string,
) {
  const errors = []

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (key in objectValue) {
      errors.push(
        ...validateAgainstSchema(objectValue[key], propertySchema, path ? `${path}.${key}` : key),
      )
    }
  }

  return errors
}

function validateArraySchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  if (!Array.isArray(value)) {
    return [`${path || 'value'} must be an array`]
  }

  const itemSchema = schemaObject.items
  const errors = []
  const minItems =
    typeof schemaObject.minItems === 'number' ? (schemaObject.minItems as number) : undefined
  const maxItems =
    typeof schemaObject.maxItems === 'number' ? (schemaObject.maxItems as number) : undefined

  if (minItems !== undefined && value.length < minItems) {
    errors.push(`${path || 'value'} must contain at least ${minItems} items`)
  }

  if (maxItems !== undefined && value.length > maxItems) {
    errors.push(`${path || 'value'} must contain at most ${maxItems} items`)
  }

  for (const [index, entry] of value.entries()) {
    errors.push(...validateAgainstSchema(entry, itemSchema, `${path || 'value'}[${index}]`))
  }
  return errors
}

function validatePrimitive(
  value: unknown,
  type: 'string' | 'number' | 'boolean',
  path: string,
): string[] {
  return typeof value === type ? [] : [`${path || 'value'} must be a ${type}`]
}

function validateStringSchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  const primitiveErrors = validatePrimitive(value, 'string', path)
  if (primitiveErrors.length > 0) {
    return primitiveErrors
  }

  const stringValue = value as string
  const errors = []
  const minLength =
    typeof schemaObject.minLength === 'number' ? (schemaObject.minLength as number) : undefined
  const maxLength =
    typeof schemaObject.maxLength === 'number' ? (schemaObject.maxLength as number) : undefined
  const pattern = typeof schemaObject.pattern === 'string' ? schemaObject.pattern : undefined

  if (minLength !== undefined && stringValue.length < minLength) {
    errors.push(`${path || 'value'} must have length >= ${minLength}`)
  }

  if (maxLength !== undefined && stringValue.length > maxLength) {
    errors.push(`${path || 'value'} must have length <= ${maxLength}`)
  }

  if (pattern && !new RegExp(pattern).test(stringValue)) {
    errors.push(`${path || 'value'} must match pattern ${pattern}`)
  }

  return errors
}

function validateNumberSchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  const primitiveErrors = validatePrimitive(value, 'number', path)
  if (primitiveErrors.length > 0) {
    return primitiveErrors
  }

  return validateNumericBounds(value as number, schemaObject, path)
}

function validateIntegerSchema(
  value: unknown,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  const primitiveErrors = validatePrimitive(value, 'number', path)
  if (primitiveErrors.length > 0) {
    return primitiveErrors
  }

  const numberValue = value as number
  const errors = []

  if (!Number.isInteger(numberValue)) {
    errors.push(`${path || 'value'} must be an integer`)
  }

  errors.push(...validateNumericBounds(numberValue, schemaObject, path))
  return errors
}

function validateNumericBounds(
  value: number,
  schemaObject: Record<string, unknown>,
  path: string,
): string[] {
  const errors = []
  const minimum =
    typeof schemaObject.minimum === 'number' ? (schemaObject.minimum as number) : undefined
  const maximum =
    typeof schemaObject.maximum === 'number' ? (schemaObject.maximum as number) : undefined

  if (minimum !== undefined && value < minimum) {
    errors.push(`${path || 'value'} must be >= ${minimum}`)
  }

  if (maximum !== undefined && value > maximum) {
    errors.push(`${path || 'value'} must be <= ${maximum}`)
  }

  return errors
}

function getOptionalString(value: unknown, key: string) {
  if (!(value && typeof value === 'object' && !Array.isArray(value))) {
    return null
  }

  const candidate = (value as Record<string, unknown>)[key]
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null
}

function hasAnyConfiguredFields(value: unknown, keys: string[]) {
  return keys.some((key) => getOptionalString(value, key))
}

async function preflightComposeDeploy(
  procedure: string,
  input: Record<string, unknown>,
  requestApi: RequestApi,
) {
  if (procedure !== 'compose.deploy') {
    return
  }

  const composeId = typeof input.composeId === 'string' ? input.composeId.trim() : ''
  if (composeId.length === 0) {
    return
  }

  const compose = await requestApi.get('/compose.one', { composeId })
  const sourceType = getOptionalString(compose, 'sourceType')
  const composeFile = getOptionalString(compose, 'composeFile')
  const composePath = getOptionalString(compose, 'composePath')
  const githubId = getOptionalString(compose, 'githubId')
  const owner = getOptionalString(compose, 'owner')
  const repository = getOptionalString(compose, 'repository')

  const hasGithubConfig = Boolean(githubId && owner && repository)
  const hasGitlabConfig =
    hasAnyConfiguredFields(compose, ['gitlabId', 'gitlabProjectId']) ||
    hasAnyConfiguredFields(compose, ['gitlabOwner', 'gitlabRepository'])
  const hasBitbucketConfig =
    hasAnyConfiguredFields(compose, ['bitbucketId']) ||
    hasAnyConfiguredFields(compose, ['bitbucketOwner', 'bitbucketRepository'])
  const hasGiteaConfig =
    hasAnyConfiguredFields(compose, ['giteaId']) ||
    hasAnyConfiguredFields(compose, ['giteaOwner', 'giteaRepository'])
  const hasCustomGitConfig = hasAnyConfiguredFields(compose, ['customGitUrl'])
  const hasGitBackedConfig =
    hasGithubConfig || hasGitlabConfig || hasBitbucketConfig || hasGiteaConfig || hasCustomGitConfig

  if (sourceType === 'raw') {
    if (!composeFile) {
      throw formatGatewayError({
        type: 'validation_error',
        procedure,
        message:
          'compose.deploy requires composeFile when sourceType is "raw". Set composeFile before deploy.',
      })
    }
    return
  }

  if (sourceType === 'github' && !hasGithubConfig) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message:
        'compose.deploy cannot continue because sourceType is "github" but the compose record is missing required GitHub details. Configure githubId, owner, repository, and composePath before deploy.',
    })
  }

  if (composeFile && !hasGitBackedConfig) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message:
        'This compose record has inline composeFile content but no Git-backed source configuration. If you want inline Compose, set sourceType to "raw" with compose.update before compose.deploy. If you want GitHub or another Git-backed flow, configure the provider details and composePath first.',
    })
  }

  if (sourceType === 'git' && !hasCustomGitConfig) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message:
        'compose.deploy cannot continue because sourceType is "git" but customGitUrl is missing. Provide the Git URL and composePath before deploy.',
    })
  }

  if (sourceType && sourceType !== 'raw' && !composePath) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message:
        'compose.deploy cannot continue because the Git-backed compose record is missing composePath. Point composePath at the Compose file inside the repository before deploy.',
    })
  }
}

export interface GatewayCallResult {
  data: unknown
  trace: GatewayTraceEntry
}

export async function invokeProcedureWithApi(
  procedure: ProcedureName | string,
  input: Record<string, unknown> = {},
  requestApi: RequestApi = api,
): Promise<GatewayCallResult> {
  const schema =
    getEffectiveProcedureSchema(procedure) ?? procedureSchemas[procedure as ProcedureName]
  if (!schema) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message: `Unknown Dokploy procedure: ${procedure}`,
    })
  }

  const validationErrors = validateAgainstSchema(input, schema.inputSchema)
  validationErrors.push(...validateProcedureInput(procedure, input))
  if (validationErrors.length > 0) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message: validationErrors.join('; '),
    })
  }

  const trace = startTrace(procedure, schema.method)
  const maxRetries = resolveGatewayRetryCount()
  const requestInput = mapProcedureInput(procedure, input)

  try {
    await preflightComposeDeploy(procedure, requestInput, requestApi)

    let attempt = 0
    while (true) {
      try {
        const response =
          schema.method === 'GET'
            ? await requestApi.get(schema.path, requestInput)
            : await requestApi.post(schema.path, requestInput)
        const data = transformProcedureResponse(procedure, input, response)

        return {
          data,
          trace: finishTrace(trace),
        }
      } catch (error) {
        if (!shouldRetryGatewayError(error, schema.method, attempt, maxRetries)) {
          throw error
        }

        attempt += 1
        await delay(50 * attempt)
      }
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw formatGatewayError({
        type: 'dokploy_error',
        procedure,
        status: error.status,
        message: await resolveCompatibilityAwareMessage(procedure, error, requestApi),
      })
    }

    if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
      throw error
    }

    throw formatGatewayError({
      type: 'sandbox_error',
      procedure,
      message: error instanceof Error ? error.message : 'Unknown gateway error',
    })
  }
}

export async function invokeProcedure(
  procedure: ProcedureName | string,
  input: Record<string, unknown> = {},
): Promise<GatewayCallResult> {
  return invokeProcedureWithApi(procedure, input, api)
}
