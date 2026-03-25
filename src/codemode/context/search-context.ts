import { dokployCatalog } from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'
import {
  applyCatalogResponseHints,
  getCatalogResponseHints,
} from '../overrides/catalog-overrides.js'
import {
  applyProcedureInputMetadata,
  getEffectiveProcedureSchema,
} from '../overrides/procedure-overrides.js'
import {
  getVirtualCatalogEndpoints,
  getVirtualProcedureSchema,
} from '../overrides/virtual-procedures.js'

function createCatalogEndpointView(endpoint: (typeof dokployCatalog.endpoints)[number]) {
  return applyCatalogResponseHints(applyProcedureInputMetadata(endpoint))
}

function createCatalogIndexes(endpoints: ReturnType<typeof createCatalogEndpointView>[]) {
  const byTag: Record<string, number[]> = {}
  const byProcedure: Record<string, number> = {}
  const byPath: Record<string, number> = {}

  for (const [index, endpoint] of endpoints.entries()) {
    byProcedure[endpoint.procedure] = index
    byPath[endpoint.path] = index
    const tagIndexes = byTag[endpoint.tag] ?? []
    tagIndexes.push(index)
    byTag[endpoint.tag] = tagIndexes
  }

  return {
    byTag,
    byProcedure,
    byPath,
  }
}

export function createSearchCatalogView() {
  const endpoints = [
    ...dokployCatalog.endpoints.map(createCatalogEndpointView),
    ...getVirtualCatalogEndpoints().map(applyCatalogResponseHints),
  ]
  const indexes = createCatalogIndexes(endpoints)

  return {
    endpoints,
    byTag: indexes.byTag,
    byProcedure: indexes.byProcedure,
    byPath: indexes.byPath,
    get: (id: string) => {
      const index = indexes.byProcedure[id] ?? indexes.byPath[id]
      const endpoint = index === undefined ? null : endpoints[index]
      if (!endpoint) return null

      const procedure = endpoint.procedure
      const schema =
        getVirtualProcedureSchema(procedure) ??
        getEffectiveProcedureSchema(procedure) ??
        procedureSchemas[procedure as keyof typeof procedureSchemas]

      return {
        ...endpoint,
        inputSchema: schema?.inputSchema ?? null,
        outputSchema: schema?.outputSchema ?? null,
      }
    },
    getByTag: (tag: string) =>
      (indexes.byTag[tag] ?? []).map((index) => endpoints[index]).filter(Boolean),
    searchText: (query: string) => {
      const normalized = query.trim().toLowerCase()
      if (normalized.length === 0) return []

      return endpoints.filter((endpoint) => {
        const hints = getCatalogResponseHints(endpoint.procedure)
        const haystack = [
          endpoint.procedure,
          endpoint.path,
          endpoint.tag,
          endpoint.summary ?? '',
          endpoint.description ?? '',
          ...endpoint.requiredInputs,
          ...endpoint.optionalInputs,
          ...(hints?.commonResponseFields ?? []),
          ...(hints?.responseHints ?? []),
          ...(hints?.examples ?? []),
          ...(hints?.notes ?? []),
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalized)
      })
    },
  }
}
