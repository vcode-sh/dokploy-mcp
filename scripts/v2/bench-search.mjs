#!/usr/bin/env node

import { performance } from 'node:perf_hooks'

import { searchTool } from '../../dist/codemode/tools/search.js'

const SAMPLE_COUNT = 10

function round(value) {
  return Math.round(value * 100) / 100
}

function summarizeSamples(samples) {
  const sorted = [...samples].sort((left, right) => left - right)
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0

  return {
    samples: sorted.map((value) => round(value)),
    p50: round(p50),
    p95: round(p95),
    max: round(sorted[sorted.length - 1] ?? 0),
  }
}

async function run(label, code) {
  const durations = []
  let lastResult

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now()
    lastResult = await searchTool.handler({ code })
    const finishedAt = performance.now()
    durations.push(finishedAt - startedAt)
  }

  return {
    label,
    ...summarizeSamples(durations),
    isError: lastResult?.isError === true,
    resultBytes: Buffer.byteLength(lastResult?.content[0]?.text ?? '', 'utf8'),
  }
}

const scenarios = [
  await run('broad-free-text', 'async ({ catalog }) => catalog.searchText("app")'),
  await run(
    'narrow-tag-query',
    'async ({ catalog }) => catalog.getByTag("application").slice(0, 10).map((entry) => entry.procedure)',
  ),
]

console.log(JSON.stringify({ scenarios }, null, 2))
