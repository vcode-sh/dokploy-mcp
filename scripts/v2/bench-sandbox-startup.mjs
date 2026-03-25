#!/usr/bin/env node

import { performance } from 'node:perf_hooks'

import { runSandboxedFunction } from '../../dist/codemode/sandbox/runner.js'

const samples = []
for (let index = 0; index < 10; index += 1) {
  const startedAt = performance.now()
  await runSandboxedFunction({
    code: 'async () => ({ ok: true })',
    context: {},
  })
  const finishedAt = performance.now()
  samples.push(finishedAt - startedAt)
}

const sorted = [...samples].sort((a, b) => a - b)
const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0
const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0

console.log(
  JSON.stringify(
    {
      samples: sorted.map((value) => Math.round(value * 100) / 100),
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
    },
    null,
    2,
  ),
)
