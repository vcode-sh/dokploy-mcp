import { describe, expect, it } from 'vitest'
import { allTools } from '../src/tools/index.js'

describe('tool registration', () => {
  it('registers tools', () => {
    expect(allTools.length).toBeGreaterThan(0)
  })

  it('all tools have unique names', () => {
    const names = allTools.map((t) => t.name)
    const unique = new Set(names)
    expect(unique.size).toBe(names.length)

    // Report duplicates if any
    if (unique.size !== names.length) {
      const counts = new Map<string, number>()
      for (const name of names) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
      const dupes = [...counts.entries()].filter(([, c]) => c > 1)
      expect(dupes).toEqual([])
    }
  })

  it('all tools have required fields', () => {
    for (const tool of allTools) {
      expect(tool.name).toBeTruthy()
      expect(tool.title).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.endpoint).toBeTruthy()
      expect(tool.method).toMatch(/GET|POST/)
      expect(tool.schema).toBeTruthy()
      expect(tool.annotations).toBeTruthy()
      expect(typeof tool.handler).toBe('function')
    }
  })

  it('all tool names match naming convention', () => {
    const validPattern = /^dokploy_[a-z]+_[a-z_]+$/
    for (const tool of allTools) {
      expect(tool.name).toMatch(validPattern)
    }
  })

  it('all tool names start with dokploy_', () => {
    for (const tool of allTools) {
      expect(tool.name.startsWith('dokploy_')).toBe(true)
    }
  })

  it('database tools have correct count per type', () => {
    const dbTypes = ['postgres', 'mysql', 'mariadb', 'mongo', 'redis']
    for (const db of dbTypes) {
      const tools = allTools.filter((t) => t.name.startsWith(`dokploy_${db}_`))
      expect(tools).toHaveLength(14)
    }
  })

  it('destructive tools are annotated correctly', () => {
    const destructivePatterns = ['_remove', '_stop']
    for (const tool of allTools) {
      if (destructivePatterns.some((p) => tool.name.endsWith(p))) {
        // remove and stop should have destructiveHint on database tools
        if (tool.name.match(/^dokploy_(postgres|mysql|mariadb|mongo|redis)_/)) {
          expect(tool.annotations.destructiveHint).toBe(true)
        }
      }
    }
  })

  it('GET tools have readOnlyHint', () => {
    const readOnlyTools = allTools.filter((tool) => tool.method === 'GET')

    for (const tool of readOnlyTools) {
      expect(tool.annotations.readOnlyHint).toBe(true)
      expect(tool.annotations.idempotentHint).toBe(true)
    }
  })
})
