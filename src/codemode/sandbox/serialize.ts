function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return (
    prototype === Object.prototype ||
    prototype === null ||
    prototype?.constructor?.name === 'Object'
  )
}

export function serializeSandboxValue(value: unknown, maxBytes: number): unknown {
  const normalized = normalizeValue(value)
  const json = JSON.stringify(normalized)

  if (json === undefined) {
    throw new Error('Sandbox returned a non-serializable value.')
  }

  const bytes = Buffer.byteLength(json, 'utf8')
  if (bytes > maxBytes) {
    throw new Error(`Sandbox result exceeded ${maxBytes} bytes.`)
  }

  return JSON.parse(json) as unknown
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    throw new Error('Sandbox returned a non-serializable value.')
  }

  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry))
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    )
  }

  return String(value)
}
