import { describe, expect, expectTypeOf, it } from 'vitest'

import { invokeProcedureWithApi } from '../src/codemode/gateway/api-gateway.js'
import { runSandboxedFunction } from '../src/codemode/sandbox/runner.js'
import { buildExecuteContext } from '../src/codemode/tools/execute.js'
import { searchTool } from '../src/codemode/tools/search.js'
import { dokployCatalog } from '../src/generated/dokploy-catalog.js'
import { createServer } from '../src/server.js'

describe('codemode runtime', () => {
  it('creates a codemode server instance', () => {
    const server = createServer()
    expect(server).toBeDefined()
  })

  it('loads a non-empty generated catalog', () => {
    expect(dokployCatalog.endpointCount).toBeGreaterThan(0)
    expect(dokployCatalog.endpoints.length).toBe(dokployCatalog.endpointCount)
  })

  it('search tool can query the generated catalog', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("notification").slice(0, 5).map((entry) => entry.procedure)',
    })

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent).toBeDefined()

    const payload = result.structuredContent as { result?: unknown; logs?: string[] }
    expect(Array.isArray(payload.result)).toBe(true)
    expect((payload.result as string[]).some((entry) => entry.startsWith('notification.'))).toBe(
      true,
    )
    expect(payload.logs).toEqual([])
  })

  it('search rejects non-async code', async () => {
    const result = await searchTool.handler({
      code: '() => 1',
    })

    expect(result.isError).toBe(true)
  })

  it('search catalog get returns a full contract view', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('application.update')",
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toBeDefined()

    const contract = payload.result as Record<string, unknown>
    expect(contract.procedure).toBe('application.update')
    expect(contract.inputSchema).toBeDefined()
    expect(contract.outputSchema).toBeDefined()
  })

  it('search catalog get merges manual response hints for key detail endpoints', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('application.one')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('application.one')
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining(['select', 'includeDeployments', 'deploymentLimit']),
    )
    expect(contract.inputSchema).toMatchObject({
      properties: expect.objectContaining({
        select: expect.any(Object),
        includeDeployments: expect.any(Object),
        deploymentLimit: expect.any(Object),
      }),
    })
    expect(contract.commonResponseFields).toEqual(
      expect.arrayContaining(['mounts', 'watchPaths', 'deployments']),
    )
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([expect.stringContaining('token usage')]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('OpenAPI output schema is currently incomplete'),
      ]),
    )
  })

  it('search catalog get exposes virtual application.many as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('application.many')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('application.many')
    expect(contract.path).toBe('/virtual/application.many')
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining(['select', 'includeDeployments', 'deploymentLimit']),
    )
    expect(contract.commonResponseFields).toEqual(expect.arrayContaining(['items', 'total']))
    expect(contract.notes).toEqual(
      expect.arrayContaining([expect.stringContaining('not backed by a Dokploy HTTP endpoint')]),
    )
  })

  it('search catalog get exposes virtual project.overview as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('project.overview')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('project.overview')
    expect(contract.path).toBe('/virtual/project.overview')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['projectId']))
    expect(contract.commonResponseFields).toEqual(
      expect.arrayContaining(['projectId', 'name', 'environments']),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([expect.stringContaining('not backed by a Dokploy HTTP endpoint')]),
    )
  })

  it('search catalog get exposes virtual server.many as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('server.many')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('server.many')
    expect(contract.path).toBe('/virtual/server.many')
    expect(contract.optionalInputs).toEqual(expect.arrayContaining(['includeSecurity']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['items', 'total'],
    })
  })

  it('search catalog get exposes virtual project.infrastructureOverview as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('project.infrastructureOverview')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('project.infrastructureOverview')
    expect(contract.path).toBe('/virtual/project.infrastructureOverview')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['projectId']))
    expect(contract.optionalInputs).toEqual(expect.arrayContaining(['includeServerSecurity']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['projectId', 'name', 'description', 'environments', 'servers', 'totals'],
    })
  })

  it('search can find endpoints by manual response hints when OpenAPI is incomplete', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("watchPaths").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['application.one']))
  })

  it('search can find application.one by MCP-only shaping params', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("deploymentLimit").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['application.one', 'application.many']))
  })

  it('search can find project.overview by overview-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("lastDeployment").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['project.overview']))
  })

  it('search can find server.many by helper-specific inputs', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("includeSecurity").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['server.many']))
  })

  it('search can find project.infrastructureOverview by infrastructure-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("statusCounts").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['project.infrastructureOverview']))
  })

  it('bounds array search results', async () => {
    const result = await searchTool.handler({
      code: 'async () => Array.from({ length: 200 }, (_, index) => index)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(Array.isArray(payload.result)).toBe(true)
    expect(payload.result as unknown[]).toHaveLength(50)
  })

  it('builds an execute context that can orchestrate multiple calls', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(procedure)
      return {
        data: { procedure, input },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    const project = await context.dokploy.project.one({ projectId: 'p1' })
    const application = await context.dokploy.call('application.one', { applicationId: 'a1' })

    expect(project).toEqual({
      procedure: 'project.one',
      input: { projectId: 'p1' },
    })
    expect(application).toEqual({
      procedure: 'application.one',
      input: { applicationId: 'a1' },
    })
    expect(calls).toEqual(['project.one', 'application.one'])
    expect(context.getCalls()).toHaveLength(2)
  })

  it('exposes typed execute helpers for shaped and virtual reads', () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: { procedure, input },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    expectTypeOf(context.dokploy.application.one).toBeCallableWith({
      applicationId: 'app-1',
      select: ['name'],
      deploymentLimit: 1,
    })
    expectTypeOf(context.dokploy.application.many).toBeCallableWith({
      applicationIds: ['app-1', 'app-2'],
      includeDeployments: false,
    })
    expectTypeOf(context.dokploy.server.many).toBeCallableWith({
      serverIds: ['server-1'],
      includeSecurity: true,
    })
    expectTypeOf(context.dokploy.project.overview).toBeCallableWith({
      projectId: 'project-1',
      pageSize: 10,
    })
    expectTypeOf(context.dokploy.project.infrastructureOverview).toBeCallableWith({
      projectId: 'project-1',
      includeServerSecurity: true,
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('application.many', {
      applicationIds: ['app-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('server.many', {
      serverIds: ['server-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('project.infrastructureOverview', {
      projectId: 'project-1',
    })
  })

  it('enforces the execute max call budget', async () => {
    const context = buildExecuteContext(async (procedure) => {
      return {
        data: { procedure },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 1)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            await dokploy.project.all({})
            await dokploy.project.all({})
            return true
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 1 API calls.')
  })

  it('enforces the aggregated Dokploy response budget', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = '32'

    try {
      const { createSandboxHost } = await import('../src/codemode/sandbox/host.js')
      const sandboxHost = createSandboxHost({
        maxCalls: 5,
        executor: async (procedure) => {
          return {
            data: { procedure, payload: 'x'.repeat(128) },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        },
      })

      await expect(sandboxHost.call('project.all', {})).rejects.toThrow(
        'Code Mode execute exceeded 32 bytes of Dokploy responses.',
      )
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = previous
      }
    }
  })

  it('applies application.one shaping before sandbox response bytes are counted', async () => {
    const previous = process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES
    process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = '128'

    try {
      const { createSandboxHost } = await import('../src/codemode/sandbox/host.js')
      const fakeApi = {
        async get(_path: string, input?: Record<string, unknown>) {
          expect(input).toEqual({ applicationId: 'app-1' })
          return {
            applicationId: 'app-1',
            name: 'Demo app',
            deployments: [
              { deploymentId: 'dep-1', description: 'x'.repeat(512) },
              { deploymentId: 'dep-2', description: 'y'.repeat(512) },
            ],
          }
        },
        async post() {
          throw new Error('Unexpected POST call')
        },
      }

      const unshapedHost = createSandboxHost({
        maxCalls: 5,
        executor: async (procedure, input = {}) =>
          invokeProcedureWithApi(procedure, input, fakeApi),
      })
      await expect(
        unshapedHost.call('application.one', { applicationId: 'app-1' }),
      ).rejects.toThrow('Code Mode execute exceeded 128 bytes of Dokploy responses.')

      const shapedHost = createSandboxHost({
        maxCalls: 5,
        executor: async (procedure, input = {}) =>
          invokeProcedureWithApi(procedure, input, fakeApi),
      })
      const result = await shapedHost.call('application.one', {
        applicationId: 'app-1',
        select: ['name'],
        deploymentLimit: 1,
      })

      expect(result.data).toEqual({ name: 'Demo app' })
    } finally {
      if (previous === undefined) {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = undefined
      } else {
        process.env.DOKPLOY_MCP_SANDBOX_MAX_RESPONSE_BYTES = previous
      }
    }
  })

  it('enforces the execute max call budget for virtual application.many fan-out', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: {
          procedure,
          input,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 2)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.application.many({
              applicationIds: ['app-1', 'app-2', 'app-3'],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 2 API calls.')
  })

  it('validates virtual application.many input before issuing upstream calls', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: {
          procedure,
          input,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.application.many({
              applicationIds: ['app-1', ''],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('applicationIds[1] must be a non-empty string')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual server.many input before issuing upstream calls', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: {
          procedure,
          input,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.server.many({
              serverIds: ['server-1'],
              includeSecurity: 'yes',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('includeSecurity must be a boolean')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual project.overview input before issuing upstream calls', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: {
          procedure,
          input,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.project.overview({
              projectId: 'project-1',
              pageSize: 0,
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('pageSize must be a positive integer')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual project.infrastructureOverview input before issuing upstream calls', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      return {
        data: {
          procedure,
          input,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: 0,
          finishedAt: 1,
          durationMs: 1,
        },
      }
    }, 5)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.project.infrastructureOverview({
              projectId: 'project-1',
              includeServerSecurity: 'yes',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('includeServerSecurity must be a boolean')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('enforces the execute max call budget for virtual project.overview fan-out', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      switch (procedure) {
        case 'project.one':
          return {
            data: { projectId: 'project-1', name: 'Demo project' },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'environment.byProjectId':
          return {
            data: [{ environmentId: 'env-1', name: 'Production' }],
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'environment.one':
          return {
            data: {
              environmentId: 'env-1',
              name: 'Production',
              applications: [{ applicationId: 'app-1' }],
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'application.one':
          return {
            data: {
              applicationId: String(input.applicationId),
              name: 'Demo app',
              deployments: [],
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    }, 3)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.project.overview({
              projectId: 'project-1',
              pageSize: 20,
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 3 API calls.')
  })

  it('enforces the execute max call budget for virtual server.many fan-out', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      switch (procedure) {
        case 'server.one':
          return {
            data: { serverId: String(input.serverId) },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'server.security':
          return {
            data: { ssh: {}, ufw: {}, fail2ban: {} },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    }, 3)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.server.many({
              serverIds: ['server-1', 'server-2'],
              includeSecurity: true,
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 3 API calls.')
  })

  it('enforces the execute max call budget for virtual project.infrastructureOverview server fan-out', async () => {
    const context = buildExecuteContext(async (procedure) => {
      switch (procedure) {
        case 'project.one':
          return {
            data: {
              projectId: 'project-1',
              environments: [
                {
                  environmentId: 'env-1',
                  name: 'Production',
                  description: 'Prod',
                  isDefault: true,
                  applications: [{ applicationId: 'app-1', serverId: 'server-1' }],
                  compose: [
                    { composeId: 'compose-1', composeStatus: 'running', serverId: 'server-2' },
                  ],
                  mariadb: [],
                  mongo: [],
                  mysql: [],
                  postgres: [],
                  redis: [],
                },
              ],
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'server.one':
          return {
            data: { serverId: 'server-1' },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    }, 2)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.project.infrastructureOverview({
              projectId: 'project-1',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 2 API calls.')
  })
})
