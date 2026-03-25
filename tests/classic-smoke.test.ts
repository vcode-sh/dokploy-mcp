import { describe, expect, it } from 'vitest'

import { createClassicServer } from '../src/classic/server-classic.js'
import { allTools } from '../src/tools/index.js'

describe('classic smoke', () => {
  it('creates a classic server and preserves the classic tool surface', () => {
    const server = createClassicServer()
    expect(server).toBeDefined()
    expect(allTools.length).toBeGreaterThan(300)
  })
})
