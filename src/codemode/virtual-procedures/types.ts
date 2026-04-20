import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

export interface VirtualCatalogEndpoint extends CatalogEndpoint {
  virtual: true
}

export interface VirtualProcedureSchema {
  method: 'GET' | 'POST'
  path: string
  tag: string
  inputKind: 'query' | 'body'
  inputSchema: unknown
  outputSchema: unknown
  virtual: true
}

export interface VirtualProcedureContext {
  call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
}

export interface VirtualProcedureDefinition {
  endpoint: VirtualCatalogEndpoint
  schema: VirtualProcedureSchema
  validateInput?: (input: Record<string, unknown>) => string[]
  execute: (input: Record<string, unknown>, context: VirtualProcedureContext) => Promise<unknown>
}
