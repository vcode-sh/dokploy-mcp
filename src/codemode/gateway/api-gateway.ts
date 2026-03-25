import { ApiError, api } from '../../api/client.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import {
  getEffectiveProcedureSchema,
  mapProcedureInput,
  transformProcedureResponse,
  validateProcedureInput,
} from '../overrides/procedure-overrides.js'
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
