import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'
import { procedureSchemas } from '../../generated/dokploy-schemas.js'

type ProcedureName = keyof typeof procedureSchemas
type GeneratedProcedureSchema = (typeof procedureSchemas)[ProcedureName]

interface ProcedureOverride {
  inputSchema?: unknown
  mapInput?: (input: Record<string, unknown>) => Record<string, unknown>
  validateInput?: (input: Record<string, unknown>) => string[]
  transformResponse?: (data: unknown, input: Record<string, unknown>) => unknown
}

function createCaseInsensitiveKeySet(keys: string[]) {
  return new Set(keys.map((key) => key.toLowerCase()))
}

function hasSecretKey(secretKeys: ReadonlySet<string>, key: string) {
  return secretKeys.has(key.toLowerCase())
}

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

function redactGitProviderSecrets(data: unknown): unknown {
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

const transformSshSecretResponse = transformWithDeepSecretGate(sshSecretKeys)
const transformDestinationSecretResponse = transformWithDeepSecretGate(destinationSecretKeys)
const transformProviderStyleSecretResponse = transformWithDeepSecretGate(providerStyleSecretKeys)
const transformCertificateSecretResponse = transformWithDeepSecretGate(certificateSecretKeys)

const applicationOneMcpOnlyKeys = new Set([
  'select',
  'includeDeployments',
  'deploymentLimit',
  'includeSecrets',
])

const applicationOneInputSchema = {
  type: 'object',
  properties: {
    applicationId: {
      type: 'string',
      minLength: 1,
    },
    select: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    includeDeployments: {
      type: 'boolean',
    },
    deploymentLimit: {
      type: 'integer',
    },
    includeSecrets: {
      type: 'boolean',
    },
  },
  required: ['applicationId'],
  additionalProperties: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSelectedFields(select: unknown) {
  if (!Array.isArray(select)) {
    return null
  }

  const normalized: string[] = []
  const seen = new Set<string>()

  for (const entry of select) {
    if (typeof entry !== 'string') {
      continue
    }

    const field = entry.trim()
    if (field.length === 0 || seen.has(field)) {
      continue
    }

    seen.add(field)
    normalized.push(field)
  }

  return normalized
}

function pickSelectedFields(value: Record<string, unknown>, select: unknown) {
  const normalized = normalizeSelectedFields(select)
  if (!normalized) {
    return { ...value }
  }

  return Object.fromEntries(
    normalized.filter((field) => Object.hasOwn(value, field)).map((field) => [field, value[field]]),
  )
}

function applyDeploymentControls(
  value: Record<string, unknown>,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (input.includeDeployments === false) {
    const { deployments: _deployments, ...rest } = value
    return rest
  }

  if (typeof input.deploymentLimit === 'number' && Array.isArray(value.deployments)) {
    return {
      ...value,
      deployments: value.deployments.slice(0, input.deploymentLimit),
    }
  }

  return value
}

function validateApplicationOneInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if ('select' in input) {
    if (!Array.isArray(input.select) || input.select.length === 0) {
      errors.push('select must be a non-empty array of field names')
    } else {
      for (const [index, field] of input.select.entries()) {
        if (typeof field !== 'string' || field.trim().length === 0) {
          errors.push(`select[${index}] must be a non-empty string`)
        }
      }
    }
  }

  if ('deploymentLimit' in input) {
    if (
      typeof input.deploymentLimit !== 'number' ||
      !Number.isInteger(input.deploymentLimit) ||
      input.deploymentLimit < 0
    ) {
      errors.push('deploymentLimit must be a non-negative integer')
    }
  }

  if (input.includeDeployments === false && input.deploymentLimit !== undefined) {
    errors.push('deploymentLimit cannot be used when includeDeployments is false')
  }

  return errors
}

function mapApplicationOneInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !applicationOneMcpOnlyKeys.has(key)),
  )
}

function transformApplicationOneResponse(data: unknown, input: Record<string, unknown>) {
  if (!isRecord(data)) {
    return data
  }

  const selected = pickSelectedFields(data, input.select)
  const shaped = applyDeploymentControls(selected, input)
  return input.includeSecrets === true ? shaped : redactGitProviderSecrets(shaped)
}

const includeSecretsMcpOnlyKeys = new Set(['includeSecrets'])

function mapIncludeSecretsInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !includeSecretsMcpOnlyKeys.has(key)),
  )
}

function transformWithSecretGate(data: unknown, input: Record<string, unknown>) {
  return input.includeSecrets === true ? data : redactGitProviderSecrets(data)
}

function transformArrayWithSecretGate(data: unknown, input: Record<string, unknown>) {
  return input.includeSecrets === true ? data : redactGitProviderArray(data)
}

function withIncludeSecrets(schema: Record<string, unknown>) {
  const properties = (schema.properties ?? {}) as Record<string, unknown>
  return {
    ...schema,
    properties: {
      ...properties,
      includeSecrets: { type: 'boolean' },
    },
  }
}

const emptyIncludeSecretsInputSchema = withIncludeSecrets({
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
})

function createIdInputSchema(idKey: string) {
  return withIncludeSecrets({
    type: 'object',
    properties: {
      [idKey]: {
        type: 'string',
        minLength: 1,
      },
    },
    required: [idKey],
    additionalProperties: false,
  })
}

const sshKeyGenerateInputSchema = withIncludeSecrets({
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['rsa', 'ed25519'],
    },
  },
  additionalProperties: false,
})

const procedureOverrides: Record<string, ProcedureOverride> = {
  'application.one': {
    inputSchema: applicationOneInputSchema,
    mapInput: mapApplicationOneInput,
    validateInput: validateApplicationOneInput,
    transformResponse: transformApplicationOneResponse,
  },
  'github.one': {
    inputSchema: withIncludeSecrets({
      type: 'object',
      properties: { githubId: { type: 'string', minLength: 1 } },
      required: ['githubId'],
      additionalProperties: false,
    }),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformWithSecretGate,
  },
  'github.githubProviders': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformArrayWithSecretGate,
  },
  'gitea.one': {
    inputSchema: withIncludeSecrets({
      type: 'object',
      properties: { giteaId: { type: 'string', minLength: 1 } },
      required: ['giteaId'],
      additionalProperties: false,
    }),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformWithSecretGate,
  },
  'gitea.giteaProviders': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformArrayWithSecretGate,
  },
  'gitlab.one': {
    inputSchema: withIncludeSecrets({
      type: 'object',
      properties: { gitlabId: { type: 'string', minLength: 1 } },
      required: ['gitlabId'],
      additionalProperties: false,
    }),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformWithSecretGate,
  },
  'gitlab.gitlabProviders': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformArrayWithSecretGate,
  },
  'bitbucket.one': {
    inputSchema: withIncludeSecrets({
      type: 'object',
      properties: { bitbucketId: { type: 'string', minLength: 1 } },
      required: ['bitbucketId'],
      additionalProperties: false,
    }),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformWithSecretGate,
  },
  'bitbucket.bitbucketProviders': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformArrayWithSecretGate,
  },
  'gitProvider.getAll': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformArrayWithSecretGate,
  },
  'destination.one': {
    inputSchema: createIdInputSchema('destinationId'),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformDestinationSecretResponse,
  },
  'destination.all': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformDestinationSecretResponse,
  },
  'notification.one': {
    inputSchema: createIdInputSchema('notificationId'),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformProviderStyleSecretResponse,
  },
  'notification.all': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformProviderStyleSecretResponse,
  },
  'certificates.one': {
    inputSchema: createIdInputSchema('certificateId'),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformCertificateSecretResponse,
  },
  'certificates.all': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformCertificateSecretResponse,
  },
  'sso.one': {
    inputSchema: createIdInputSchema('providerId'),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformProviderStyleSecretResponse,
  },
  'server.withSSHKey': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
  'sshKey.all': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
  'sshKey.generate': {
    inputSchema: sshKeyGenerateInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
  'sshKey.one': {
    inputSchema: createIdInputSchema('sshKeyId'),
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
  'sshKey.allForApps': {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
}

function getGeneratedProcedureSchema(procedure: string) {
  return procedureSchemas[procedure as ProcedureName] as GeneratedProcedureSchema | undefined
}

function extractObjectInputMetadata(schema: unknown) {
  if (!isRecord(schema) || schema.type !== 'object' || !isRecord(schema.properties)) {
    return {
      requiredInputs: [] as string[],
      optionalInputs: [] as string[],
    }
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string')
    : []
  const requiredSet = new Set(required)
  const optional = Object.keys(schema.properties).filter((key) => !requiredSet.has(key))

  return {
    requiredInputs: required,
    optionalInputs: optional,
  }
}

export function getEffectiveProcedureSchema(procedure: string) {
  const generated = getGeneratedProcedureSchema(procedure)
  if (!generated) {
    return null
  }

  const override = procedureOverrides[procedure]
  if (!override) {
    return generated
  }

  return {
    ...generated,
    inputSchema: override.inputSchema ?? generated.inputSchema,
  }
}

export function applyProcedureInputMetadata(endpoint: CatalogEndpoint) {
  const effectiveSchema = getEffectiveProcedureSchema(endpoint.procedure)
  if (!effectiveSchema) {
    return endpoint
  }

  const metadata = extractObjectInputMetadata(effectiveSchema.inputSchema)

  return {
    ...endpoint,
    requiredInputs: metadata.requiredInputs,
    optionalInputs: metadata.optionalInputs,
  }
}

export function mapProcedureInput(procedure: string, input: Record<string, unknown>) {
  return procedureOverrides[procedure]?.mapInput?.(input) ?? input
}

export function validateProcedureInput(procedure: string, input: Record<string, unknown>) {
  return procedureOverrides[procedure]?.validateInput?.(input) ?? []
}

export function transformProcedureResponse(
  procedure: string,
  input: Record<string, unknown>,
  data: unknown,
) {
  return procedureOverrides[procedure]?.transformResponse?.(data, input) ?? data
}
