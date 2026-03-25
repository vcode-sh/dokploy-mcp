import { ApiError, api } from '../../api/client.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import { formatGatewayError } from './error-format.js'
import { finishTrace, type GatewayTraceEntry, startTrace } from './trace.js'

type ProcedureName = keyof typeof procedureSchemas
type RequestApi = typeof api

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])

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
      return validatePrimitive(value, 'string', path)
    case 'number':
    case 'integer':
      return validatePrimitive(value, 'number', path)
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
  const errors = []

  for (const key of required) {
    if (!(key in objectValue) || objectValue[key] == null) {
      errors.push(`${path ? `${path}.` : ''}${key} is required`)
    }
  }

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

export interface GatewayCallResult {
  data: unknown
  trace: GatewayTraceEntry
}

export async function invokeProcedureWithApi(
  procedure: ProcedureName | string,
  input: Record<string, unknown> = {},
  requestApi: RequestApi = api,
): Promise<GatewayCallResult> {
  const schema = procedureSchemas[procedure as ProcedureName]
  if (!schema) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message: `Unknown Dokploy procedure: ${procedure}`,
    })
  }

  const validationErrors = validateAgainstSchema(input, schema.inputSchema)
  if (validationErrors.length > 0) {
    throw formatGatewayError({
      type: 'validation_error',
      procedure,
      message: validationErrors.join('; '),
    })
  }

  const trace = startTrace(procedure, schema.method)
  const maxRetries = resolveGatewayRetryCount()

  try {
    let attempt = 0
    while (true) {
      try {
        const data =
          schema.method === 'GET'
            ? await requestApi.get(schema.path, input)
            : await requestApi.post(schema.path, input)

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
        message: error.message,
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
