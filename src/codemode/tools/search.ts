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
        'An async arrow function receiving ({ catalog }). ' +
          'Example: async ({ catalog }) => catalog.searchText("application deploy"). ' +
          'catalog methods: searchText(query), get(procedure), getByTag(tag), ' +
          'endpoints (array of all procedures), byTag (grouped by module).',
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
    'The code parameter must be an async arrow function: async ({ catalog }) => { ... }. ' +
    'Use catalog.searchText("query") to find procedures by keyword, ' +
    'catalog.getByTag("application") to list all procedures in a module, ' +
    'catalog.get("application.one") to get details of a specific procedure. ' +
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
