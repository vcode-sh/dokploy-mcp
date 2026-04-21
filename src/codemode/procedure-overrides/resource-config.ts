import type { ProcedureOverride } from './types.js'

const memoryFieldNames = new Set(['memoryReservation', 'memoryLimit'])
const cpuFieldNames = new Set(['cpuReservation', 'cpuLimit'])

function isResourceConfigField(key: string) {
  return memoryFieldNames.has(key) || cpuFieldNames.has(key)
}

function validateMemoryField(field: string, value: string) {
  const normalized = value.trim()
  if (/^\d+$/.test(normalized)) {
    return null
  }

  return `${field} must be a string containing bytes. Example: 256MB -> "268435456".`
}

function validateCpuField(field: string, value: string) {
  const normalized = value.trim()
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  return `${field} must be a numeric string such as "0.25", "0.50", or "1".`
}

export function mapDokployResourceConfigInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' && isResourceConfigField(key) ? value.trim() : value,
    ]),
  )
}

export function validateDokployResourceConfigInput(input: Record<string, unknown>) {
  const errors: string[] = []

  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== 'string') {
      continue
    }

    if (memoryFieldNames.has(key)) {
      const error = validateMemoryField(key, value)
      if (error) {
        errors.push(error)
      }
      continue
    }

    if (cpuFieldNames.has(key)) {
      const error = validateCpuField(key, value)
      if (error) {
        errors.push(error)
      }
    }
  }

  return errors
}

export const dokployResourceConfigOverride: ProcedureOverride = {
  mapInput: mapDokployResourceConfigInput,
  validateInput: validateDokployResourceConfigInput,
}
