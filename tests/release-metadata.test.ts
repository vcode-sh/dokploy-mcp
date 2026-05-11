import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { SERVER_VERSION } from '../src/version.js'

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')) as T
}

type PackageJson = {
  name: string
  version: string
  mcpName?: string
}

type ServerJson = {
  name: string
  version: string
  packages?: Array<{
    identifier: string
    version: string
  }>
}

describe('release metadata', () => {
  it('keeps package.json and server.json aligned for MCP Registry publishing', () => {
    const packageJson = readJson<PackageJson>('package.json')
    const serverJson = readJson<ServerJson>('server.json')

    expect(SERVER_VERSION).toBe(packageJson.version)
    expect(packageJson.mcpName).toBe(serverJson.name)
    expect(packageJson.version).toBe(serverJson.version)
    expect(serverJson.packages?.length).toBeGreaterThan(0)
    expect(serverJson.packages?.[0]).toMatchObject({
      identifier: packageJson.name,
      version: packageJson.version,
    })
  })
})
