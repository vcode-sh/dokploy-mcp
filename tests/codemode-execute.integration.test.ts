import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { invokeProcedureWithApi } from '../src/codemode/gateway/api-gateway.js'
import { createSandboxHost } from '../src/codemode/sandbox/host.js'
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

  it('can shape application.one responses inside execute without forwarding MCP-only params upstream', async () => {
    const fakeApi = {
      async get(_path: string, input?: Record<string, unknown>) {
        expect(input).toEqual({ applicationId: 'app-1' })
        return {
          applicationId: 'app-1',
          name: 'Demo app',
          watchPaths: ['apps/web'],
          deployments: [
            { deploymentId: 'dep-1', title: 'first' },
            { deploymentId: 'dep-2', title: 'second' },
          ],
          env: 'SECRET=1',
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }
    const host = createSandboxHost({
      maxCalls: 5,
      executor: async (procedure, input = {}) => invokeProcedureWithApi(procedure, input, fakeApi),
    })

    const result = await runExecuteWithHost(
      `
        return await dokploy.application.one({
          applicationId: 'app-1',
          select: ['name', 'watchPaths', 'deployments'],
          deploymentLimit: 1,
        })
      `,
      host,
    )

    expect(result.result).toEqual({
      name: 'Demo app',
      watchPaths: ['apps/web'],
      deployments: [{ deploymentId: 'dep-1', title: 'first' }],
    })
  })

  it('can execute virtual application.many while preserving input order and shaping per app', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${String(input.applicationId ?? '')}`)

      switch (procedure) {
        case 'application.one':
          if (input.applicationId === 'app-2') {
            expect(input).toEqual({
              applicationId: 'app-2',
              select: ['name', 'watchPaths', 'deployments'],
              deploymentLimit: 1,
            })
            return {
              data: {
                name: 'Second app',
                watchPaths: ['apps/two'],
                deployments: [{ deploymentId: 'dep-2a' }],
              },
              trace: trace(procedure, 0),
            }
          }

          if (input.applicationId === 'app-1') {
            expect(input).toEqual({
              applicationId: 'app-1',
              select: ['name', 'watchPaths', 'deployments'],
              deploymentLimit: 1,
            })
            return {
              data: {
                name: 'First app',
                watchPaths: ['apps/one'],
                deployments: [{ deploymentId: 'dep-1a' }],
              },
              trace: trace(procedure, 1),
            }
          }

          throw new Error(`Unexpected applicationId ${String(input.applicationId)}`)
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.application.many({
            applicationIds: ['app-2', 'app-1'],
            select: ['name', 'watchPaths', 'deployments'],
            deploymentLimit: 1,
          })
        }
      `,
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      items: [
        {
          name: 'Second app',
          watchPaths: ['apps/two'],
          deployments: [{ deploymentId: 'dep-2a' }],
        },
        {
          name: 'First app',
          watchPaths: ['apps/one'],
          deployments: [{ deploymentId: 'dep-1a' }],
        },
      ],
      total: 2,
    })
    expect(calls).toEqual(['application.one:app-2', 'application.one:app-1'])
    expect(context.getCalls()).toHaveLength(2)
  })

  it('supports virtual application.many through dokploy.call', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      switch (procedure) {
        case 'application.one':
          return {
            data: { name: `Name ${String(input.applicationId)}` },
            trace: trace(procedure, 0),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.call('application.many', {
            applicationIds: ['app-1', 'app-2'],
            select: ['name'],
          })
        }
      `,
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      items: [{ name: 'Name app-1' }, { name: 'Name app-2' }],
      total: 2,
    })
  })

  it('can execute virtual server.many while preserving input order and optional security', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${String(input.serverId ?? '')}`)

      switch (procedure) {
        case 'server.one':
          if (input.serverId === 'server-2') {
            return {
              data: {
                serverId: 'server-2',
                name: 'Second server',
                serverStatus: 'inactive',
                deployments: [{ deploymentId: 'dep-2' }],
              },
              trace: trace(procedure, 0),
            }
          }

          if (input.serverId === 'server-1') {
            return {
              data: {
                serverId: 'server-1',
                name: 'First server',
                serverStatus: 'active',
                deployments: [{ deploymentId: 'dep-1' }],
              },
              trace: trace(procedure, 1),
            }
          }

          throw new Error(`Unexpected serverId ${String(input.serverId)}`)
        case 'server.security':
          if (input.serverId === 'server-2') {
            return {
              data: {
                ssh: { enabled: false },
                ufw: { active: false },
                fail2ban: { active: false },
              },
              trace: trace(procedure, 2),
            }
          }

          if (input.serverId === 'server-1') {
            return {
              data: { ssh: { enabled: true }, ufw: { active: true }, fail2ban: { active: true } },
              trace: trace(procedure, 3),
            }
          }

          throw new Error(`Unexpected security serverId ${String(input.serverId)}`)
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('server-many.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      items: [
        {
          serverId: 'server-2',
          name: 'Second server',
          serverStatus: 'inactive',
          deployments: [{ deploymentId: 'dep-2' }],
          security: {
            ssh: { enabled: false },
            ufw: { active: false },
            fail2ban: { active: false },
          },
        },
        {
          serverId: 'server-1',
          name: 'First server',
          serverStatus: 'active',
          deployments: [{ deploymentId: 'dep-1' }],
          security: {
            ssh: { enabled: true },
            ufw: { active: true },
            fail2ban: { active: true },
          },
        },
      ],
      total: 2,
    })
    expect(calls).toEqual([
      'server.one:server-2',
      'server.security:server-2',
      'server.one:server-1',
      'server.security:server-1',
    ])
    expect(context.getCalls()).toHaveLength(4)
  })

  it('can execute virtual project.overview with paginated application discovery', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'project.one':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: { projectId: 'project-1', name: 'Demo project' },
            trace: trace(procedure, 0),
          }
        case 'environment.byProjectId':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: [{ environmentId: 'env-1', name: 'Production' }],
            trace: trace(procedure, 1),
          }
        case 'environment.one':
          expect(input).toEqual({ environmentId: 'env-1' })
          return {
            data: {
              environmentId: 'env-1',
              name: 'Production',
              applications: [{ applicationId: 'app-1' }, { applicationId: 'app-2' }],
            },
            trace: trace(procedure, 2),
          }
        case 'application.one':
          if (input.applicationId === 'app-1') {
            expect(input).toEqual({
              applicationId: 'app-1',
              select: [
                'applicationId',
                'name',
                'appName',
                'applicationStatus',
                'domains',
                'mounts',
                'watchPaths',
                'deployments',
              ],
              deploymentLimit: 1,
            })
            return {
              data: {
                applicationId: 'app-1',
                name: 'First app',
                appName: 'first-app',
                applicationStatus: 'running',
                domains: [{ host: 'first.example.com' }],
                mounts: [{ mountId: 'mount-1' }],
                watchPaths: ['apps/one'],
                deployments: [{ deploymentId: 'dep-1' }],
              },
              trace: trace(procedure, 3),
            }
          }

          if (input.applicationId === 'app-2') {
            expect(input).toEqual({
              applicationId: 'app-2',
              select: [
                'applicationId',
                'name',
                'appName',
                'applicationStatus',
                'domains',
                'mounts',
                'watchPaths',
                'deployments',
              ],
              deploymentLimit: 1,
            })
            return {
              data: {
                applicationId: 'app-2',
                name: 'Second app',
                appName: 'second-app',
                applicationStatus: 'stopped',
                domains: [{ host: 'second.example.com' }],
                mounts: [{ mountId: 'mount-2' }],
                watchPaths: ['apps/two'],
                deployments: [{ deploymentId: 'dep-2' }],
              },
              trace: trace(procedure, 4),
            }
          }

          throw new Error(`Unexpected applicationId ${String(input.applicationId)}`)
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.project.overview({
            projectId: 'project-1',
            pageSize: 1,
          })
        }
      `,
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      name: 'Demo project',
      environments: [
        {
          environmentId: 'env-1',
          name: 'Production',
          applications: [
            {
              applicationId: 'app-1',
              name: 'First app',
              appName: 'first-app',
              applicationStatus: 'running',
              domains: [{ host: 'first.example.com' }],
              mounts: [{ mountId: 'mount-1' }],
              watchPaths: ['apps/one'],
              lastDeployment: { deploymentId: 'dep-1' },
            },
            {
              applicationId: 'app-2',
              name: 'Second app',
              appName: 'second-app',
              applicationStatus: 'stopped',
              domains: [{ host: 'second.example.com' }],
              mounts: [{ mountId: 'mount-2' }],
              watchPaths: ['apps/two'],
              lastDeployment: { deploymentId: 'dep-2' },
            },
          ],
        },
      ],
    })
    expect(calls).toEqual([
      'project.one:{"projectId":"project-1"}',
      'environment.byProjectId:{"projectId":"project-1"}',
      'environment.one:{"environmentId":"env-1"}',
      'application.one:{"applicationId":"app-1","select":["applicationId","name","appName","applicationStatus","domains","mounts","watchPaths","deployments"],"deploymentLimit":1}',
      'application.one:{"applicationId":"app-2","select":["applicationId","name","appName","applicationStatus","domains","mounts","watchPaths","deployments"],"deploymentLimit":1}',
    ])
    expect(context.getCalls()).toHaveLength(5)
  })

  it('can execute virtual project.infrastructureOverview with compact server summaries', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'project.one':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: {
              projectId: 'project-1',
              name: 'Infra project',
              description: 'Infrastructure summary target',
              environments: [
                {
                  environmentId: 'env-1',
                  name: 'Production',
                  description: 'Primary env',
                  isDefault: true,
                  applications: [
                    { applicationId: 'app-1', applicationStatus: 'running', serverId: 'server-1' },
                    { applicationId: 'app-2', applicationStatus: 'stopped', serverId: 'server-1' },
                  ],
                  compose: [
                    { composeId: 'compose-1', composeStatus: 'running', serverId: 'server-2' },
                  ],
                  mariadb: [],
                  mongo: [],
                  mysql: [],
                  postgres: [{ postgresId: 'pg-1', serverId: 'server-1' }],
                  redis: [],
                },
              ],
            },
            trace: trace(procedure, 0),
          }
        case 'server.one':
          if (input.serverId === 'server-1') {
            return {
              data: {
                serverId: 'server-1',
                name: 'Primary server',
                serverStatus: 'active',
                serverType: 'deploy',
                ipAddress: '10.0.0.1',
                deployments: [{ deploymentId: 'dep-1', status: 'done' }],
              },
              trace: trace(procedure, 1),
            }
          }

          if (input.serverId === 'server-2') {
            return {
              data: {
                serverId: 'server-2',
                name: 'Worker server',
                serverStatus: 'active',
                serverType: 'build',
                ipAddress: '10.0.0.2',
                deployments: [],
              },
              trace: trace(procedure, 2),
            }
          }

          throw new Error(`Unexpected serverId ${String(input.serverId)}`)
        case 'server.security':
          if (input.serverId === 'server-1') {
            return {
              data: {
                ufw: { installed: true, active: true, defaultIncoming: 'deny' },
                ssh: {
                  enabled: true,
                  keyAuth: true,
                  passwordAuth: false,
                  permitRootLogin: 'prohibit-password',
                  usePam: true,
                },
                fail2ban: {
                  installed: true,
                  enabled: true,
                  active: true,
                  sshEnabled: true,
                  sshMode: 'normal',
                },
              },
              trace: trace(procedure, 3),
            }
          }

          if (input.serverId === 'server-2') {
            return {
              data: {
                ufw: { installed: true, active: false, defaultIncoming: 'allow' },
                ssh: {
                  enabled: true,
                  keyAuth: true,
                  passwordAuth: true,
                  permitRootLogin: 'yes',
                  usePam: false,
                },
                fail2ban: {
                  installed: false,
                  enabled: false,
                  active: false,
                  sshEnabled: false,
                  sshMode: 'disabled',
                },
              },
              trace: trace(procedure, 4),
            }
          }

          throw new Error(`Unexpected security serverId ${String(input.serverId)}`)
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('project-infrastructure-overview.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      name: 'Infra project',
      description: 'Infrastructure summary target',
      environments: [
        {
          environmentId: 'env-1',
          name: 'Production',
          description: 'Primary env',
          isDefault: true,
          serverIds: ['server-1', 'server-2'],
          applications: {
            total: 2,
            statusCounts: {
              running: 1,
              stopped: 1,
            },
          },
          compose: {
            total: 1,
            statusCounts: {
              running: 1,
            },
          },
          databases: {
            mariadb: 0,
            mongo: 0,
            mysql: 0,
            postgres: 1,
            redis: 0,
            total: 1,
          },
        },
      ],
      servers: [
        {
          serverId: 'server-1',
          name: 'Primary server',
          serverStatus: 'active',
          serverType: 'deploy',
          ipAddress: '10.0.0.1',
          lastDeployment: { deploymentId: 'dep-1', status: 'done' },
          security: {
            ufw: { installed: true, active: true, defaultIncoming: 'deny' },
            ssh: {
              enabled: true,
              keyAuth: true,
              passwordAuth: false,
              permitRootLogin: 'prohibit-password',
              usePam: true,
            },
            fail2ban: {
              installed: true,
              enabled: true,
              active: true,
              sshEnabled: true,
              sshMode: 'normal',
            },
          },
        },
        {
          serverId: 'server-2',
          name: 'Worker server',
          serverStatus: 'active',
          serverType: 'build',
          ipAddress: '10.0.0.2',
          lastDeployment: null,
          security: {
            ufw: { installed: true, active: false, defaultIncoming: 'allow' },
            ssh: {
              enabled: true,
              keyAuth: true,
              passwordAuth: true,
              permitRootLogin: 'yes',
              usePam: false,
            },
            fail2ban: {
              installed: false,
              enabled: false,
              active: false,
              sshEnabled: false,
              sshMode: 'disabled',
            },
          },
        },
      ],
      totals: {
        environments: 1,
        applications: 2,
        compose: 1,
        databases: 1,
        servers: 2,
      },
    })
    expect(calls).toEqual([
      'project.one:{"projectId":"project-1"}',
      'server.one:{"serverId":"server-1"}',
      'server.security:{"serverId":"server-1"}',
      'server.one:{"serverId":"server-2"}',
      'server.security:{"serverId":"server-2"}',
    ])
    expect(context.getCalls()).toHaveLength(5)
  })

  it('can execute virtual project.logsOverview with environment scoping and environment fallback', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'project.one':
          return {
            data: {
              projectId: 'project-1',
              name: 'Project One',
              environments: [],
            },
            trace: trace(procedure, 0),
          }
        case 'environment.byProjectId':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            data: [
              {
                environmentId: 'env-1',
                name: 'Production',
                applications: [{ applicationId: 'app-1', name: 'Ignored app' }],
                libsql: [{ libsqlId: 'libsql-1', name: 'Ignored LibSQL' }],
                mariadb: [],
                mongo: [],
                mysql: [],
                postgres: [],
                redis: [],
              },
              {
                environmentId: 'env-2',
                name: 'Staging',
                applications: [
                  { applicationId: 'app-2', name: 'App Two' },
                  { applicationId: 'app-3', name: 'App Three' },
                ],
                libsql: [{ libsqlId: 'libsql-2', name: 'LibSQL Two' }],
                mariadb: [{ mariadbId: 'mdb-2', name: 'Maria Two' }],
                mongo: [],
                mysql: [],
                postgres: [],
                redis: [],
              },
            ],
            trace: trace(procedure, 1),
          }
        case 'application.readLogs':
          return {
            data: { lines: [`app:${String(input.applicationId)}`], truncated: false },
            trace: trace(procedure, 2),
          }
        case 'libsql.readLogs':
          return {
            data: { lines: [`libsql:${String(input.libsqlId)}`], truncated: false },
            trace: trace(procedure, 3),
          }
        case 'mariadb.readLogs':
          return {
            data: { lines: [`mariadb:${String(input.mariadbId)}`], truncated: false },
            trace: trace(procedure, 4),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('project-logs-overview.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      projectName: 'Project One',
      sources: [
        {
          kind: 'application',
          resourceId: 'app-2',
          name: 'App Two',
          environmentId: 'env-2',
          environmentName: 'Staging',
        },
        {
          kind: 'application',
          resourceId: 'app-3',
          name: 'App Three',
          environmentId: 'env-2',
          environmentName: 'Staging',
        },
        {
          kind: 'libsql',
          resourceId: 'libsql-2',
          name: 'LibSQL Two',
          environmentId: 'env-2',
          environmentName: 'Staging',
        },
        {
          kind: 'mariadb',
          resourceId: 'mdb-2',
          name: 'Maria Two',
          environmentId: 'env-2',
          environmentName: 'Staging',
        },
      ],
      items: [
        {
          kind: 'application',
          applicationId: 'app-2',
          tail: 25,
          search: 'error',
          procedure: 'application.readLogs',
          result: { lines: ['app:app-2'], truncated: false },
        },
        {
          kind: 'application',
          applicationId: 'app-3',
          tail: 25,
          search: 'error',
          procedure: 'application.readLogs',
          result: { lines: ['app:app-3'], truncated: false },
        },
        {
          kind: 'libsql',
          libsqlId: 'libsql-2',
          tail: 25,
          search: 'error',
          procedure: 'libsql.readLogs',
          result: { lines: ['libsql:libsql-2'], truncated: false },
        },
        {
          kind: 'mariadb',
          mariadbId: 'mdb-2',
          tail: 25,
          search: 'error',
          procedure: 'mariadb.readLogs',
          result: { lines: ['mariadb:mdb-2'], truncated: false },
        },
      ],
      total: 4,
    })
    expect(calls).toEqual([
      'project.one:{"projectId":"project-1"}',
      'environment.byProjectId:{"projectId":"project-1"}',
      'application.readLogs:{"applicationId":"app-2","tail":25,"search":"error"}',
      'application.readLogs:{"applicationId":"app-3","tail":25,"search":"error"}',
      'libsql.readLogs:{"libsqlId":"libsql-2","tail":25,"search":"error"}',
      'mariadb.readLogs:{"mariadbId":"mdb-2","tail":25,"search":"error"}',
    ])
    expect(context.getCalls()).toHaveLength(6)
  })

  it('can execute virtual logs.tailMany while preserving input order', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'application.readLogs':
          return {
            data: { lines: ['app-error'], truncated: false },
            trace: trace(procedure, 0),
          }
        case 'compose.readLogs':
          return {
            data: { lines: ['compose-line'], truncated: false },
            trace: trace(procedure, 1),
          }
        case 'libsql.readLogs':
          return {
            data: { lines: ['libsql-line'], truncated: false },
            trace: trace(procedure, 2),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('logs-tail-many.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      items: [
        {
          kind: 'application',
          applicationId: 'app-1',
          tail: 20,
          search: 'error',
          procedure: 'application.readLogs',
          result: { lines: ['app-error'], truncated: false },
        },
        {
          kind: 'compose',
          composeId: 'compose-1',
          containerId: 'web',
          tail: 10,
          procedure: 'compose.readLogs',
          result: { lines: ['compose-line'], truncated: false },
        },
        {
          kind: 'libsql',
          libsqlId: 'libsql-1',
          tail: 5,
          procedure: 'libsql.readLogs',
          result: { lines: ['libsql-line'], truncated: false },
        },
      ],
      total: 3,
    })
    expect(calls).toEqual([
      'application.readLogs:{"applicationId":"app-1","tail":20,"search":"error"}',
      'compose.readLogs:{"composeId":"compose-1","containerId":"web","tail":10}',
      'libsql.readLogs:{"libsqlId":"libsql-1","tail":5}',
    ])
    expect(context.getCalls()).toHaveLength(3)
  })

  it('can execute virtual libsql.many while preserving input order', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'libsql.one':
          if (input.libsqlId === 'libsql-2') {
            return {
              data: { libsqlId: 'libsql-2', name: 'Second libsql' },
              trace: trace(procedure, 0),
            }
          }

          if (input.libsqlId === 'libsql-1') {
            return {
              data: { libsqlId: 'libsql-1', name: 'First libsql' },
              trace: trace(procedure, 1),
            }
          }

          throw new Error(`Unexpected libsqlId ${String(input.libsqlId)}`)
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('libsql-many.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      items: [
        { libsqlId: 'libsql-2', name: 'Second libsql' },
        { libsqlId: 'libsql-1', name: 'First libsql' },
      ],
      total: 2,
    })
    expect(calls).toEqual([
      'libsql.one:{"libsqlId":"libsql-2"}',
      'libsql.one:{"libsqlId":"libsql-1"}',
    ])
    expect(context.getCalls()).toHaveLength(2)
  })

  it('can execute virtual tag.bulkAssignPreview with resolved and missing tags', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'project.one':
          return {
            data: {
              projectId: 'project-1',
              name: 'Project One',
              tags: [{ tagId: 'tag-1', name: 'Current tag' }],
            },
            trace: trace(procedure, 0),
          }
        case 'tag.all':
          return {
            data: [
              { tagId: 'tag-1', name: 'Current tag', color: '#111111' },
              { tagId: 'tag-2', name: 'New tag', color: '#222222' },
            ],
            trace: trace(procedure, 1),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('tag-bulk-assign-preview.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      projectId: 'project-1',
      projectName: 'Project One',
      requestedTagIds: ['tag-2', 'tag-missing', 'tag-1'],
      currentTagIds: ['tag-1'],
      resolvedTags: [
        { tagId: 'tag-2', name: 'New tag', color: '#222222' },
        { tagId: 'tag-1', name: 'Current tag', color: '#111111' },
      ],
      missingTagIds: ['tag-missing'],
      unchangedTagIds: ['tag-1'],
      toAddTagIds: ['tag-2'],
      previewOperation: {
        procedure: 'tag.bulkAssign',
        input: {
          projectId: 'project-1',
          tagIds: ['tag-2', 'tag-missing', 'tag-1'],
        },
      },
    })
    expect(calls).toEqual(['project.one:{"projectId":"project-1"}', 'tag.all:{}'])
    expect(context.getCalls()).toHaveLength(2)
  })

  it('can execute virtual database.rotatePasswordPreview without mutating anything', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'mysql.one':
          return {
            data: {
              mysqlId: 'mysql-1',
              name: 'Main MySQL',
              appName: 'mysql-main',
              environmentId: 'env-1',
              projectId: 'project-1',
            },
            trace: trace(procedure, 0),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: readFixture('database-rotate-password-preview.js'),
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      kind: 'mysql',
      resourceId: 'mysql-1',
      name: 'Main MySQL',
      appName: 'mysql-main',
      environmentId: 'env-1',
      projectId: 'project-1',
      previewOperation: {
        procedure: 'mysql.changePassword',
        inputTemplate: {
          mysqlId: 'mysql-1',
          type: 'root',
        },
        requiredSecretField: 'password',
      },
    })
    expect(calls).toEqual(['mysql.one:{"mysqlId":"mysql-1"}'])
    expect(context.getCalls()).toHaveLength(1)
  })

  it('can execute virtual deployment.latestByType and return the latest entry', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      switch (procedure) {
        case 'deployment.allByType':
          return {
            data: {
              items: [
                { deploymentId: 'dep-2', status: 'running' },
                { deploymentId: 'dep-1', status: 'done' },
              ],
              total: 2,
            },
            trace: trace(procedure, 0),
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.deployment.latestByType({
            id: 'app-1',
            type: 'application',
          })
        }
      `,
      context: { dokploy: context.dokploy, helpers: context.helpers },
    })

    expect(execution.result).toEqual({
      id: 'app-1',
      type: 'application',
      total: 2,
      latestDeployment: { deploymentId: 'dep-2', status: 'running' },
    })
    expect(calls).toEqual(['deployment.allByType:{"id":"app-1","type":"application"}'])
    expect(context.getCalls()).toHaveLength(1)
  })
})
