import { getArray, isRecord } from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

const deploymentKinds = [
  'application',
  'compose',
  'server',
  'schedule',
  'previewDeployment',
  'backup',
  'volumeBackup',
] as const

function createDeploymentLatestByTypeInputSchema() {
  return {
    type: 'object',
    properties: {
      id: { type: 'string', minLength: 1 },
      type: { enum: deploymentKinds },
    },
    required: ['id', 'type'],
    additionalProperties: false,
  }
}

function createDeploymentLatestByTypeOutputSchema() {
  return {
    type: 'object',
    properties: {
      id: { type: 'string' },
      type: { type: 'string' },
      total: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
      latestDeployment: {
        anyOf: [{ type: 'object', additionalProperties: true }, { type: 'null' }],
      },
    },
    required: ['id', 'type', 'total', 'latestDeployment'],
    additionalProperties: false,
  }
}

function validateDeploymentLatestByTypeInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if (typeof input.id !== 'string' || input.id.trim().length === 0) {
    errors.push('id must be a non-empty string')
  }

  if (
    typeof input.type !== 'string' ||
    !deploymentKinds.includes(input.type as (typeof deploymentKinds)[number])
  ) {
    errors.push(`type must be one of ${deploymentKinds.join(', ')}`)
  }

  return errors
}

async function executeDeploymentLatestByType(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const id = String(input.id)
  const type = String(input.type) as (typeof deploymentKinds)[number]
  const result = await context.call('deployment.allByType', { id, type })
  const items = isRecord(result) && Array.isArray(result.items) ? result.items : getArray(result)
  const total =
    isRecord(result) && typeof result.total === 'number'
      ? result.total
      : Array.isArray(items)
        ? items.length
        : null

  return {
    id,
    type,
    total,
    latestDeployment: items[0] ?? null,
  }
}

export const deploymentProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
  'deployment.latestByType': {
    endpoint: {
      procedure: 'deployment.latestByType',
      method: 'GET',
      path: '/virtual/deployment.latestByType',
      tag: 'deployment',
      summary: 'Read the latest deployment for one resource type',
      description:
        'MCP-only virtual helper that wraps deployment.allByType and returns the latest deployment entry plus total count.',
      inputKind: 'body',
      requiredInputs: ['id', 'type'],
      optionalInputs: [],
      response: {
        type: 'object',
        keys: ['id', 'type', 'total', 'latestDeployment'],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/deployment.latestByType',
      tag: 'deployment',
      inputKind: 'body',
      inputSchema: createDeploymentLatestByTypeInputSchema(),
      outputSchema: createDeploymentLatestByTypeOutputSchema(),
      virtual: true,
    },
    validateInput: validateDeploymentLatestByTypeInput,
    execute: executeDeploymentLatestByType,
  },
}
