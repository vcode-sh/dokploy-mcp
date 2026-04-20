import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  buildCatalogTs,
  buildOpenApiIndex,
  buildProcedureSchemas,
  buildSchemasTs,
  buildSdkDeclaration,
  buildSdkRuntime,
  resolveOpenApiSpec,
  v3ParityTarget,
} from '../scripts/v2/lib.mjs'
import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { procedureSchemas } from '../src/generated/dokploy-schemas.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function withTrailingNewline(value) {
  return value.endsWith('\n') ? value : `${value}\n`
}

describe('codemode generation parity', () => {
  it('keeps generated artifacts in sync with the current builders', () => {
    const spec = resolveOpenApiSpec()
    const builtSchemas = buildProcedureSchemas(spec)
    const expectedArtifacts = new Map([
      ['src/generated/openapi-resolved.json', withTrailingNewline(JSON.stringify(spec, null, 2))],
      [
        'src/generated/openapi-index.json',
        withTrailingNewline(JSON.stringify(buildOpenApiIndex(spec), null, 2)),
      ],
      ['src/generated/dokploy-catalog.ts', withTrailingNewline(buildCatalogTs())],
      ['src/generated/dokploy-schemas.ts', withTrailingNewline(buildSchemasTs(builtSchemas))],
      ['src/generated/dokploy-sdk.d.ts', withTrailingNewline(buildSdkDeclaration(builtSchemas))],
      ['src/generated/dokploy-sdk.ts', withTrailingNewline(buildSdkRuntime(builtSchemas))],
    ])

    for (const [relativePath, expectedContents] of expectedArtifacts) {
      expect(readText(relativePath)).toBe(expectedContents)
    }
  })

  it('includes the root-only parity procedures called out in the v3 audit', () => {
    const proceduresFromCatalog = new Set(dokployCatalog.endpoints.map((entry) => entry.procedure))
    const proceduresFromSchemas = new Set(Object.keys(procedureSchemas))

    expect(v3ParityTarget.extraOperations).toEqual([
      'docker.startContainer',
      'docker.stopContainer',
      'docker.killContainer',
      'project.homeStats',
      'stripe.updateInvoiceNotifications',
    ])

    for (const procedure of v3ParityTarget.extraOperations) {
      expect(proceduresFromCatalog.has(procedure)).toBe(true)
      expect(proceduresFromSchemas.has(procedure)).toBe(true)
    }
  })
})
