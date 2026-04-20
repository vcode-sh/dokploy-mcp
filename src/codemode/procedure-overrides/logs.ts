import { createCaseInsensitiveKeySet, hasSecretKey, isRecord } from './shared.js'
import type { ProcedureOverride } from './types.js'

const textEncoder = new TextEncoder()

const LOG_TAIL_REQUEST_CAP = 200
const LOG_OUTPUT_LINE_CAP = 200
const LOG_OUTPUT_BYTE_CAP = 16 * 1024

export const logProcedureNames = [
  'application.readLogs',
  'compose.readLogs',
  'libsql.readLogs',
  'mariadb.readLogs',
  'mongo.readLogs',
  'mysql.readLogs',
  'postgres.readLogs',
  'redis.readLogs',
] as const

const logTextFieldKeys = createCaseInsensitiveKeySet([
  'content',
  'line',
  'log',
  'logs',
  'message',
  'messages',
  'output',
  'stderr',
  'stdout',
])

const logCollectionKeys = createCaseInsensitiveKeySet([
  'entries',
  'items',
  'lines',
  'logs',
  'messages',
])

function measureTextBytes(value: string) {
  return textEncoder.encode(value).length
}

function truncateTextToLastBytes(value: string, maxBytes: number) {
  if (measureTextBytes(value) <= maxBytes) {
    return value
  }

  let start = 0
  let result = value

  while (start < value.length && measureTextBytes(result) > maxBytes) {
    start += 1
    result = value.slice(start)
  }

  return result
}

function capLogTextBytes(value: string) {
  if (measureTextBytes(value) <= LOG_OUTPUT_BYTE_CAP) {
    return value
  }

  const truncated = truncateTextToLastBytes(value, LOG_OUTPUT_BYTE_CAP)
  return `[TRUNCATED TO LAST ${LOG_OUTPUT_BYTE_CAP} BYTES]\n${truncated}`
}

function redactLogSecrets(value: string) {
  return value
    .replace(
      /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/gi,
      '[REDACTED PRIVATE KEY]',
    )
    .replace(
      /((?:authorization|proxy-authorization)\s*[:=]\s*)(?:bearer\s+)?([^\s,;]+)/gi,
      '$1[REDACTED]',
    )
    .replace(
      /((?:"(?:x-api-key|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|passphrase|private[_ -]?key|secret(?:access[_ -]?key)?)"|(?:x-api-key|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|passphrase|private[_ -]?key|secret(?:access[_ -]?key)?))\s*[:=]\s*"?)([^"\s,;}]+)/gi,
      '$1[REDACTED]',
    )
    .replace(
      /(\b[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASS|PRIVATE_KEY|API_KEY)[A-Z0-9_]*=)([^\s]+)/g,
      '$1[REDACTED]',
    )
    .replace(
      /((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|https?):\/\/[^:\s/@]+:)([^@\s/]+)@/gi,
      '$1[REDACTED]@',
    )
}

function shapeLogText(value: string) {
  const normalized = redactLogSecrets(value).replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const recentLines =
    lines.length > LOG_OUTPUT_LINE_CAP
      ? [`[TRUNCATED TO LAST ${LOG_OUTPUT_LINE_CAP} LINES]`, ...lines.slice(-LOG_OUTPUT_LINE_CAP)]
      : lines

  return capLogTextBytes(recentLines.join('\n'))
}

function shapeLogArrayEntries(values: unknown[]) {
  let result = values.map((entry) => shapeLogResponse(entry))

  if (result.length > LOG_OUTPUT_LINE_CAP) {
    result = result.slice(-LOG_OUTPUT_LINE_CAP)
  }

  while (result.length > 1 && measureTextBytes(JSON.stringify(result)) > LOG_OUTPUT_BYTE_CAP) {
    result = result.slice(1)
  }

  if (result.length === 1 && typeof result[0] === 'string') {
    const onlyEntry = capLogTextBytes(result[0])
    result = onlyEntry === result[0] ? result : [onlyEntry]
  }

  return result
}

function shouldShapeLogTextField(key: string, value: string) {
  return hasSecretKey(logTextFieldKeys, key) || value.includes('\n') || value.length > 512
}

function shapeLogRecord(value: Record<string, unknown>) {
  let changed = false
  const result: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      const next = shouldShapeLogTextField(key, entry)
        ? shapeLogText(entry)
        : redactLogSecrets(entry)
      result[key] = next
      changed ||= next !== entry
      continue
    }

    if (Array.isArray(entry)) {
      const next = hasSecretKey(logCollectionKeys, key)
        ? shapeLogArrayEntries(entry)
        : entry.map((item) => shapeLogResponse(item))
      result[key] = next
      changed ||= next !== entry
      continue
    }

    const next = shapeLogResponse(entry)
    result[key] = next
    changed ||= next !== entry
  }

  return changed ? result : value
}

function shapeLogResponse(data: unknown): unknown {
  if (typeof data === 'string') {
    return shapeLogText(data)
  }

  if (Array.isArray(data)) {
    return shapeLogArrayEntries(data)
  }

  if (!isRecord(data)) {
    return data
  }

  return shapeLogRecord(data)
}

function mapLogReadInput(input: Record<string, unknown>) {
  const mapped = { ...input }

  if (typeof mapped.tail === 'number' && Number.isFinite(mapped.tail)) {
    mapped.tail = Math.min(Math.trunc(mapped.tail), LOG_TAIL_REQUEST_CAP)
  }

  return mapped
}

export function createLogReadOverride(): ProcedureOverride {
  return {
    mapInput: mapLogReadInput,
    transformResponse: (data) => shapeLogResponse(data),
  }
}
