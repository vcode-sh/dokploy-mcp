import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

export interface CatalogResponseHints {
  commonResponseFields?: string[]
  responseHints?: string[]
  examples?: string[]
  notes?: string[]
}

export type CatalogEndpointWithHints = CatalogEndpoint & CatalogResponseHints
