import type { ZodObject, z } from 'zod'

import { ApiError, api } from '../api/client.js'

/** Zod object type alias used throughout the tool factory */
type AnyZodObject = ZodObject

export interface ToolAnnotations {
  title?: string
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  schema: AnyZodObject
  annotations: ToolAnnotations
  handler: (input: Record<string, unknown>) => Promise<{
    content: { type: 'text'; text: string }[]
    structuredContent?: Record<string, unknown>
    isError?: boolean
  }>
}

function success(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  }
}

function error(message: string, details?: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message, ...(details ? { details } : {}) }, null, 2),
      },
    ],
    isError: true,
  }
}

const ERROR_MAP: Record<number, [string, (err: ApiError) => string]> = {
  401: ['Authentication failed', () => 'Check your DOKPLOY_API_KEY environment variable.'],
  403: ['Permission denied', () => 'Your API key lacks permission for this operation.'],
  404: ['Resource not found', (err) => err.message],
  422: [
    'Validation error',
    (err) =>
      typeof err.body === 'object' && err.body !== null ? JSON.stringify(err.body) : err.message,
  ],
}

function mapApiError(err: ApiError) {
  const entry = ERROR_MAP[err.status]
  if (entry) {
    const [message, getDetails] = entry
    return error(message, getDetails(err))
  }
  return error(`Dokploy API error (${err.status})`, err.message)
}

export function createTool<T extends AnyZodObject>(def: {
  name: string
  title: string
  description: string
  schema: T
  annotations?: Partial<ToolAnnotations>
  handler: (params: { input: z.infer<T>; api: typeof api }) => Promise<unknown>
}): ToolDefinition {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    schema: def.schema,
    annotations: { openWorldHint: true, ...def.annotations },
    handler: async (input) => {
      try {
        const result = await def.handler({ input: input as z.infer<T>, api })
        return success(result)
      } catch (err) {
        if (err instanceof ApiError) {
          return mapApiError(err)
        }
        return error(
          `Failed to execute ${def.name}`,
          err instanceof Error ? err.message : 'Unknown error',
        )
      }
    },
  }
}

export function postTool<T extends AnyZodObject>(opts: {
  name: string
  title: string
  description: string
  schema: T
  endpoint: string
  annotations?: Partial<ToolAnnotations>
}): ToolDefinition {
  return createTool({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    schema: opts.schema,
    annotations: opts.annotations,
    handler: async ({ input, api }) => api.post(opts.endpoint, input),
  })
}

export function getTool<T extends AnyZodObject>(opts: {
  name: string
  title: string
  description: string
  schema: T
  endpoint: string
  annotations?: Partial<ToolAnnotations>
}): ToolDefinition {
  return createTool({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    schema: opts.schema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      ...opts.annotations,
    },
    handler: async ({ input, api }) => {
      const params: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
        if (v !== undefined && v !== null) {
          params[k] = v
        }
      }
      return api.get(opts.endpoint, Object.keys(params).length > 0 ? params : undefined)
    },
  })
}
