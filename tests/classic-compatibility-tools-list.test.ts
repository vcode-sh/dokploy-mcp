import { describe, expect, it } from 'vitest'

import { allTools } from '../src/tools/index.js'

describe('classic tools/list compatibility', () => {
  it('still exposes the legacy endpoint-based surface', () => {
    expect(allTools.length).toBeGreaterThan(300)
    expect(allTools.some((tool) => tool.name === 'dokploy_project_all')).toBe(true)
    expect(allTools.some((tool) => tool.name === 'search')).toBe(false)
    expect(allTools.some((tool) => tool.name === 'execute')).toBe(false)
  })
})
