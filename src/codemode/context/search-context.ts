import {
  dokployCatalog,
  getCatalogEndpoint,
  getCatalogEndpointsByTag,
} from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'

export function createSearchCatalogView() {
  return {
    endpoints: dokployCatalog.endpoints,
    byTag: dokployCatalog.byTag,
    byProcedure: dokployCatalog.byProcedure,
    byPath: dokployCatalog.byPath,
    get: (id: string) => {
      const endpoint = getCatalogEndpoint(id)
      if (!endpoint) return null

      const procedure = endpoint.procedure
      const schema = procedureSchemas[procedure as keyof typeof procedureSchemas]

      return {
        ...endpoint,
        inputSchema: schema?.inputSchema ?? null,
        outputSchema: schema?.outputSchema ?? null,
      }
    },
    getByTag: (tag: string) => getCatalogEndpointsByTag(tag),
    searchText: (query: string) => {
      const normalized = query.trim().toLowerCase()
      if (normalized.length === 0) return []

      return dokployCatalog.endpoints.filter((endpoint) => {
        const haystack = [
          endpoint.procedure,
          endpoint.path,
          endpoint.tag,
          endpoint.summary ?? '',
          endpoint.description ?? '',
          ...endpoint.requiredInputs,
          ...endpoint.optionalInputs,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalized)
      })
    },
  }
}
