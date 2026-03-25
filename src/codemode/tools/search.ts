import { z } from 'zod'

import { createTool, type ToolDefinition } from '../../mcp/tool-factory.js'
import { createSearchCatalogView } from '../context/search-context.js'
import { runSandboxedFunction } from '../sandbox/runner.js'
import { resolveSandboxRuntime } from '../sandbox/runtime.js'
import { runSearchInSubprocess } from '../sandbox/subprocess-runner.js'

const searchSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .describe(
        'JavaScript code to search the API catalog. `catalog` is available as a global. ' +
          'Examples: `catalog.searchText("application deploy")` | ' +
          '`catalog.getByTag("compose")` | `catalog.get("application.one")`. ' +
          'Methods: searchText(query), get(procedure), getByTag(tag), endpoints, byTag.',
      ),
  })
  .strict()

const searchCatalog = createSearchCatalogView()
const MAX_SEARCH_OUTPUT_BYTES = 32 * 1024

function boundSearchResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return trimArrayToBytes(value)
  }

  if (value && typeof value === 'object' && 'matches' in value) {
    const typed = value as { matches?: unknown }
    if (Array.isArray(typed.matches)) {
      return {
        ...typed,
        matches: trimArrayToBytes(typed.matches),
      }
    }
  }

  return value
}

function trimArrayToBytes(items: unknown[]) {
  const limited = items.slice(0, 50)
  let length = limited.length

  while (length > 0) {
    const candidate = limited.slice(0, length)
    const bytes = Buffer.byteLength(JSON.stringify(candidate), 'utf8')
    if (bytes <= MAX_SEARCH_OUTPUT_BYTES) {
      return candidate
    }
    length -= 1
  }

  return []
}

export const searchTool: ToolDefinition = createTool({
  name: 'search',
  title: 'Search Dokploy API',
  description:
    'Search the Dokploy API catalog to discover procedures, parameters, and modules. ' +
    '`catalog` is available as a global -- just write: `catalog.searchText("deploy")`. ' +
    'Use catalog.searchText("query") to find by keyword, catalog.getByTag("application") for a module, ' +
    'catalog.get("application.one") for one procedure. ' +
    'Returns procedure names, required/optional parameters, and HTTP methods.',
  schema: searchSchema,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ input }) => {
    const execution =
      resolveSandboxRuntime() === 'subprocess'
        ? await runSearchInSubprocess({ code: input.code })
        : await runSandboxedFunction({
            code: input.code,
            context: {
              catalog: searchCatalog,
            },
          })

    return {
      result: boundSearchResult(execution.result),
      logs: execution.logs,
    }
  },
})
