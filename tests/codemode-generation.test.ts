import { describe, expect, it } from 'vitest'

import {
  buildOpenApiIndex,
  buildProcedureSchemas,
  buildSdkDeclaration,
  buildSdkRuntime,
  loadRawSpec,
  resolveOpenApiSpec,
} from '../scripts/v2/lib.mjs'
import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { procedureSchemas as generatedProcedureSchemas } from '../src/generated/dokploy-schemas.js'

describe('codemode generation', () => {
  it('resolves the current OpenAPI spec', () => {
    const resolved = resolveOpenApiSpec()
    expect(resolved.openapi).toBe('3.1.0')
    expect(typeof resolved.paths).toBe('object')
    expect(JSON.stringify(resolved)).not.toContain('"$ref"')
  })

  it('builds an index that covers all paths', () => {
    const spec = resolveOpenApiSpec()
    const index = buildOpenApiIndex(spec)
    expect(index.endpointCount).toBe(Object.keys(spec.paths).length)
    expect(index.endpoints.length).toBe(index.endpointCount)
    expect(new Set(index.endpoints.map((entry) => entry.procedure)).size).toBe(index.endpointCount)
  })

  it('builds procedure schemas for known procedures', () => {
    const spec = resolveOpenApiSpec()
    const schemas = buildProcedureSchemas(spec)
    expect(schemas['project.all']).toBeDefined()
    expect(schemas['application.update']).toBeDefined()
    expect(Object.keys(schemas)).toHaveLength(Object.keys(spec.paths).length)
    expect(Object.keys(generatedProcedureSchemas).sort()).toEqual(Object.keys(schemas).sort())
  })

  it('builds a typed SDK declaration containing known modules', () => {
    const spec = resolveOpenApiSpec()
    const schemas = buildProcedureSchemas(spec)
    const declaration = buildSdkDeclaration(schemas)
    const runtime = buildSdkRuntime(schemas)

    expect(declaration).toContain('export interface DokploySdk')
    expect(declaration).toContain('application: {')
    expect(declaration).toContain('project: {')
    expect(declaration).toContain('notification: {')

    for (const procedure of Object.keys(schemas)) {
      expect(declaration).toContain(JSON.stringify(procedure))
      expect(runtime).toContain(JSON.stringify(procedure))
    }
  })

  it('can load the raw spec envelope', () => {
    const raw = loadRawSpec()
    expect(raw.info.version).toBe('v0.28.8')
  })

  it('keeps generated catalog and schemas aligned', () => {
    const proceduresFromCatalog = dokployCatalog.endpoints.map((entry) => entry.procedure).sort()
    const proceduresFromSchemas = Object.keys(generatedProcedureSchemas).sort()

    expect(proceduresFromCatalog).toEqual(proceduresFromSchemas)
  })
})
