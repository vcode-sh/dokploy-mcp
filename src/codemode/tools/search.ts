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
        'JavaScript code. `catalog` is a global -- do NOT wrap in a function. ' +
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
    'Search the Dokploy API catalog. ' +
    'IMPORTANT: Do NOT wrap code in a function -- `catalog` is already a global. ' +
    'Write bare code: `catalog.searchText("deploy")` or `catalog.getByTag("application")` or `catalog.get("application.one")`. ' +
    'Common patterns: `catalog.get("application.one")` -> application detail fields plus optional shaping params; `catalog.get("application.many")` -> batched application reads; `catalog.get("project.overview")` -> compact project state view; `catalog.get("deployment.all")` -> deployment history entries. ' +
    'Returns procedure names, parameters, HTTP methods, schemas, and response hints for key endpoints.',
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
