import { redactGitProviderSecrets } from './secrets.js'
import { isRecord } from './shared.js'
import type { ProcedureOverride } from './types.js'

const applicationOneMcpOnlyKeys = new Set([
  'select',
  'includeDeployments',
  'deploymentLimit',
  'includeSecrets',
])

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
    includeSecrets: {
      type: 'boolean',
    },
  },
  required: ['applicationId'],
  additionalProperties: false,
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
  const shaped = applyDeploymentControls(selected, input)
  return input.includeSecrets === true ? shaped : redactGitProviderSecrets(shaped)
}

export const applicationOneOverride: ProcedureOverride = {
  inputSchema: applicationOneInputSchema,
  mapInput: mapApplicationOneInput,
  validateInput: validateApplicationOneInput,
  transformResponse: transformApplicationOneResponse,
}
