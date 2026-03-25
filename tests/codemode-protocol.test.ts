import { describe, expect, it } from 'vitest'

import { createClassicServer } from '../src/classic/server-classic.js'
import { createCodeModeServer } from '../src/codemode/server-codemode.js'
import { codeModeTools } from '../src/codemode/tools/index.js'
import { allTools } from '../src/tools/index.js'

describe('protocol surfaces', () => {
  it('classic surface remains large', () => {
    expect(allTools.length).toBeGreaterThan(300)
    expect(allTools.some((tool) => tool.name === 'dokploy_project_all')).toBe(true)
  })

  it('codemode surface is intentionally tiny', () => {
    expect(codeModeTools.map((tool) => tool.name)).toEqual(['search', 'execute'])
  })

  it('creates both classic and codemode server instances', () => {
    const classicServer = createClassicServer()
    const codeModeServer = createCodeModeServer()

    expect(classicServer).toBeDefined()
    expect(codeModeServer).toBeDefined()
  })
})
