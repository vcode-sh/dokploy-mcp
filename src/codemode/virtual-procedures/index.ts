import { batchProcedureDefinitions } from './batch.js'
import { databaseProcedureDefinitions } from './database.js'
import { deploymentProcedureDefinitions } from './deployment.js'
import { projectProcedureDefinitions } from './project.js'
import { tagProcedureDefinitions } from './tag.js'

const virtualProcedureDefinitions = {
  ...batchProcedureDefinitions,
  ...databaseProcedureDefinitions,
  ...deploymentProcedureDefinitions,
  ...projectProcedureDefinitions,
  ...tagProcedureDefinitions,
}

export type {
  VirtualCatalogEndpoint,
  VirtualProcedureContext,
  VirtualProcedureDefinition,
  VirtualProcedureSchema,
} from './types.js'

export function getVirtualProcedureDefinition(procedure: string) {
  return virtualProcedureDefinitions[procedure] ?? null
}

export function getVirtualProcedureSchema(procedure: string) {
  return getVirtualProcedureDefinition(procedure)?.schema ?? null
}

export function getVirtualCatalogEndpoints() {
  return Object.values(virtualProcedureDefinitions).map((definition) => definition.endpoint)
}

export function isVirtualProcedure(procedure: string) {
  return procedure in virtualProcedureDefinitions
}

export function validateVirtualProcedureInput(procedure: string, input: Record<string, unknown>) {
  return getVirtualProcedureDefinition(procedure)?.validateInput?.(input) ?? []
}

export async function executeVirtualProcedure(
  procedure: string,
  input: Record<string, unknown>,
  context: import('./types.js').VirtualProcedureContext,
) {
  const definition = getVirtualProcedureDefinition(procedure)
  if (!definition) {
    throw new Error(`Unknown virtual procedure: ${procedure}`)
  }

  return definition.execute(input, context)
}
