import { describe, expect, it } from 'vitest'

import { runSandboxedFunction } from '../src/codemode/sandbox/runner.js'

describe('sandbox code wrapping', () => {
  it('auto-returns expressions with nested callback returns', async () => {
    const result = await runSandboxedFunction({
      code: '[1, 2, 3].filter((n) => { return n > 1 })',
      context: {},
    })

    expect(result.result).toEqual([2, 3])
  })

  it('auto-returns expressions containing the word return in a string', async () => {
    const result = await runSandboxedFunction({
      code: "'return'.length",
      context: {},
    })

    expect(result.result).toBe(6)
  })

  it('uses explicit top-level returns in multi-statement code', async () => {
    const result = await runSandboxedFunction({
      code: 'const a = 2\nreturn a * 2',
      context: {},
    })

    expect(result.result).toBe(4)
  })

  it('auto-returns single raw expressions', async () => {
    const result = await runSandboxedFunction({
      code: '1 + 1',
      context: {},
    })

    expect(result.result).toBe(2)
  })

  it('passes through async arrow functions', async () => {
    const result = await runSandboxedFunction({
      code: "async () => 'ok'",
      context: {},
    })

    expect(result.result).toBe('ok')
  })

  it('runs statement code without a top-level return and reports a null result', async () => {
    const result = await runSandboxedFunction({
      code: 'const x = 1; console.log(x)',
      context: {},
    })

    expect(result.result).toBeNull()
    expect(result.logs).toContain('1')
  })
})
