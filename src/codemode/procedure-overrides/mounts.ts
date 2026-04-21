import type { ProcedureOverride } from './types.js'

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

const trimmableMountFieldNames = new Set([
  'applicationId',
  'composeId',
  'filePath',
  'hostPath',
  'libsqlId',
  'mariadbId',
  'mongoId',
  'mountId',
  'mountPath',
  'mysqlId',
  'postgresId',
  'redisId',
  'serviceId',
  'serviceType',
  'type',
  'volumeName',
])

function hasOwn(input: Record<string, unknown>, key: string) {
  return Object.hasOwn(input, key)
}

function resolveMountCreateType(input: Record<string, unknown>) {
  return typeof input.type === 'string' ? input.type : null
}

function resolveMountUpdateType(input: Record<string, unknown>) {
  if (typeof input.type === 'string') {
    return input.type
  }

  if (hasOwn(input, 'hostPath')) {
    return 'bind'
  }

  if (hasOwn(input, 'volumeName')) {
    return 'volume'
  }

  if (hasOwn(input, 'filePath') || hasOwn(input, 'content')) {
    return 'file'
  }

  return null
}

function validateMountFieldConflicts(
  input: Record<string, unknown>,
  mountType: 'bind' | 'volume' | 'file',
) {
  const errors: string[] = []

  if (mountType === 'bind') {
    if (hasOwn(input, 'volumeName')) {
      errors.push('bind mounts should not set volumeName')
    }
    if (hasOwn(input, 'filePath')) {
      errors.push('bind mounts should not set filePath')
    }
    if (hasOwn(input, 'content')) {
      errors.push('bind mounts should not set content')
    }
  }

  if (mountType === 'volume') {
    if (hasOwn(input, 'hostPath')) {
      errors.push('volume mounts should not set hostPath')
    }
    if (hasOwn(input, 'filePath')) {
      errors.push('volume mounts should not set filePath')
    }
    if (hasOwn(input, 'content')) {
      errors.push('volume mounts should not set content')
    }
  }

  if (mountType === 'file') {
    if (hasOwn(input, 'hostPath')) {
      errors.push('file mounts should not set hostPath')
    }
    if (hasOwn(input, 'volumeName')) {
      errors.push('file mounts should not set volumeName')
    }
  }

  return errors
}

function validateMountTypeRequirements(
  input: Record<string, unknown>,
  mountType: 'bind' | 'volume' | 'file',
  mode: 'create' | 'update',
) {
  const errors: string[] = []

  if (mountType === 'bind' && !isNonEmptyString(input.hostPath)) {
    errors.push(
      `${
        mode === 'create'
          ? 'bind mounts require hostPath'
          : 'changing a mount to type "bind" requires hostPath'
      }. Make sure the path already exists on the Dokploy host.`,
    )
  }

  if (mountType === 'volume' && !isNonEmptyString(input.volumeName)) {
    errors.push(
      mode === 'create'
        ? 'volume mounts require volumeName'
        : 'changing a mount to type "volume" requires volumeName',
    )
  }

  if (mountType === 'file' && !isNonEmptyString(input.filePath)) {
    errors.push(
      mode === 'create'
        ? 'file mounts require filePath'
        : 'changing a mount to type "file" requires filePath',
    )
  }

  return errors
}

function isMountType(value: string | null): value is 'bind' | 'volume' | 'file' {
  return value === 'bind' || value === 'volume' || value === 'file'
}

function trimMountStrings(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      typeof value === 'string' && trimmableMountFieldNames.has(key) ? value.trim() : value,
    ]),
  )
}

function validateCreateMountInput(input: Record<string, unknown>) {
  const mountType = resolveMountCreateType(input)
  if (!isMountType(mountType)) {
    return []
  }

  return [
    ...validateMountTypeRequirements(input, mountType, 'create'),
    ...validateMountFieldConflicts(input, mountType),
  ]
}

function validateUpdateMountInput(input: Record<string, unknown>) {
  const mountType = resolveMountUpdateType(input)
  if (!isMountType(mountType)) {
    return []
  }

  const requiresTypeSpecificField = hasOwn(input, 'type')

  return [
    ...(requiresTypeSpecificField ? validateMountTypeRequirements(input, mountType, 'update') : []),
    ...validateMountFieldConflicts(input, mountType),
  ]
}

export const mountsCreateOverride: ProcedureOverride = {
  mapInput: trimMountStrings,
  validateInput: validateCreateMountInput,
}

export const mountsUpdateOverride: ProcedureOverride = {
  mapInput: trimMountStrings,
  validateInput: validateUpdateMountInput,
}
