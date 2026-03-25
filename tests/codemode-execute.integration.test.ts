import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { runSandboxedFunction } from '../src/codemode/sandbox/runner.js'
import { buildExecuteContext, runExecuteWithHost } from '../src/codemode/tools/execute.js'

function readFixture(relativePath: string) {
  return trimFixtureCode(
    readFileSync(resolve('tests/codemode/fixtures/execute', relativePath), 'utf8'),
  )
}

function trimFixtureCode(value: string) {
  return value.trim().replace(/^;/, '')
}

describe('codemode execute integration', () => {
  function trace(procedure: string, index: number) {
    return {
      procedure,
      method: 'GET' as const,
      startedAt: index,
      finishedAt: index + 1,
      durationMs: 1,
    }
  }

  it('can orchestrate a multi-step workflow in one execution', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      switch (procedure) {
        case 'project.search':
          return {
            data: { items: [{ projectId: 'project-1' }], total: 1 },
            trace: { procedure, method: 'GET', startedAt: 0, finishedAt: 1, durationMs: 1 },
          }
        case 'environment.byProjectId':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: [{ environmentId: 'env-1' }],
            trace: { procedure, method: 'GET', startedAt: 1, finishedAt: 2, durationMs: 1 },
          }
        case 'application.one':
          expect(input).toEqual({ applicationId: 'app-1' })
          return {
            data: { applicationId: 'app-1' },
            trace: { procedure, method: 'GET', startedAt: 2, finishedAt: 3, durationMs: 1 },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('project-environment-application.js'),
      context: {
        dokploy: context.dokploy,
        helpers: context.helpers,
      },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      environmentId: 'env-1',
      applicationId: 'app-1',
    })
    expect(context.getCalls()).toHaveLength(3)
  })

  it('returns trace payloads and logs from execute host runs', async () => {
    const host = {
      async call(procedure: string) {
        return {
          data: { procedure },
          trace: {
            procedure,
            method: 'GET' as const,
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      },
      getCalls() {
        return [
          {
            procedure: 'project.all',
            method: 'GET' as const,
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        ]
      },
    }

    const result = await runExecuteWithHost(
      `
        async ({ dokploy }) => {
          console.log('hello')
          return await dokploy.project.all({})
        }
      `,
      host,
    )

    expect(result.result).toEqual({ procedure: 'project.all' })
    expect(result.logs).toEqual(['hello'])
    expect(result.calls).toEqual([
      {
        procedure: 'project.all',
        method: 'GET',
        startedAt: 0,
        finishedAt: 1,
        durationMs: 1,
      },
    ])
  })

  it('can execute a compose -> services -> mounts workflow', async () => {
    const context = buildExecuteContext(async (procedure) => {
      switch (procedure) {
        case 'compose.search':
          return {
            data: { items: [{ composeId: 'compose-1' }], total: 1 },
            trace: trace(procedure, 0),
          }
        case 'compose.loadServices':
          return { data: ['wordpress'], trace: trace(procedure, 1) }
        case 'compose.loadMountsByService':
          return {
            data: [{ mountId: 'mount-1' }, { mountId: 'mount-2' }],
            trace: trace(procedure, 2),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('compose-service-mounts.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      composeId: 'compose-1',
      serviceName: 'wordpress',
      mountsCount: 2,
    })
  })

  it('can execute a notification list -> inspect workflow', async () => {
    const context = buildExecuteContext(async (procedure) => {
      switch (procedure) {
        case 'notification.all':
          return { data: [{ notificationId: 'n-1' }], trace: trace(procedure, 0) }
        case 'notification.one':
          return { data: { notificationId: 'n-1', name: 'alerts' }, trace: trace(procedure, 1) }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('notification-list-inspect.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      notificationId: 'n-1',
      name: 'alerts',
    })
  })

  it('can execute a server -> detail -> security workflow', async () => {
    const context = buildExecuteContext(async (procedure) => {
      switch (procedure) {
        case 'server.all':
          return { data: [{ serverId: 's-1' }], trace: trace(procedure, 0) }
        case 'server.one':
          return { data: { serverId: 's-1' }, trace: trace(procedure, 1) }
        case 'server.security':
          return { data: { ufw: {}, ssh: {}, fail2ban: {} }, trace: trace(procedure, 2) }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('server-security.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      serverId: 's-1',
      securityKeys: ['ufw', 'ssh', 'fail2ban'],
    })
  })

  it('can execute a paginated workflow in one run', async () => {
    const context = buildExecuteContext(async (_procedure, input = {}) => {
      const offset = Number(input.offset ?? 0)
      const pages = [
        {
          items: [
            { projectId: 'p-1', name: 'first' },
            { projectId: 'p-2', name: 'second' },
          ],
          total: 5,
        },
        {
          items: [
            { projectId: 'p-3', name: 'target-project' },
            { projectId: 'p-4', name: 'fourth' },
          ],
          total: 5,
        },
      ]
      const page = pages[Math.floor(offset / 2)] ?? { items: [], total: 5 }
      return { data: page, trace: trace('project.search', offset) }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('pagination-flow.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'p-3',
    })
  })

  it('can update an application field after discovering the project environment', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      switch (procedure) {
        case 'project.search':
          return {
            data: { items: [{ projectId: 'project-1' }], total: 1 },
            trace: trace(procedure, 0),
          }
        case 'environment.byProjectId':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: [{ environmentId: 'env-1' }],
            trace: trace(procedure, 1),
          }
        case 'application.search':
          expect(input).toEqual({ environmentId: 'env-1', limit: 1 })
          return {
            data: { items: [{ applicationId: 'app-1' }], total: 1 },
            trace: trace(procedure, 2),
          }
        case 'application.one':
          expect(input).toEqual({ applicationId: 'app-1' })
          return {
            data: { applicationId: 'app-1', title: 'Before update' },
            trace: trace(procedure, 3),
          }
        case 'application.update':
          expect(input).toEqual({ applicationId: 'app-1', title: 'After update' })
          return {
            data: { applicationId: 'app-1', title: 'After update' },
            trace: trace(procedure, 4),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('project-environment-application-update.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      environmentId: 'env-1',
      applicationId: 'app-1',
      title: 'After update',
    })
  })
})
