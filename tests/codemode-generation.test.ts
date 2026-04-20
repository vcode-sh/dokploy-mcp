import { describe, expect, it } from 'vitest'

import {
  buildOpenApiIndex,
  buildProcedureSchemas,
  buildSdkDeclaration,
  buildSdkRuntime,
  countOperations,
  countPrimaryTags,
  getOpenApiSourceMetadata,
  loadRawSpec,
  resolveOpenApiSpec,
  v3ParityTarget,
} from '../scripts/v2/lib.mjs'
import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { procedureSchemas as generatedProcedureSchemas } from '../src/generated/dokploy-schemas.js'

describe('codemode generation', () => {
  it('resolves the current OpenAPI spec', () => {
    const resolved = resolveOpenApiSpec()
    expect(resolved.openapi).toBe('3.1.0')
    expect(typeof resolved.paths).toBe('object')
    expect(JSON.stringify(resolved)).not.toContain('"$ref"')
    expect(countOperations(resolved)).toBe(v3ParityTarget.operationCount)
  })

  it('builds an index that covers all operations', () => {
    const spec = resolveOpenApiSpec()
    const index = buildOpenApiIndex(spec)
    expect(index.endpointCount).toBe(countOperations(spec))
    expect(index.tagCount).toBe(countPrimaryTags(spec))
    expect(index.endpoints.length).toBe(index.endpointCount)
    expect(new Set(index.endpoints.map((entry) => entry.procedure)).size).toBe(index.endpointCount)
  })

  it('builds procedure schemas for known procedures', () => {
    const spec = resolveOpenApiSpec()
    const schemas = buildProcedureSchemas(spec)
    expect(schemas['project.all']).toBeDefined()
    expect(schemas['application.update']).toBeDefined()
    expect(schemas['libsql.create']).toBeDefined()
    expect(schemas['tag.all']).toBeDefined()
    expect(schemas['project.homeStats']).toBeDefined()
    expect(schemas['docker.startContainer']).toBeDefined()
    expect(schemas['stripe.updateInvoiceNotifications']).toBeDefined()
    expect(Object.keys(schemas)).toHaveLength(countOperations(spec))
    expect(Object.keys(generatedProcedureSchemas).sort()).toEqual(Object.keys(schemas).sort())
  })

  it('builds a typed SDK declaration containing known modules', () => {
    const spec = resolveOpenApiSpec()
    const schemas = buildProcedureSchemas(spec)
    const declaration = buildSdkDeclaration(schemas)
    const runtime = buildSdkRuntime(schemas)

    expect(declaration).toContain('export interface DokploySdk')
    expect(declaration).toContain('export function createGeneratedDokployRuntime')
    expect(declaration).toContain('application: {')
    expect(declaration).toContain('docker: {')
    expect(declaration).toContain('libsql: {')
    expect(declaration).toContain('project: {')
    expect(declaration).toContain('notification: {')
    expect(declaration).toContain('tag: {')

    for (const procedure of Object.keys(schemas)) {
      expect(declaration).toContain(JSON.stringify(procedure))
      expect(runtime).toContain(JSON.stringify(procedure))
    }
  })

  it('pins the vendored parity source metadata', () => {
    const raw = loadRawSpec()
    const metadata = getOpenApiSourceMetadata()

    expect(raw.info.version).toBe(v3ParityTarget.version)
    expect(metadata).toEqual({
      operationCount: v3ParityTarget.operationCount,
      relativePath: v3ParityTarget.source.relativePath,
      sha256: v3ParityTarget.source.sha256,
      tagCount: v3ParityTarget.tagCount,
      version: v3ParityTarget.version,
    })
  })

  it('keeps generated catalog and schemas aligned', () => {
    const proceduresFromCatalog = dokployCatalog.endpoints.map((entry) => entry.procedure).sort()
    const proceduresFromSchemas = Object.keys(generatedProcedureSchemas).sort()

    expect(dokployCatalog.endpointCount).toBe(v3ParityTarget.operationCount)
    expect(dokployCatalog.tagCount).toBe(v3ParityTarget.tagCount)
    expect(proceduresFromCatalog).toEqual(proceduresFromSchemas)

    for (const procedure of v3ParityTarget.extraOperations) {
      expect(proceduresFromCatalog).toContain(procedure)
      expect(proceduresFromSchemas).toContain(procedure)
    }
  })
})
