import { describe, expect, it } from 'vitest'

import { codeModeTools } from '../src/codemode/tools/index.js'

describe('codemode protocol budget', () => {
  it('keeps the codemode tools/list footprint below the target budget', () => {
    const payload = {
      tools: codeModeTools.map((tool) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        inputSchema: tool.schema,
        annotations: tool.annotations,
        execution: tool.execution,
      })),
    }

    const bytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')
    const approxTokens = Math.round(bytes / 4)

    expect(codeModeTools).toHaveLength(3)
    expect(bytes).toBeLessThan(8 * 1024)
    expect(approxTokens).toBeLessThan(2000)
  })
})
