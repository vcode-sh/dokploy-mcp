export function createCaseInsensitiveKeySet(keys: string[]) {
  return new Set(keys.map((key) => key.toLowerCase()))
}

export function hasSecretKey(secretKeys: ReadonlySet<string>, key: string) {
  return secretKeys.has(key.toLowerCase())
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const includeSecretsMcpOnlyKeys = new Set(['includeSecrets'])

export function mapIncludeSecretsInput(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => !includeSecretsMcpOnlyKeys.has(key)),
  )
}

export function withIncludeSecrets(schema: Record<string, unknown>) {
  const properties = (schema.properties ?? {}) as Record<string, unknown>
  return {
    ...schema,
    properties: {
      ...properties,
      includeSecrets: { type: 'boolean' },
    },
  }
}

export const emptyIncludeSecretsInputSchema = withIncludeSecrets({
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
})

export function createIdInputSchema(idKey: string) {
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
