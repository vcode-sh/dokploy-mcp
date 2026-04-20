import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..', '..')
const defaultOpenApiSourcePath = path.join(rootDir, 'scripts', 'v2', 'official-openapi-root.json')
const legacyOpenApiSourcePath = path.join(rootDir, '.openapi', 'openapi')
const generatedDir = path.join(rootDir, 'src', 'generated')
const httpMethods = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'])

export const v3ParityTarget = Object.freeze({
  version: '1.0.0',
  operationCount: 524,
  tagCount: 48,
  extraOperations: [
    'docker.startContainer',
    'docker.stopContainer',
    'docker.killContainer',
    'project.homeStats',
    'stripe.updateInvoiceNotifications',
  ],
  source: Object.freeze({
    relativePath: 'scripts/v2/official-openapi-root.json',
    repository: 'https://github.com/Dokploy/mcp',
    commit: '0dcb4c0f19eb395cba8830f791b108a52eda8caa',
    sha256: 'e70b058584ce1cab1f4b08abed11e2c96f4fac2fedcb16062a5ddd4fa6394e3e',
  }),
})

function resolveOpenApiSourcePath() {
  const configuredPath = process.env.DOKPLOY_OPENAPI_SOURCE?.trim()
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(rootDir, configuredPath)
  }

  if (fs.existsSync(defaultOpenApiSourcePath)) {
    return defaultOpenApiSourcePath
  }

  return legacyOpenApiSourcePath
}

function normalizeOpenApiSource(parsed) {
  if (
    parsed &&
    typeof parsed === 'object' &&
    typeof parsed.openapi === 'string' &&
    parsed.paths &&
    typeof parsed.paths === 'object'
  ) {
    return parsed
  }

  const envelopeSpec = parsed?.result?.data?.json
  if (envelopeSpec && typeof envelopeSpec === 'object') {
    return envelopeSpec
  }

  throw new Error('Unsupported OpenAPI source format')
}

function getPrimaryTag(op) {
  return op.tags?.[0] ?? 'other'
}

function isHttpMethod(key) {
  return httpMethods.has(key.toLowerCase())
}

function listOperations(spec) {
  const operations = []

  for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(pathItem ?? {})) {
      if (!isHttpMethod(method)) continue
      operations.push({
        method: method.toUpperCase(),
        op,
        pathKey,
      })
    }
  }

  return operations
}

function dereferencePath(root, ref) {
  const segments = ref.replace(/^#\//, '').split('/')
  let current = root
  for (const segment of segments) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~')
    current = current?.[key]
  }
  return current
}

function resolveNode(node, root, stack = new Set()) {
  if (Array.isArray(node)) {
    return node.map((entry) => resolveNode(entry, root, stack))
  }

  if (!node || typeof node !== 'object') {
    return node
  }

  if ('$ref' in node && typeof node.$ref === 'string' && node.$ref.startsWith('#/')) {
    const ref = node.$ref
    if (stack.has(ref)) {
      return { ...node }
    }

    const target = dereferencePath(root, ref)
    if (target === undefined) {
      throw new Error(`Could not resolve OpenAPI ref: ${ref}`)
    }

    stack.add(ref)
    const resolvedTarget = resolveNode(target, root, stack)
    stack.delete(ref)

    const siblings = { ...node }
    delete siblings.$ref

    if (Object.keys(siblings).length === 0) {
      return resolvedTarget
    }

    if (
      resolvedTarget &&
      typeof resolvedTarget === 'object' &&
      !Array.isArray(resolvedTarget) &&
      siblings &&
      typeof siblings === 'object'
    ) {
      return resolveNode({ ...resolvedTarget, ...siblings }, root, stack)
    }

    return resolvedTarget
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [key, resolveNode(value, root, stack)]),
  )
}

export function ensureGeneratedDir() {
  fs.mkdirSync(generatedDir, { recursive: true })
}

export function loadRawSpec() {
  const raw = fs.readFileSync(resolveOpenApiSourcePath(), 'utf8')
  const parsed = JSON.parse(raw)
  return normalizeOpenApiSource(parsed)
}

export function loadResolvedSpec() {
  const raw = fs.readFileSync(path.join(generatedDir, 'openapi-resolved.json'), 'utf8')
  return JSON.parse(raw)
}

export function countOperations(spec) {
  return listOperations(spec).length
}

export function countPrimaryTags(spec) {
  const tags = new Set()

  for (const { op } of listOperations(spec)) {
    tags.add(getPrimaryTag(op))
  }

  return tags.size
}

export function getOpenApiSourceMetadata() {
  const sourcePath = resolveOpenApiSourcePath()
  const raw = fs.readFileSync(sourcePath, 'utf8')
  const parsed = JSON.parse(raw)
  const spec = normalizeOpenApiSource(parsed)

  return {
    operationCount: countOperations(spec),
    relativePath: path.relative(rootDir, sourcePath),
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    tagCount: countPrimaryTags(spec),
    version: spec.info?.version ?? 'unknown',
  }
}

export function resolveOpenApiSpec() {
  const rawSpec = loadRawSpec()
  return resolveNode(rawSpec, rawSpec)
}

export function writeJson(relativePath, value) {
  ensureGeneratedDir()
  const filePath = path.join(generatedDir, relativePath)
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  return filePath
}

export function writeText(relativePath, value) {
  ensureGeneratedDir()
  const filePath = path.join(generatedDir, relativePath)
  fs.writeFileSync(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8')
  return filePath
}

function getInputMetadata(op, method) {
  if (method === 'GET') {
    const parameters = op.parameters ?? []
    const required = parameters.filter((parameter) => parameter.required).map((parameter) => parameter.name)
    const optional = parameters
      .filter((parameter) => !parameter.required)
      .map((parameter) => parameter.name)
    return {
      inputKind: 'query',
      required,
      optional,
      schema: {
        type: 'object',
        properties: Object.fromEntries(
          parameters.map((parameter) => [parameter.name, parameter.schema ?? { type: 'unknown' }]),
        ),
        required,
      },
    }
  }

  const schema = op.requestBody?.content?.['application/json']?.schema ?? {
    type: 'object',
    properties: {},
    required: [],
  }
  const properties = schema.properties ?? {}
  const required = [...(schema.required ?? [])]
  const optional = Object.keys(properties).filter((key) => !required.includes(key))

  return {
    inputKind: 'body',
    required,
    optional,
    schema,
  }
}

function summarizeSchema(schema) {
  if (!schema || typeof schema !== 'object') return { type: 'unknown', keys: [] }
  if (schema.type === 'object' && schema.properties) {
    return { type: 'object', keys: Object.keys(schema.properties) }
  }
  if (schema.type === 'array') {
    return { type: 'array', keys: [] }
  }
  if (schema.anyOf) {
    return { type: 'union', keys: [] }
  }
  return { type: schema.type ?? 'unknown', keys: [] }
}

export function buildOpenApiIndex(spec) {
  const endpoints = []
  const byTag = {}
  const byProcedure = {}
  const byPath = {}

  for (const { method, op, pathKey } of listOperations(spec)) {
    const tag = getPrimaryTag(op)
    const procedure = pathKey.replace(/^\//, '')
    const input = getInputMetadata(op, method)
    const responseSchema =
      op.responses?.['200']?.content?.['application/json']?.schema ??
      op.responses?.['201']?.content?.['application/json']?.schema ??
      null

    if (byProcedure[procedure] !== undefined) {
      throw new Error(`Duplicate generated procedure: ${procedure}`)
    }

    if (byPath[pathKey] !== undefined) {
      throw new Error(`Duplicate generated path: ${pathKey}`)
    }

    const entry = {
      procedure,
      method,
      path: pathKey,
      tag,
      summary: op.summary ?? null,
      description: op.description ?? null,
      inputKind: input.inputKind,
      requiredInputs: input.required,
      optionalInputs: input.optional,
      response: summarizeSchema(responseSchema),
    }

    const index = endpoints.push(entry) - 1
    byProcedure[procedure] = index
    byPath[pathKey] = index
    byTag[tag] ??= []
    byTag[tag].push(index)
  }

  return {
    version: spec.info?.version ?? 'unknown',
    endpointCount: endpoints.length,
    tagCount: Object.keys(byTag).length,
    endpoints,
    byTag,
    byProcedure,
    byPath,
  }
}

export function buildProcedureSchemas(spec) {
  const procedures = {}

  for (const { method, op, pathKey } of listOperations(spec)) {
    const procedure = pathKey.replace(/^\//, '')
    const input = getInputMetadata(op, method)
    const outputSchema =
      op.responses?.['200']?.content?.['application/json']?.schema ??
      op.responses?.['201']?.content?.['application/json']?.schema ??
      null

    if (procedures[procedure]) {
      throw new Error(`Duplicate generated procedure schema: ${procedure}`)
    }

    procedures[procedure] = {
      method,
      path: pathKey,
      tag: getPrimaryTag(op),
      inputKind: input.inputKind,
      inputSchema: input.schema,
      outputSchema,
    }
  }
  return procedures
}

function schemaToTs(schema, depth = 0) {
  if (!schema || typeof schema !== 'object') return 'unknown'
  if (depth > 4) return 'unknown'

  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    const members = schema.anyOf.map((entry) => schemaToTs(entry, depth + 1))
    return [...new Set(members)].join(' | ')
  }

  if (schema.enum && Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(' | ')
  }

  if (schema.type === 'string') return 'string'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'null') return 'null'

  if (schema.type === 'array') {
    return `Array<${schemaToTs(schema.items, depth + 1)}>`
  }

  if (schema.type === 'object') {
    if (schema.properties && typeof schema.properties === 'object') {
      const required = new Set(schema.required ?? [])
      const fields = Object.entries(schema.properties).map(([key, value]) => {
        const optionalMark = required.has(key) ? '' : '?'
        return `${JSON.stringify(key)}${optionalMark}: ${schemaToTs(value, depth + 1)}`
      })

      if (fields.length === 0) {
        if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          return `Record<string, ${schemaToTs(schema.additionalProperties, depth + 1)}>`
        }
        return 'Record<string, unknown>'
      }

      return `{ ${fields.join('; ')} }`
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      return `Record<string, ${schemaToTs(schema.additionalProperties, depth + 1)}>`
    }

    return 'Record<string, unknown>'
  }

  return 'unknown'
}

function toIdentifier(value) {
  return value.replace(/[^a-zA-Z0-9_$]/g, '_')
}

export function buildSdkDeclaration(procedureSchemas) {
  const modules = new Map()

  for (const procedure of Object.keys(procedureSchemas).sort()) {
    const [moduleName, actionName] = procedure.split('.', 2)
    const inputTypeName = `${toIdentifier(procedure)}_Input`
    const outputTypeName = `${toIdentifier(procedure)}_Output`
    const { inputSchema, outputSchema } = procedureSchemas[procedure]
    const moduleEntries = modules.get(moduleName) ?? []

    moduleEntries.push({
      actionName,
      procedure,
      inputTypeName,
      outputTypeName,
    })
    modules.set(moduleName, moduleEntries)
  }

  const lines = []
  lines.push('// Generated by scripts/v2/build-sandbox-sdk.mjs')
  lines.push('')
  lines.push('export type JsonValue =')
  lines.push('  | string')
  lines.push('  | number')
  lines.push('  | boolean')
  lines.push('  | null')
  lines.push('  | JsonValue[]')
  lines.push('  | { [key: string]: JsonValue }')
  lines.push('')

  for (const procedure of Object.keys(procedureSchemas).sort()) {
    const inputTypeName = `${toIdentifier(procedure)}_Input`
    const outputTypeName = `${toIdentifier(procedure)}_Output`
    const { inputSchema, outputSchema } = procedureSchemas[procedure]
    lines.push(`export type ${inputTypeName} = ${schemaToTs(inputSchema)}`)
    lines.push(`export type ${outputTypeName} = ${schemaToTs(outputSchema)}`)
    lines.push('')
  }

  lines.push('export interface DokployProcedureMap {')
  for (const procedure of Object.keys(procedureSchemas).sort()) {
    const inputTypeName = `${toIdentifier(procedure)}_Input`
    const outputTypeName = `${toIdentifier(procedure)}_Output`
    lines.push(`  ${JSON.stringify(procedure)}: { input: ${inputTypeName}; output: ${outputTypeName} }`)
  }
  lines.push('}')
  lines.push('')
  lines.push('export interface DokploySdk {')
  lines.push(
    "  call<P extends keyof DokployProcedureMap>(procedure: P, input: DokployProcedureMap[P]['input']): Promise<DokployProcedureMap[P]['output']>",
  )
  for (const [moduleName, actions] of [...modules.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`  ${moduleName}: {`)
    for (const action of actions) {
      lines.push(
        `    ${action.actionName}(input: ${action.inputTypeName}): Promise<${action.outputTypeName}>`,
      )
    }
    lines.push('  }')
  }
  lines.push('}')
  lines.push('')
  lines.push(
    "export function createGeneratedDokployRuntime(call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>): DokploySdk",
  )
  lines.push('')

  return lines.join('\n')
}

export function buildSdkRuntime(procedureSchemas) {
  const modules = new Map()

  for (const procedure of Object.keys(procedureSchemas).sort()) {
    const [moduleName, actionName] = procedure.split('.', 2)
    if (!(moduleName && actionName)) continue
    const moduleEntries = modules.get(moduleName) ?? []
    moduleEntries.push({ procedure, actionName })
    modules.set(moduleName, moduleEntries)
  }

  const lines = []
  lines.push('// Generated by scripts/v2/build-sandbox-sdk.mjs')
  lines.push('')
  lines.push(
    "export function createGeneratedDokployRuntime(call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>) {",
  )
  lines.push('  return {')
  lines.push('    call,')
  for (const [moduleName, entries] of [...modules.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`    ${moduleName}: {`)
    for (const entry of entries) {
      lines.push(`      ${entry.actionName}: (input = {}) => call(${JSON.stringify(entry.procedure)}, input),`)
    }
    lines.push('    },')
  }
  lines.push('  }')
  lines.push('}')
  lines.push('')

  return lines.join('\n')
}

export function buildCatalogTs() {
  return [
    '// Generated by scripts/v2/build-openapi-index.mjs',
    "import openapiIndex from './openapi-index.json' with { type: 'json' }",
    '',
    'export interface CatalogEndpoint {',
    '  procedure: string',
    '  method: string',
    '  path: string',
    '  tag: string',
    '  summary: string | null',
    '  description: string | null',
    "  inputKind: 'query' | 'body'",
    '  requiredInputs: string[]',
    '  optionalInputs: string[]',
    '  response: { type: string; keys: string[] }',
    '}',
    '',
    'export interface DokployCatalog {',
    '  version: string',
    '  endpointCount: number',
    '  tagCount: number',
    '  endpoints: CatalogEndpoint[]',
    '  byTag: Record<string, number[]>',
    '  byProcedure: Record<string, number>',
    '  byPath: Record<string, number>',
    '}',
    '',
    'export const dokployCatalog = openapiIndex as DokployCatalog',
    '',
    'export function getCatalogEndpoint(id: string) {',
    '  const byProcedureIndex = dokployCatalog.byProcedure[id]',
    "  if (byProcedureIndex !== undefined) return dokployCatalog.endpoints[byProcedureIndex]",
    '  const byPathIndex = dokployCatalog.byPath[id]',
    "  if (byPathIndex !== undefined) return dokployCatalog.endpoints[byPathIndex]",
    '  return undefined',
    '}',
    '',
    'export function getCatalogEndpointsByTag(tag: string) {',
    '  const indexes = dokployCatalog.byTag[tag] ?? []',
    '  return indexes.map((index) => dokployCatalog.endpoints[index]).filter(Boolean)',
    '}',
  ].join('\n')
}

export function buildSchemasTs(procedureSchemas) {
  return [
    '// Generated by scripts/v2/build-runtime-schemas.mjs',
    'export type JsonSchema = Record<string, unknown> | null',
    '',
    'export interface ProcedureSchema {',
    "  method: 'GET' | 'POST'",
    '  path: string',
    '  tag: string',
    "  inputKind: 'query' | 'body'",
    '  inputSchema: JsonSchema',
    '  outputSchema: JsonSchema',
    '}',
    '',
    `export const procedureSchemas: Record<string, ProcedureSchema> = ${JSON.stringify(procedureSchemas, null, 2)}`,
    '',
    'export type ProcedureSchemas = typeof procedureSchemas',
  ].join('\n')
}
