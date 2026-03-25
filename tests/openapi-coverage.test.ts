import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { allTools } from '../src/tools/index.js'

const BASELINE_IMPLEMENTED_SPEC_ENDPOINTS = 377
const BASELINE_MISSING_SPEC_ENDPOINTS = 86
const OPENAPI_PATH = '.openapi/openapi'

const hasOpenApiSpec = existsSync(OPENAPI_PATH)

function readOpenApiPaths(): string[] {
  const raw = readFileSync(OPENAPI_PATH, 'utf8')
  const spec = JSON.parse(raw) as {
    result: {
      data: {
        json: {
          paths: Record<string, unknown>
        }
      }
    }
  }

  return Object.keys(spec.result.data.json.paths)
}

describe.skipIf(!hasOpenApiSpec)('OpenAPI coverage guard', () => {
  it('does not register endpoints that are absent from the OpenAPI spec', () => {
    const specEndpoints = new Set(readOpenApiPaths())
    const extraEndpoints = allTools
      .map((tool) => tool.endpoint)
      .filter((endpoint): endpoint is string => Boolean(endpoint))
      .filter((endpoint) => !specEndpoints.has(endpoint))

    expect(extraEndpoints).toEqual([])
  })

  it('does not reduce implemented OpenAPI coverage', () => {
    const specEndpoints = new Set(readOpenApiPaths())
    const implementedSpecEndpoints = allTools
      .map((tool) => tool.endpoint)
      .filter((endpoint): endpoint is string => Boolean(endpoint))
      .filter((endpoint) => specEndpoints.has(endpoint))

    const missingSpecEndpoints = [...specEndpoints].filter(
      (endpoint) => !implementedSpecEndpoints.includes(endpoint),
    )

    expect(implementedSpecEndpoints.length).toBeGreaterThanOrEqual(
      BASELINE_IMPLEMENTED_SPEC_ENDPOINTS,
    )
    expect(missingSpecEndpoints.length).toBeLessThanOrEqual(BASELINE_MISSING_SPEC_ENDPOINTS)
  })
})
