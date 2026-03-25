import { describe, expect, it } from 'vitest'

import {
  buildCatalogTs,
  buildOpenApiIndex,
  buildProcedureSchemas,
  buildSchemasTs,
  buildSdkDeclaration,
  buildSdkRuntime,
  resolveOpenApiSpec,
} from '../scripts/v2/lib.mjs'

describe('codemode generation stability', () => {
  it('builds identical outputs across repeated runs', () => {
    const specA = resolveOpenApiSpec()
    const specB = resolveOpenApiSpec()

    const indexA = buildOpenApiIndex(specA)
    const indexB = buildOpenApiIndex(specB)
    expect(indexA).toEqual(indexB)

    const schemasA = buildProcedureSchemas(specA)
    const schemasB = buildProcedureSchemas(specB)
    expect(schemasA).toEqual(schemasB)

    expect(buildCatalogTs()).toBe(buildCatalogTs())
    expect(buildSdkDeclaration(schemasA)).toBe(buildSdkDeclaration(schemasB))
    expect(buildSdkRuntime(schemasA)).toBe(buildSdkRuntime(schemasB))
    expect(buildSchemasTs(schemasA)).toBe(buildSchemasTs(schemasB))
  })
})
