import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

import { mergeCatalogResponseHints } from './builders.js'
import { composeCatalogResponseHints } from './compose-hints.js'
import { coreCatalogResponseHints } from './core-hints.js'
import { resourceCatalogResponseHints } from './resource-hints.js'
import { runtimeCatalogResponseHints } from './runtime-hints.js'
import { securityCatalogResponseHints } from './security-hints.js'
import { settingsCatalogResponseHints } from './settings-hints.js'
import type { CatalogEndpointWithHints, CatalogResponseHints } from './types.js'

const catalogResponseHints = mergeCatalogResponseHints(
  coreCatalogResponseHints,
  composeCatalogResponseHints,
  resourceCatalogResponseHints,
  securityCatalogResponseHints,
  settingsCatalogResponseHints,
  runtimeCatalogResponseHints,
)

export function getCatalogResponseHints(procedure: string): CatalogResponseHints | null {
  return catalogResponseHints[procedure] ?? null
}

export function applyCatalogResponseHints(endpoint: CatalogEndpoint): CatalogEndpointWithHints {
  const hints = getCatalogResponseHints(endpoint.procedure)
  return hints ? { ...endpoint, ...hints } : endpoint
}
