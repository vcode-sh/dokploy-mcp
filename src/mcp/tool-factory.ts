import type { ZodObject, z } from 'zod'

import { ApiError, api } from '../api/client.js'

type AnyZodObject = ZodObject

export interface ToolAnnotations {
  title?: string
  readOnlyHint?: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

export interface ToolExecutionOptions {
  taskSupport?: 'optional' | 'required' | 'forbidden'
}

export interface ToolDefinition {
  name: string
  title: string
  description: string
  endpoint?: string
  method?: 'GET' | 'POST'
  schema: AnyZodObject
  annotations: ToolAnnotations
  execution?: ToolExecutionOptions
  handler: (input: Record<string, unknown>) => Promise<{
    content: { type: 'text'; text: string }[]
    structuredContent?: Record<string, unknown>
    isError?: boolean
  }>
  taskHandler?: unknown
}

function wrapStructured(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    return { items: data }
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return { value: data }
  }

  return data as Record<string, unknown>
}

function success(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: wrapStructured(data),
  }
}

function error(message: string, details?: string) {
  const payload = { error: message, ...(details ? { details } : {}) }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
    isError: true,
  }
}

const ERROR_MAP: Record<number, [string, (err: ApiError) => string]> = {
  401: [
    'Authentication failed',
    () =>
      'Check your Dokploy API key. For stdio use DOKPLOY_API_KEY or local config; for remote HTTP use X-Dokploy-Api-Key.',
  ],
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
  const tool = createTool({
    name: opts.name,
    title: opts.title,
    description: opts.description,
    schema: opts.schema,
    annotations: opts.annotations,
    handler: async ({ input, api }) => api.post(opts.endpoint, input),
  })

  return {
    ...tool,
    endpoint: opts.endpoint,
    method: 'POST',
  }
}

export function getTool<T extends AnyZodObject>(opts: {
  name: string
  title: string
  description: string
  schema: T
  endpoint: string
  annotations?: Partial<ToolAnnotations>
}): ToolDefinition {
  const tool = createTool({
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
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          params[key] = value
        }
      }
      return api.get(opts.endpoint, params)
    },
  })

  return {
    ...tool,
    endpoint: opts.endpoint,
    method: 'GET',
  }
}
