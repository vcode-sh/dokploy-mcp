#!/usr/bin/env node

import { performance } from 'node:perf_hooks'

import { runExecuteWithHost } from '../../dist/codemode/tools/execute.js'

const SAMPLE_COUNT = 10

const code = `
async ({ dokploy, helpers }) => {
  const projects = await dokploy.project.search({ limit: 5 })
  helpers.assert(projects && typeof projects === 'object', 'Expected search result')
  helpers.assert(Array.isArray(projects.items) && projects.items.length > 0, 'Expected a project')
  const project = helpers.selectOne(projects.items)
  const environments = await dokploy.environment.byProjectId({ projectId: project.projectId })
  return {
    total: projects.total ?? null,
    environmentCount: Array.isArray(environments) ? environments.length : 0,
  }
}
`.trim()

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

function createHost() {
  const calls = []

  return {
    async call(procedure, input = {}) {
      calls.push({ procedure, input })

      switch (procedure) {
        case 'project.search':
          return {
            data: { items: [{ projectId: 'project-1' }], total: 1 },
            trace: { procedure, method: 'GET', startedAt: 0, finishedAt: 1, durationMs: 1 },
          }
        case 'environment.byProjectId':
          return {
            data: [{ environmentId: 'env-1' }],
            trace: { procedure, method: 'GET', startedAt: 1, finishedAt: 2, durationMs: 1 },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    },
    getCalls() {
      return calls.map((entry, index) => ({
        procedure: entry.procedure,
        method: 'GET',
        startedAt: index,
        finishedAt: index + 1,
        durationMs: 1,
      }))
    },
  }
}

const durations = []
let execution

for (let index = 0; index < SAMPLE_COUNT; index += 1) {
  const startedAt = performance.now()
  execution = await runExecuteWithHost(code, createHost())
  const finishedAt = performance.now()
  durations.push(finishedAt - startedAt)
}

console.log(
  JSON.stringify(
    {
      ...summarizeSamples(durations),
      callCount: execution?.calls.length ?? 0,
      logBytes: Buffer.byteLength(JSON.stringify(execution?.logs ?? []), 'utf8'),
      resultBytes: Buffer.byteLength(JSON.stringify(execution?.result ?? null), 'utf8'),
    },
    null,
    2,
  ),
)
