import { ErrorCode, McpError, type ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'

import { getArray, getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'

const MAX_RESOURCE_TEXT_BYTES = 24 * 1024
const MAX_RESOURCE_ARRAY_ITEMS = 12
const MAX_RESOURCE_STRING_LENGTH = 1_200
const MAX_RESOURCE_DEPTH = 6

export interface ListedResource {
  uri: string
  name: string
  title?: string
  description?: string
  mimeType?: string
}

export function buildDokployResourceUri(
  kind: 'project' | 'application' | 'deployment' | 'server',
  id: string,
  view: string,
) {
  return `dokploy://${kind}/${encodeURIComponent(id)}/${view}`
}

export function createJsonResourceResult(uri: string, payload: unknown): ReadResourceResult {
  const boundedPayload = boundResourcePayload(uri, payload)

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(boundedPayload, null, 2),
      },
    ],
  }
}

export function extractItems(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }

  if (isRecord(value) && Array.isArray(value.items)) {
    return value.items
  }

  return []
}

export function takeStringArray(value: unknown, limit = MAX_RESOURCE_ARRAY_ITEMS) {
  return getArray(value)
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .slice(0, limit)
}

export function pickDefinedFields(
  value: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const key of keys) {
    const entry = value[key]
    if (entry !== undefined) {
      result[key] = entry
    }
  }

  return result
}

export function getOptionalId(value: Record<string, unknown>, key: string) {
  const nextValue = getStringOrNull(value[key])
  return nextValue && nextValue.trim().length > 0 ? nextValue : null
}

export function asMcpError(error: unknown): never {
  if (error instanceof McpError) {
    throw error
  }

  if (isRecord(error) && typeof error.message === 'string') {
    const code =
      error.type === 'validation_error' ? ErrorCode.InvalidParams : ErrorCode.InternalError
    throw new McpError(code, error.message, error)
  }

  if (error instanceof Error) {
    throw error
  }

  throw new McpError(ErrorCode.InternalError, 'Unknown resource error', error)
}

export function notFound(message: string): never {
  throw new McpError(ErrorCode.InvalidParams, message)
}

function boundResourcePayload(uri: string, payload: unknown) {
  if (getByteLength(payload) <= MAX_RESOURCE_TEXT_BYTES) {
    return payload
  }

  const trimmedPayload = trimValue(payload)
  if (getByteLength(trimmedPayload) <= MAX_RESOURCE_TEXT_BYTES) {
    return trimmedPayload
  }

  return {
    uri,
    truncated: true,
    note: `Resource payload exceeded ${MAX_RESOURCE_TEXT_BYTES} bytes and was reduced.`,
    summary: summarizeValue(payload),
  }
}

function getByteLength(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function trimValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_RESOURCE_DEPTH) {
    return '[Truncated depth]'
  }

  if (typeof value === 'string') {
    return value.length > MAX_RESOURCE_STRING_LENGTH
      ? `${value.slice(0, MAX_RESOURCE_STRING_LENGTH)}...`
      : value
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_RESOURCE_ARRAY_ITEMS).map((entry) => trimValue(entry, depth + 1))
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, trimValue(entry, depth + 1)]),
  )
}

function summarizeValue(value: unknown) {
  if (Array.isArray(value)) {
    return {
      kind: 'array',
      total: value.length,
      sample: value.slice(0, 3).map((entry) => trimValue(entry, 1)),
    }
  }

  if (isRecord(value)) {
    const entries = Object.entries(value)
    return {
      kind: 'object',
      keys: entries.map(([key]) => key),
      sample: Object.fromEntries(
        entries.slice(0, 8).map(([key, entry]) => [key, trimValue(entry, 1)]),
      ),
    }
  }

  return {
    kind: typeof value,
    value: trimValue(value),
  }
}
