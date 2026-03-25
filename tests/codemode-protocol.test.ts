import { describe, expect, it } from 'vitest'

import { createCodeModeServer } from '../src/codemode/server-codemode.js'
import { codeModeTools } from '../src/codemode/tools/index.js'

describe('protocol surfaces', () => {
  it('codemode surface is intentionally tiny', () => {
    expect(codeModeTools.map((tool) => tool.name)).toEqual(['search', 'execute'])
  })

  it('creates the codemode server instance', () => {
    const codeModeServer = createCodeModeServer()

    expect(codeModeServer).toBeDefined()
  })
})
