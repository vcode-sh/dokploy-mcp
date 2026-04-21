#!/usr/bin/env node

import { runSandboxedFunction } from '../../dist/codemode/sandbox/runner.js'
import { runExecuteWithHost } from '../../dist/codemode/tools/execute.js'
import { codeModeTools } from '../../dist/codemode/tools/index.js'
import { searchTool } from '../../dist/codemode/tools/search.js'

const MAX_CODEMODE_BYTES = 8 * 1024
const MAX_CODEMODE_TOKENS = 1500
const MAX_SEARCH_DURATION_MS = 150
const MAX_EXECUTE_DURATION_MS = 120
const MAX_SANDBOX_STARTUP_MS = 80
const SAMPLE_COUNT = 10

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

function measureCodeModeToolsList() {
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
  return {
    bytes,
    tokens: Math.round(bytes / 4),
  }
}

function round(value) {
  return Math.round(value * 100) / 100
}

function percentile(samples, ratio) {
  const sorted = [...samples].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length * ratio)] ?? sorted[sorted.length - 1] ?? 0
}

async function withSandboxRuntime(runtime, run) {
  const previous = process.env.DOKPLOY_MCP_SANDBOX_RUNTIME
  process.env.DOKPLOY_MCP_SANDBOX_RUNTIME = runtime

  try {
    return await run()
  } finally {
    if (previous === undefined) {
      delete process.env.DOKPLOY_MCP_SANDBOX_RUNTIME
    } else {
      process.env.DOKPLOY_MCP_SANDBOX_RUNTIME = previous
    }
  }
}

async function sampleDurations(run) {
  await run()

  const samples = []

  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const startedAt = performance.now()
    await run()
    samples.push(performance.now() - startedAt)
  }

  return {
    p50: round(percentile(samples, 0.5)),
    p95: round(percentile(samples, 0.95)),
    max: round(Math.max(...samples)),
  }
}

async function measureSearchDuration() {
  return withSandboxRuntime('local', async () =>
    sampleDurations(async () => {
      await searchTool.handler({
        code: 'async ({ catalog }) => catalog.searchText("notification").slice(0, 20)',
      })
    }),
  )
}

function createBudgetHost() {
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

async function measureExecuteDuration() {
  return withSandboxRuntime('local', async () =>
    sampleDurations(async () => {
      await runExecuteWithHost(
        `
        async ({ dokploy, helpers }) => {
          const projects = await dokploy.project.search({ limit: 5 })
          helpers.assert(
            Array.isArray(projects.items) && projects.items.length > 0,
            'Expected a project',
          )
          const project = helpers.selectOne(projects.items)
          const environments = await dokploy.environment.byProjectId({ projectId: project.projectId })
          return {
            total: projects.total ?? null,
            environmentCount: Array.isArray(environments) ? environments.length : 0,
          }
        }
        `,
        createBudgetHost(),
      )
    }),
  )
}

async function measureSandboxStartup() {
  return sampleDurations(async () => {
    await runSandboxedFunction({
      code: 'async () => ({ ok: true })',
      context: {},
    })
  })
}

const codeModeToolsList = measureCodeModeToolsList()
if (codeModeToolsList.bytes >= MAX_CODEMODE_BYTES) {
  fail(
    `Code Mode tools/list exceeded byte budget: ${codeModeToolsList.bytes} bytes >= ${MAX_CODEMODE_BYTES} bytes`,
  )
}
if (codeModeToolsList.tokens >= MAX_CODEMODE_TOKENS) {
  fail(
    `Code Mode tools/list exceeded token budget: ${codeModeToolsList.tokens} tokens >= ${MAX_CODEMODE_TOKENS}`,
  )
}

const searchDuration = await measureSearchDuration()
if (searchDuration.p95 >= MAX_SEARCH_DURATION_MS) {
  fail(`Code Mode search exceeded p95 budget: ${searchDuration.p95}ms >= ${MAX_SEARCH_DURATION_MS}ms`)
}

const executeDuration = await measureExecuteDuration()
if (executeDuration.p95 >= MAX_EXECUTE_DURATION_MS) {
  fail(
    `Code Mode execute exceeded p95 budget: ${executeDuration.p95}ms >= ${MAX_EXECUTE_DURATION_MS}ms`,
  )
}

const sandboxStartup = await measureSandboxStartup()
if (sandboxStartup.p95 >= MAX_SANDBOX_STARTUP_MS) {
  fail(`Sandbox startup exceeded p95 budget: ${sandboxStartup.p95}ms >= ${MAX_SANDBOX_STARTUP_MS}ms`)
}

console.log(
  JSON.stringify(
    {
      codeModeToolsList,
      searchDurationMs: searchDuration,
      executeDurationMs: executeDuration,
      sandboxStartupMs: sandboxStartup,
      ok: process.exitCode !== 1,
    },
    null,
    2,
  ),
)
