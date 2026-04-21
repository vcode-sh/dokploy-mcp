function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getCodemodeErrorMessage(error: unknown, fallback = 'Unknown error') {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }

  if (isRecord(error)) {
    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error
    }

    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      // Best-effort only.
    }
  }

  return fallback
}

export function normalizeCodemodeError(error: unknown, fallback = 'Unknown error') {
  return error instanceof Error ? error : new Error(getCodemodeErrorMessage(error, fallback))
}
