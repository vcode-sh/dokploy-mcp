import type { procedureSchemas } from '../../generated/dokploy-schemas.js'

export type ProcedureName = keyof typeof procedureSchemas
export type GeneratedProcedureSchema = (typeof procedureSchemas)[ProcedureName]

export interface ProcedureOverride {
  inputSchema?: unknown
  mapInput?: (input: Record<string, unknown>) => Record<string, unknown>
  validateInput?: (input: Record<string, unknown>) => string[]
  transformResponse?: (data: unknown, input: Record<string, unknown>) => unknown
}
