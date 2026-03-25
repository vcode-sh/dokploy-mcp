export function normalizeTrpcParams(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([, value]) => value != null),
  )
}

export function buildTrpcQueryString(body: unknown): string {
  if (body == null) {
    return ''
  }

  const params = normalizeTrpcParams(body)

  return new URLSearchParams({
    input: JSON.stringify({ json: params }),
  }).toString()
}

export function buildTrpcPostBody(body: unknown): string | undefined {
  if (body == null) {
    return undefined
  }

  return JSON.stringify({ json: body })
}
