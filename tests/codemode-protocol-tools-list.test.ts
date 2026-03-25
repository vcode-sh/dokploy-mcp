import { describe, expect, it } from 'vitest'

import { codeModeTools } from '../src/codemode/tools/index.js'

describe('codemode tools/list contract', () => {
  it('exposes only the fixed codemode surface', () => {
    expect(codeModeTools).toHaveLength(2)
    expect(codeModeTools.map((tool) => tool.name)).toEqual(['search', 'execute'])
  })
})
