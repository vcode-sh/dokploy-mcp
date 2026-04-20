import { z } from 'zod'

type JsonSchema = Record<string, unknown>
type LiteralValue = string | number | boolean | null

const MAX_ANY_OF_VARIANTS = 8

function asJsonSchema(value: unknown): JsonSchema | null {
  return typeof value === 'object' && value !== null ? (value as JsonSchema) : null
}

function describeSchema<T extends z.ZodTypeAny>(schema: T, jsonSchema: JsonSchema): T {
  const description =
    typeof jsonSchema.description === 'string'
      ? jsonSchema.description
      : typeof jsonSchema.title === 'string'
        ? jsonSchema.title
        : undefined

  return description ? schema.describe(description) : schema
}

function withNullVariant(schema: z.ZodTypeAny) {
  return z.union([schema, z.null()])
}

function createEnumSchema(values: unknown[]) {
  const stringValues = values.filter((value): value is string => typeof value === 'string')
  if (stringValues.length === values.length && stringValues.length > 0) {
    if (stringValues.length === 1) {
      return z.literal(stringValues[0])
    }

    const [firstValue, ...restValues] = stringValues as [string, ...string[]]
    return z.enum([firstValue, ...restValues])
  }

  const literalValues = values.filter(
    (value): value is LiteralValue =>
      value === null || ['string', 'number', 'boolean'].includes(typeof value),
  )

  return z.any().refine((value) => literalValues.some((candidate) => Object.is(candidate, value)), {
    message: `Expected one of ${literalValues.map((value) => JSON.stringify(value)).join(', ')}`,
  })
}

function createAnyOfSchema(variants: unknown[]) {
  const limitedVariants = variants.slice(0, MAX_ANY_OF_VARIANTS)
  const nonNullSchemas = limitedVariants
    .filter((variant) => asJsonSchema(variant)?.type !== 'null')
    .map((variant) => jsonSchemaToZod(variant))
  const hasNullSchema = nonNullSchemas.length !== limitedVariants.length

  if (nonNullSchemas.length === 0) {
    return hasNullSchema ? z.null() : z.unknown()
  }

  const [firstSchema, secondSchema, ...restSchemas] = nonNullSchemas as [
    z.ZodTypeAny,
    ...z.ZodTypeAny[],
  ]
  const unionBase = secondSchema
    ? z.union([firstSchema, secondSchema, ...restSchemas])
    : firstSchema

  return hasNullSchema ? withNullVariant(unionBase) : unionBase
}

function createStringSchema(jsonSchema: JsonSchema) {
  let schema = z.string()

  if (typeof jsonSchema.minLength === 'number') {
    schema = schema.min(jsonSchema.minLength)
  }

  if (typeof jsonSchema.maxLength === 'number') {
    schema = schema.max(jsonSchema.maxLength)
  }

  if (typeof jsonSchema.pattern === 'string') {
    schema = schema.regex(new RegExp(jsonSchema.pattern))
  }

  if (jsonSchema.format === 'email') {
    schema = schema.email()
  }

  if (jsonSchema.format === 'uri') {
    schema = schema.url()
  }

  return schema
}

function createNumberSchema(jsonSchema: JsonSchema) {
  let schema = z.number()

  if (jsonSchema.type === 'integer') {
    schema = schema.int()
  }

  if (typeof jsonSchema.minimum === 'number') {
    schema = schema.min(jsonSchema.minimum)
  }

  if (typeof jsonSchema.maximum === 'number') {
    schema = schema.max(jsonSchema.maximum)
  }

  return schema
}

function createArraySchema(jsonSchema: JsonSchema) {
  let schema = z.array(jsonSchemaToZod(jsonSchema.items))

  if (typeof jsonSchema.minItems === 'number') {
    schema = schema.min(jsonSchema.minItems)
  }

  if (typeof jsonSchema.maxItems === 'number') {
    schema = schema.max(jsonSchema.maxItems)
  }

  return schema
}

function createObjectShape(properties: unknown, requiredKeys: Set<string>) {
  const shape: Record<string, z.ZodTypeAny> = {}
  const objectProperties = asJsonSchema(properties)

  if (!objectProperties) {
    return shape
  }

  for (const [key, value] of Object.entries(objectProperties)) {
    const childSchema = jsonSchemaToZod(value)
    shape[key] = requiredKeys.has(key) ? childSchema : childSchema.optional()
  }

  return shape
}

function createObjectSchema(jsonSchema: JsonSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const required = Array.isArray(jsonSchema.required) ? jsonSchema.required : []
  const requiredKeys = new Set(required.filter((key): key is string => typeof key === 'string'))
  const shape = createObjectShape(jsonSchema.properties, requiredKeys)

  let schema = z.object(shape)
  const additionalProperties = jsonSchema.additionalProperties

  if (additionalProperties === false) {
    schema = schema.strict()
  } else if (asJsonSchema(additionalProperties)) {
    schema = schema.catchall(jsonSchemaToZod(additionalProperties))
  } else {
    schema = schema.passthrough()
  }

  return schema
}

export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  const jsonSchema = asJsonSchema(schema)
  if (!jsonSchema) {
    return z.unknown()
  }

  if (Array.isArray(jsonSchema.anyOf)) {
    return describeSchema(createAnyOfSchema(jsonSchema.anyOf), jsonSchema)
  }

  if (Array.isArray(jsonSchema.enum) && jsonSchema.enum.length > 0) {
    return describeSchema(createEnumSchema(jsonSchema.enum), jsonSchema)
  }

  switch (jsonSchema.type) {
    case 'string':
      return describeSchema(createStringSchema(jsonSchema), jsonSchema)
    case 'number':
    case 'integer':
      return describeSchema(createNumberSchema(jsonSchema), jsonSchema)
    case 'boolean':
      return describeSchema(z.boolean(), jsonSchema)
    case 'null':
      return describeSchema(z.null(), jsonSchema)
    case 'array':
      return describeSchema(createArraySchema(jsonSchema), jsonSchema)
    case 'object':
      return describeSchema(createObjectSchema(jsonSchema), jsonSchema)
    default:
      return z.unknown()
  }
}

export function jsonSchemaToZodObject(schema: unknown) {
  const jsonSchema = asJsonSchema(schema)

  if (jsonSchema?.type === 'object') {
    return createObjectSchema(jsonSchema)
  }

  return z.object({}).passthrough()
}
