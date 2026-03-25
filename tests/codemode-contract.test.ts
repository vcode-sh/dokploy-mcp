import { describe, expect, it } from 'vitest'

import { codeModeTools } from '../src/codemode/tools/index.js'

describe('codemode contract', () => {
  it('freezes the public codemode tool contract', () => {
    const publicTools = codeModeTools.map((tool) => ({
      name: tool.name,
      title: tool.title,
      description: tool.description,
      keys: Object.keys(tool.schema.shape ?? {}).sort(),
      method: tool.method,
      readOnlyHint: tool.annotations.readOnlyHint ?? null,
      idempotentHint: tool.annotations.idempotentHint ?? null,
      openWorldHint: tool.annotations.openWorldHint ?? null,
    }))

    expect(publicTools).toEqual([
      {
        name: 'search',
        title: 'Search Dokploy API',
        description:
          'Search the Dokploy API catalog by executing sandboxed code against a compact API index.',
        keys: ['code'],
        method: undefined,
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      {
        name: 'execute',
        title: 'Execute Dokploy Workflow',
        description: 'Execute a sandboxed Dokploy workflow against the generated Dokploy SDK.',
        keys: ['code'],
        method: undefined,
        readOnlyHint: null,
        idempotentHint: null,
        openWorldHint: true,
      },
    ])
  })
})
