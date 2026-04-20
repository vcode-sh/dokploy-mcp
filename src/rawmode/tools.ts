import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { invokeProcedure } from '../codemode/gateway/api-gateway.js'
import { getEffectiveProcedureSchema } from '../codemode/overrides/procedure-overrides.js'
import { type CatalogEndpoint, dokployCatalog } from '../generated/dokploy-catalog.js'
import { procedureSchemas } from '../generated/dokploy-schemas.js'
import type { ToolAnnotations, ToolDefinition } from '../mcp/tool-factory.js'
import { jsonSchemaToZodObject } from './json-schema-to-zod.js'

type ProcedureName = keyof typeof procedureSchemas

export interface RawModeOptions {
  enabledTags?: string[]
}

const rawToolCache = new Map<string, ToolDefinition[]>()
const rawSchemaCache = new Map<string, ReturnType<typeof jsonSchemaToZodObject>>()

function wrapStructured(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { items: data }
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return { value: data }
  }

  return data as Record<string, unknown>
}

function buildRawToolDescription(endpoint: CatalogEndpoint) {
  const parts = [
    endpoint.summary?.trim() || endpoint.description?.trim() || 'Generated Dokploy procedure tool.',
    `${endpoint.method} ${endpoint.path}.`,
    `Tag: ${endpoint.tag}.`,
    'Routes through the validated Dokploy gateway used by Code Mode.',
  ]

  return parts.join(' ')
}

function buildRawToolAnnotations(endpoint: CatalogEndpoint): ToolAnnotations {
  if (endpoint.method === 'GET') {
    return {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: true,
    }
  }

  return {
    openWorldHint: true,
  }
}

function getProcedureSchema(procedure: string) {
  const cached = rawSchemaCache.get(procedure)
  if (cached) {
    return cached
  }

  const procedureSchema =
    getEffectiveProcedureSchema(procedure) ?? procedureSchemas[procedure as ProcedureName]
  const schema = jsonSchemaToZodObject(procedureSchema?.inputSchema)
  rawSchemaCache.set(procedure, schema)
  return schema
}

function createRawTool(endpoint: CatalogEndpoint): ToolDefinition {
  return {
    name: endpoint.procedure,
    title: endpoint.summary?.trim() || endpoint.procedure,
    description: buildRawToolDescription(endpoint),
    schema: getProcedureSchema(endpoint.procedure),
    annotations: buildRawToolAnnotations(endpoint),
    handler: async (input) => {
      try {
        const result = await invokeProcedure(endpoint.procedure, input)
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          structuredContent: wrapStructured(result.data),
        }
      } catch (error) {
        const payload =
          error && typeof error === 'object'
            ? (error as Record<string, unknown>)
            : { message: error instanceof Error ? error.message : 'Unknown error' }

        return {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
          isError: true,
        }
      }
    },
  }
}

function normalizeEnabledTags(enabledTags?: string[]) {
  const tags = enabledTags?.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)

  if (!tags || tags.length === 0) {
    return undefined
  }

  return [...new Set(tags)]
}

function buildCacheKey(options: RawModeOptions = {}) {
  const enabledTags = normalizeEnabledTags(options.enabledTags)
  return enabledTags ? enabledTags.join(',') : '*'
}

export function getRawModeEndpoints(options: RawModeOptions = {}) {
  const enabledTags = normalizeEnabledTags(options.enabledTags)

  return enabledTags
    ? dokployCatalog.endpoints.filter((endpoint) =>
        enabledTags.includes(endpoint.tag.toLowerCase()),
      )
    : dokployCatalog.endpoints
}

export function createRawModeTools(options: RawModeOptions = {}): ToolDefinition[] {
  const cacheKey = buildCacheKey(options)
  const cached = rawToolCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const tools = getRawModeEndpoints(options).map((endpoint) => createRawTool(endpoint))
  rawToolCache.set(cacheKey, tools)
  return tools
}

export function registerRawModeTools(server: McpServer, options: RawModeOptions = {}) {
  for (const tool of createRawModeTools(options)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.schema,
        annotations: tool.annotations,
      },
      tool.handler,
    )
  }
}
