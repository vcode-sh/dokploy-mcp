import { z } from 'zod'

import { resolveProfileConfig } from '../../config/resolver.js'
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
          '`catalog.recommend("safe database password rotation")` | ' +
          '`catalog.getByTag("compose")` | `catalog.get("application.one")` | `catalog.get("application.update")`. ' +
          'Methods: searchText(query), recommend(query), get(procedure), getByTag(tag), endpoints, byTag.',
      ),
    profile: z
      .string()
      .min(1)
      .optional()
      .describe('Optional Dokploy profile name to validate before returning catalog results.'),
  })
  .strict()

const searchCatalog = createSearchCatalogView()
const MAX_SEARCH_OUTPUT_BYTES = 32 * 1024

function boundSearchResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return trimArrayToBytes(value)
  }

  if (value && typeof value === 'object') {
    const typed = value as Record<string, unknown>
    const bounded = { ...typed }

    for (const key of ['matches', 'recommended', 'related']) {
      if (Array.isArray(typed[key])) {
        bounded[key] = trimArrayToBytes(typed[key])
      }
    }

    return bounded
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
    'Write bare code: `catalog.searchText("deploy")` or `catalog.recommend("safe database password rotation")` or `catalog.getByTag("application")` or `catalog.get("application.one")`. ' +
    'Common patterns: `catalog.recommend("tail project logs across environments")` -> helper-first workflow suggestions; `catalog.get("application.one")` -> application detail fields plus optional shaping params; `catalog.get("application.update")` -> build/runtime/resource tuning fields such as byte-based memory limits; `catalog.get("application.many")` -> batched application reads; `catalog.get("project.overview")` -> compact project state view; `catalog.get("deployment.all")` -> deployment history entries. ' +
    'Returns procedure names, parameters, HTTP methods, schemas, and response hints for key endpoints.',
  schema: searchSchema,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ input }) => {
    if (input.profile) {
      resolveProfileConfig(input.profile)
    }

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
