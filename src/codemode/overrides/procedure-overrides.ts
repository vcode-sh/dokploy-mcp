import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'

type ProcedureName = keyof typeof procedureSchemas
type GeneratedProcedureSchema = (typeof procedureSchemas)[ProcedureName]

interface ProcedureOverride {
  inputSchema?: unknown
  mapInput?: (input: Record<string, unknown>) => Record<string, unknown>
  validateInput?: (input: Record<string, unknown>) => string[]
  transformResponse?: (data: unknown, input: Record<string, unknown>) => unknown
}

const applicationOneMcpOnlyKeys = new Set(['select', 'includeDeployments', 'deploymentLimit'])

const applicationOneInputSchema = {
  type: 'object',
  properties: {
    applicationId: {
      type: 'string',
      minLength: 1,
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
  },
  required: ['applicationId'],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSelectedFields(select: unknown) {
  if (!Array.isArray(select)) {
    return null
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const entry of select) {
    if (typeof entry !== 'string') {
      continue
    }

    const field = entry.trim()
    if (field.length === 0 || seen.has(field)) {
      continue
    }

    seen.add(field)
    normalized.push(field)
  }

  return normalized
}

function pickSelectedFields(value: Record<string, unknown>, select: unknown) {
  const normalized = normalizeSelectedFields(select)
  if (!normalized) {
    return { ...value }
  }

  return Object.fromEntries(
    normalized.filter((field) => Object.hasOwn(value, field)).map((field) => [field, value[field]]),
  )
}

function applyDeploymentControls(
  value: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (input.includeDeployments === false) {
    const { deployments: _deployments, ...rest } = value
    return rest
  }

  if (typeof input.deploymentLimit === 'number' && Array.isArray(value.deployments)) {
    return {
      ...value,
      deployments: value.deployments.slice(0, input.deploymentLimit),
    }
  }

  return value
}

function validateApplicationOneInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if ('select' in input) {
    if (!Array.isArray(input.select) || input.select.length === 0) {
      errors.push('select must be a non-empty array of field names')
    } else {
      for (const [index, field] of input.select.entries()) {
        if (typeof field !== 'string' || field.trim().length === 0) {
          errors.push(`select[${index}] must be a non-empty string`)
        }
      }
    }
  }

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

function mapApplicationOneInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !applicationOneMcpOnlyKeys.has(key)),
  )
}

function transformApplicationOneResponse(data: unknown, input: Record<string, unknown>) {
  if (!isRecord(data)) {
    return data
  }

  const selected = pickSelectedFields(data, input.select)
  return applyDeploymentControls(selected, input)
}

const procedureOverrides: Record<string, ProcedureOverride> = {
  'application.one': {
    inputSchema: applicationOneInputSchema,
    mapInput: mapApplicationOneInput,
    validateInput: validateApplicationOneInput,
    transformResponse: transformApplicationOneResponse,
  },
}

function getGeneratedProcedureSchema(procedure: string) {
  return procedureSchemas[procedure as ProcedureName] as GeneratedProcedureSchema | undefined
}

function extractObjectInputMetadata(schema: unknown) {
  if (!isRecord(schema) || schema.type !== 'object' || !isRecord(schema.properties)) {
    return {
      requiredInputs: [] as string[],
      optionalInputs: [] as string[],
    }
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string')
    : []
  const requiredSet = new Set(required)
  const optional = Object.keys(schema.properties).filter((key) => !requiredSet.has(key))

  return {
    requiredInputs: required,
    optionalInputs: optional,
  }
}

export function getEffectiveProcedureSchema(procedure: string) {
  const generated = getGeneratedProcedureSchema(procedure)
  if (!generated) {
    return null
  }

  const override = procedureOverrides[procedure]
  if (!override) {
    return generated
  }

  return {
    ...generated,
    inputSchema: override.inputSchema ?? generated.inputSchema,
  }
}

export function applyProcedureInputMetadata(endpoint: CatalogEndpoint) {
  const effectiveSchema = getEffectiveProcedureSchema(endpoint.procedure)
  if (!effectiveSchema) {
    return endpoint
  }

  const metadata = extractObjectInputMetadata(effectiveSchema.inputSchema)

  return {
    ...endpoint,
    requiredInputs: metadata.requiredInputs,
    optionalInputs: metadata.optionalInputs,
  }
}

export function mapProcedureInput(procedure: string, input: Record<string, unknown>) {
  return procedureOverrides[procedure]?.mapInput?.(input) ?? input
}

export function validateProcedureInput(procedure: string, input: Record<string, unknown>) {
  return procedureOverrides[procedure]?.validateInput?.(input) ?? []
}

export function transformProcedureResponse(
  procedure: string,
  input: Record<string, unknown>,
  data: unknown,
) {
  return procedureOverrides[procedure]?.transformResponse?.(data, input) ?? data
}
