import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import { procedureOverrides } from '../procedure-overrides/registry.js'
import { isRecord } from '../procedure-overrides/shared.js'
import type { GeneratedProcedureSchema, ProcedureName } from '../procedure-overrides/types.js'

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
