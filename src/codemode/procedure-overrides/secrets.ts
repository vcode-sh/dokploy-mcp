import { createCaseInsensitiveKeySet, hasSecretKey, isRecord } from './shared.js'

// Keys that hold credentials in git-provider objects (github, gitea, gitlab, bitbucket).
// Redacted by default — callers must pass includeSecrets: true to receive them.
const gitProviderSecretKeys = createCaseInsensitiveKeySet([
  // GitHub App
  'githubClientSecret',
  'githubPrivateKey',
  'githubWebhookSecret',
  // Gitea
  'clientSecret',
  'accessToken',
  'refreshToken',
  // GitLab
  'secret',
  // Bitbucket
  'appPassword',
  'apiToken',
  // SSH / generic
  'privateKey',
  'privateKeyPass',
])

const sshSecretKeys = createCaseInsensitiveKeySet([
  'privateKey',
  'privateKeyPass',
  'encPrivateKey',
  'encPrivateKeyPass',
  'decryptionPvk',
])

const destinationSecretKeys = createCaseInsensitiveKeySet(['accessKey', 'secretAccessKey'])

const providerStyleSecretKeys = createCaseInsensitiveKeySet([
  'accessKey',
  'accessToken',
  'apiKey',
  'apiToken',
  'appPassword',
  'appToken',
  'botToken',
  'clientSecret',
  'decryptionPvk',
  'encPrivateKey',
  'encPrivateKeyPass',
  'githubClientSecret',
  'githubPrivateKey',
  'githubWebhookSecret',
  'headers',
  'password',
  'privateKey',
  'privateKeyPass',
  'refreshToken',
  'secret',
  'secretAccessKey',
  'token',
  'userKey',
  'webhookUrl',
])

const certificateSecretKeys = createCaseInsensitiveKeySet(['privateKey'])
const dataServiceSecretKeys = createCaseInsensitiveKeySet([
  'databasePassword',
  'databaseRootPassword',
])

// Top-level keys on an application object that contain nested git-provider data
const gitProviderNestingKeys = new Set(['github', 'gitea', 'gitlab', 'bitbucket'])

function redactRecord(value: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(value)) {
    if (hasSecretKey(gitProviderSecretKeys, key)) {
      redacted[key] = '[REDACTED]'
    } else if (isRecord(val)) {
      redacted[key] = redactRecord(val)
    } else {
      redacted[key] = val
    }
  }

  return redacted
}

export function redactGitProviderSecrets(data: unknown): unknown {
  if (!isRecord(data)) {
    return data
  }

  if (Array.isArray(data)) {
    return data
  }

  let changed = false
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (hasSecretKey(gitProviderSecretKeys, key)) {
      result[key] = '[REDACTED]'
      changed = true
    } else if (gitProviderNestingKeys.has(key) && isRecord(value)) {
      result[key] = redactRecord(value)
      changed = true
    } else {
      result[key] = value
    }
  }

  return changed ? result : data
}

function redactSecretKeysDeep(data: unknown, secretKeys: ReadonlySet<string>): unknown {
  if (Array.isArray(data)) {
    let changed = false
    const result = data.map((item) => {
      const next = redactSecretKeysDeep(item, secretKeys)
      changed ||= next !== item
      return next
    })
    return changed ? result : data
  }

  if (!isRecord(data)) {
    return data
  }

  let changed = false
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (hasSecretKey(secretKeys, key)) {
      result[key] = '[REDACTED]'
      changed = true
      continue
    }

    const next = redactSecretKeysDeep(value, secretKeys)
    result[key] = next
    changed ||= next !== value
  }

  return changed ? result : data
}

function redactGitProviderArray(data: unknown): unknown {
  if (!Array.isArray(data)) {
    return redactGitProviderSecrets(data)
  }

  return data.map((item) => redactGitProviderSecrets(item))
}

function transformWithDeepSecretGate(secretKeys: ReadonlySet<string>) {
  return (data: unknown, input: Record<string, unknown>) =>
    input.includeSecrets === true ? data : redactSecretKeysDeep(data, secretKeys)
}

export function transformWithSecretGate(data: unknown, input: Record<string, unknown>) {
  return input.includeSecrets === true ? data : redactGitProviderSecrets(data)
}

export function transformArrayWithSecretGate(data: unknown, input: Record<string, unknown>) {
  return input.includeSecrets === true ? data : redactGitProviderArray(data)
}

export const transformSshSecretResponse = transformWithDeepSecretGate(sshSecretKeys)
export const transformDestinationSecretResponse = transformWithDeepSecretGate(destinationSecretKeys)
export const transformProviderStyleSecretResponse =
  transformWithDeepSecretGate(providerStyleSecretKeys)
export const transformCertificateSecretResponse = transformWithDeepSecretGate(certificateSecretKeys)
export const transformDataServiceSecretResponse = transformWithDeepSecretGate(dataServiceSecretKeys)
