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

  it('search ranks preview helpers above raw mutations for safe workflows', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("safe database password rotation").slice(0, 4).map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toBeDefined()

    const procedures = payload.result as string[]
    expect(procedures[0]).toBe('database.rotatePasswordPreview')
    expect(procedures).toEqual(
      expect.arrayContaining(['database.rotatePasswordPreview', 'database.many']),
    )
  })

  it('search recommend returns helper-first workflow guidance', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.recommend("latest deployment status")',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toBeDefined()

    const recommendation = payload.result as {
      intent: string
      recommended: Array<Record<string, unknown>>
      related: Array<Record<string, unknown>>
    }

    expect(recommendation.intent).toBe('overview')
    expect(recommendation.recommended[0]).toMatchObject({
      procedure: 'deployment.latestByType',
      kind: 'helper',
    })
    expect(recommendation.recommended[0]?.why).toEqual(
      expect.arrayContaining([expect.stringContaining('overview')]),
    )
    expect(recommendation.related).toEqual(expect.any(Array))
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

  it('search catalog get explains Dokploy resource field formats for application.update', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('application.update')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('application.update')
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining(['memoryReservation', 'memoryLimit', 'cpuReservation', 'cpuLimit']),
    )
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([expect.stringContaining('resource tuning')]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('string fields containing bytes'),
        expect.stringContaining('numeric strings such as "0.25"'),
      ]),
    )
    expect(contract.examples).toEqual(
      expect.arrayContaining([expect.stringContaining('268435456')]),
    )
  })

  it('search catalog get marks deployment.readLogs as bounded and redacted log output', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('deployment.readLogs')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('deployment.readLogs')
    expect(contract.commonResponseFields).toEqual(
      expect.arrayContaining(['logs', 'timestamp', 'message', 'stream']),
    )
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([expect.stringContaining('recent stdout')]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([expect.stringContaining('redacting common secret patterns')]),
    )
  })

  it('search catalog get explains safe mount creation for mounts.create', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('mounts.create')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('mounts.create')
    expect(contract.requiredInputs).toEqual(
      expect.arrayContaining(['type', 'mountPath', 'serviceId']),
    )
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('three mount types: bind, volume, and file'),
        expect.stringContaining('default portable persistent-data case'),
        expect.stringContaining('specific existing host path'),
        expect.stringContaining('managed config files'),
      ]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('path must already exist on the Dokploy host machine'),
        expect.stringContaining('Cluster warning'),
        expect.stringContaining('cannot prove that the path exists'),
      ]),
    )
  })

  it('search catalog get explains safe mount updates for mounts.update', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('mounts.update')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('mounts.update')
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('changing the mount type'),
        expect.stringContaining('hostPath for bind'),
      ]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Bind mount updates still depend on the host path existing'),
        expect.stringContaining('clustered Dokploy deployments'),
      ]),
    )
  })

  it('search catalog get explains raw versus Git-backed compose flows', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('compose.create')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('compose.create')
    expect(contract.responseHints).toEqual(
      expect.arrayContaining([
        expect.stringContaining('does not automatically imply a raw Compose deployment path'),
      ]),
    )
    expect(contract.notes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('sourceType: "raw"'),
        expect.stringContaining('GitHub-backed workflow'),
      ]),
    )
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

  it('search catalog get exposes virtual project.logsOverview as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('project.logsOverview')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('project.logsOverview')
    expect(contract.path).toBe('/virtual/project.logsOverview')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['projectId']))
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining([
        'tail',
        'search',
        'includeDatabases',
        'maxApplications',
        'maxDatabases',
      ]),
    )
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['projectId', 'projectName', 'sources', 'items', 'total'],
    })
  })

  it('search catalog get exposes virtual logs.tailMany as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('logs.tailMany')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('logs.tailMany')
    expect(contract.path).toBe('/virtual/logs.tailMany')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['requests']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['items', 'total'],
    })
  })

  it('search catalog get exposes virtual libsql.many as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('libsql.many')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('libsql.many')
    expect(contract.path).toBe('/virtual/libsql.many')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['libsqlIds']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['items', 'total'],
    })
  })

  it('search catalog get exposes virtual database.many as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('database.many')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('database.many')
    expect(contract.path).toBe('/virtual/database.many')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['requests']))
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining(['includePasswordRotationPreview']),
    )
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['items', 'total'],
    })
  })

  it('search catalog get exposes virtual tag.bulkAssignPreview as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('tag.bulkAssignPreview')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('tag.bulkAssignPreview')
    expect(contract.path).toBe('/virtual/tag.bulkAssignPreview')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['projectId', 'tagIds']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: [
        'projectId',
        'projectName',
        'requestedTagIds',
        'currentTagIds',
        'resolvedTags',
        'missingTagIds',
        'unchangedTagIds',
        'toAddTagIds',
        'previewOperation',
      ],
    })
  })

  it('search catalog get exposes virtual database.rotatePasswordPreview as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('database.rotatePasswordPreview')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('database.rotatePasswordPreview')
    expect(contract.path).toBe('/virtual/database.rotatePasswordPreview')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['kind']))
    expect(contract.optionalInputs).toEqual(
      expect.arrayContaining(['mariadbId', 'mongoId', 'mysqlId', 'postgresId', 'redisId', 'type']),
    )
    expect(contract.response).toEqual({
      type: 'object',
      keys: [
        'kind',
        'resourceId',
        'name',
        'appName',
        'environmentId',
        'projectId',
        'previewOperation',
      ],
    })
  })

  it('search catalog get exposes virtual deployment.latestByType as an execute-only helper', async () => {
    const result = await searchTool.handler({
      code: "async ({ catalog }) => catalog.get('deployment.latestByType')",
    })

    const payload = result.structuredContent as { result?: unknown }
    const contract = payload.result as Record<string, unknown>

    expect(contract.procedure).toBe('deployment.latestByType')
    expect(contract.path).toBe('/virtual/deployment.latestByType')
    expect(contract.requiredInputs).toEqual(expect.arrayContaining(['id', 'type']))
    expect(contract.response).toEqual({
      type: 'object',
      keys: ['id', 'type', 'total', 'latestDeployment'],
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

  it('search can find resource update procedures by byte-based memory hints', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("memory bytes cpu limit").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(
      expect.arrayContaining(['application.update', 'postgres.update', 'redis.update']),
    )
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

  it('search can find project.logsOverview by helper-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("includeDatabases").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['project.logsOverview']))
  })

  it('search can find logs.tailMany by helper-specific inputs', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("requests").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['logs.tailMany']))
  })

  it('search can find libsql.many by helper-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("libsqlIds").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['libsql.many']))
  })

  it('search can find database.many by helper-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("includePasswordRotationPreview").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['database.many']))
  })

  it('search can find tag.bulkAssignPreview by preview-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("bulkAssign").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['tag.bulkAssignPreview']))
  })

  it('search can find database.rotatePasswordPreview by preview-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("changePassword").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['database.rotatePasswordPreview']))
  })

  it('search can find deployment.latestByType by helper-specific fields', async () => {
    const result = await searchTool.handler({
      code: 'async ({ catalog }) => catalog.searchText("allByType").map((entry) => entry.procedure)',
    })

    const payload = result.structuredContent as { result?: unknown }
    expect(payload.result).toEqual(expect.arrayContaining(['deployment.latestByType']))
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
    expectTypeOf(context.dokploy.logs.tailMany).toBeCallableWith({
      requests: [{ kind: 'application', applicationId: 'app-1', tail: 20 }],
    })
    expectTypeOf(context.dokploy.logs.tailMany).toBeCallableWith({
      requests: [{ kind: 'deployment', deploymentId: 'deployment-1', tail: 20 }],
    })
    expectTypeOf(context.dokploy.libsql.many).toBeCallableWith({
      libsqlIds: ['libsql-1'],
    })
    expectTypeOf(context.dokploy.database.many).toBeCallableWith({
      requests: [{ kind: 'postgres', postgresId: 'postgres-1' }],
      includePasswordRotationPreview: true,
    })
    expectTypeOf(context.dokploy.tag.bulkAssignPreview).toBeCallableWith({
      projectId: 'project-1',
      tagIds: ['tag-1'],
    })
    expectTypeOf(context.dokploy.database.rotatePasswordPreview).toBeCallableWith({
      kind: 'mysql',
      mysqlId: 'mysql-1',
      type: 'root',
    })
    expectTypeOf(context.dokploy.deployment.latestByType).toBeCallableWith({
      id: 'app-1',
      type: 'application',
    })
    expectTypeOf(context.dokploy.project.overview).toBeCallableWith({
      projectId: 'project-1',
      pageSize: 10,
    })
    expectTypeOf(context.dokploy.project.infrastructureOverview).toBeCallableWith({
      projectId: 'project-1',
      includeServerSecurity: true,
    })
    expectTypeOf(context.dokploy.project.logsOverview).toBeCallableWith({
      projectId: 'project-1',
      tail: 25,
      search: 'error',
      includeDatabases: true,
      maxApplications: 2,
      maxDatabases: 2,
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('application.many', {
      applicationIds: ['app-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('server.many', {
      serverIds: ['server-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('logs.tailMany', {
      requests: [{ kind: 'application', applicationId: 'app-1' }],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('libsql.many', {
      libsqlIds: ['libsql-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('database.many', {
      requests: [{ kind: 'mysql', mysqlId: 'mysql-1', passwordType: 'root' }],
      includePasswordRotationPreview: true,
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('project.infrastructureOverview', {
      projectId: 'project-1',
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('project.logsOverview', {
      projectId: 'project-1',
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('tag.bulkAssignPreview', {
      projectId: 'project-1',
      tagIds: ['tag-1'],
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('database.rotatePasswordPreview', {
      kind: 'postgres',
      postgresId: 'postgres-1',
    })
    expectTypeOf(context.dokploy.call).toBeCallableWith('deployment.latestByType', {
      id: 'server-1',
      type: 'server',
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

  it('can execute virtual database.many while preserving input order and optional password rotation previews', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      const resourceId = String(
        input.redisId ??
          input.mysqlId ??
          input.postgresId ??
          input.mongoId ??
          input.mariadbId ??
          '',
      )
      calls.push(`${procedure}:${resourceId}`)

      switch (procedure) {
        case 'redis.one':
          return {
            data: {
              redisId: 'redis-1',
              name: 'Cache',
              environmentId: 'env-1',
              projectId: 'project-1',
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 0,
              finishedAt: 1,
              durationMs: 1,
            },
          }
        case 'mysql.one':
          return {
            data: {
              mysqlId: 'mysql-1',
              name: 'Primary DB',
              appName: 'api',
              environmentId: 'env-1',
              projectId: 'project-1',
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 1,
              finishedAt: 2,
              durationMs: 1,
            },
          }
        case 'postgres.one':
          return {
            data: {
              postgresId: 'postgres-1',
              name: 'Analytics',
              environmentId: 'env-2',
              projectId: 'project-1',
            },
            trace: {
              procedure,
              method: 'GET',
              startedAt: 2,
              finishedAt: 3,
              durationMs: 1,
            },
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    }, 6)

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.database.many({
            requests: [
              { kind: 'redis', redisId: 'redis-1' },
              { kind: 'mysql', mysqlId: 'mysql-1', passwordType: 'root' },
              { kind: 'postgres', postgresId: 'postgres-1' },
            ],
            includePasswordRotationPreview: true,
          })
        }
      `,
      context: {
        dokploy: context.dokploy,
      },
    })

    expect(execution.result).toEqual({
      items: [
        {
          kind: 'redis',
          resourceId: 'redis-1',
          name: 'Cache',
          appName: null,
          environmentId: 'env-1',
          projectId: 'project-1',
          detail: {
            redisId: 'redis-1',
            name: 'Cache',
            environmentId: 'env-1',
            projectId: 'project-1',
          },
          passwordRotationPreview: {
            procedure: 'redis.changePassword',
            inputTemplate: {
              redisId: 'redis-1',
            },
            requiredSecretField: 'password',
          },
        },
        {
          kind: 'mysql',
          resourceId: 'mysql-1',
          name: 'Primary DB',
          appName: 'api',
          environmentId: 'env-1',
          projectId: 'project-1',
          detail: {
            mysqlId: 'mysql-1',
            name: 'Primary DB',
            appName: 'api',
            environmentId: 'env-1',
            projectId: 'project-1',
          },
          passwordRotationPreview: {
            procedure: 'mysql.changePassword',
            inputTemplate: {
              mysqlId: 'mysql-1',
              type: 'root',
            },
            requiredSecretField: 'password',
          },
        },
        {
          kind: 'postgres',
          resourceId: 'postgres-1',
          name: 'Analytics',
          appName: null,
          environmentId: 'env-2',
          projectId: 'project-1',
          detail: {
            postgresId: 'postgres-1',
            name: 'Analytics',
            environmentId: 'env-2',
            projectId: 'project-1',
          },
          passwordRotationPreview: {
            procedure: 'postgres.changePassword',
            inputTemplate: {
              postgresId: 'postgres-1',
            },
            requiredSecretField: 'password',
          },
        },
      ],
      total: 3,
    })
    expect(calls).toEqual(['redis.one:redis-1', 'mysql.one:mysql-1', 'postgres.one:postgres-1'])
    expect(context.getCalls()).toHaveLength(3)
  })

  it('can execute virtual database.many for every supported database kind', async () => {
    const calls: string[] = []
    const context = buildExecuteContext(async (procedure, input = {}) => {
      calls.push(`${procedure}:${JSON.stringify(input)}`)

      return {
        data: {
          ...input,
          name: `${procedure} resource`,
        },
        trace: {
          procedure,
          method: 'GET',
          startedAt: calls.length,
          finishedAt: calls.length + 1,
          durationMs: 1,
        },
      }
    }, 5)

    const execution = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.database.many({
            requests: [
              { kind: 'mariadb', mariadbId: 'mariadb-1' },
              { kind: 'mongo', mongoId: 'mongo-1' },
              { kind: 'mysql', mysqlId: 'mysql-1' },
              { kind: 'postgres', postgresId: 'postgres-1' },
              { kind: 'redis', redisId: 'redis-1' },
            ],
          })
        }
      `,
      context: {
        dokploy: context.dokploy,
      },
    })

    expect(execution.result).toMatchObject({
      items: [
        { kind: 'mariadb', resourceId: 'mariadb-1' },
        { kind: 'mongo', resourceId: 'mongo-1' },
        { kind: 'mysql', resourceId: 'mysql-1' },
        { kind: 'postgres', resourceId: 'postgres-1' },
        { kind: 'redis', resourceId: 'redis-1' },
      ],
      total: 5,
    })
    expect(calls).toEqual([
      'mariadb.one:{"mariadbId":"mariadb-1"}',
      'mongo.one:{"mongoId":"mongo-1"}',
      'mysql.one:{"mysqlId":"mysql-1"}',
      'postgres.one:{"postgresId":"postgres-1"}',
      'redis.one:{"redisId":"redis-1"}',
    ])
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

  it('validates virtual project.logsOverview input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.project.logsOverview({
              projectId: 'project-1',
              maxApplications: 0,
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('maxApplications must be a positive integer')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual logs.tailMany input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.logs.tailMany({
              requests: [{ kind: 'compose', composeId: 'compose-1' }],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('requests[0].containerId is required')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual logs.tailMany deployment requests before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.logs.tailMany({
              requests: [{ kind: 'deployment', tail: 10 }],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('requests[0].deploymentId is required')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('keeps project.logsOverview usable when one log source errors', async () => {
    const context = buildExecuteContext(async (procedure, input = {}) => {
      if (procedure === 'project.one') {
        return {
          data: {
            projectId: 'project-1',
            name: 'Demo Project',
            environments: [
              {
                environmentId: 'env-1',
                name: 'production',
                applications: [
                  {
                    applicationId: 'app-idle',
                    name: 'Idle app',
                  },
                  {
                    applicationId: 'app-live',
                    name: 'Live app',
                  },
                ],
                postgres: [
                  {
                    postgresId: 'pg-1',
                    name: 'Primary DB',
                  },
                ],
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
      }

      if (procedure === 'application.readLogs') {
        if (input.applicationId === 'app-idle') {
          throw new Error('No container or service found for: idle-app')
        }

        return {
          data: 'live app logs',
          trace: {
            procedure,
            method: 'GET',
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      }

      if (procedure === 'postgres.readLogs') {
        return {
          data: 'db logs',
          trace: {
            procedure,
            method: 'GET',
            startedAt: 0,
            finishedAt: 1,
            durationMs: 1,
          },
        }
      }

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
    }, 20)

    const result = await runSandboxedFunction({
      code: `
        async ({ dokploy }) => {
          return await dokploy.project.logsOverview({
            projectId: 'project-1',
            includeDatabases: true,
            tail: 20,
          })
        }
      `,
      context: {
        dokploy: context.dokploy,
      },
    })

    expect(result).toMatchObject({
      logs: [],
      result: {
        projectId: 'project-1',
        projectName: 'Demo Project',
        total: 3,
      },
    })
    expect(result.result.items).toEqual([
      expect.objectContaining({
        kind: 'application',
        applicationId: 'app-idle',
        procedure: 'application.readLogs',
        error: {
          message: 'No container or service found for: idle-app',
        },
      }),
      expect.objectContaining({
        kind: 'application',
        applicationId: 'app-live',
        procedure: 'application.readLogs',
        result: 'live app logs',
      }),
      expect.objectContaining({
        kind: 'postgres',
        postgresId: 'pg-1',
        procedure: 'postgres.readLogs',
        result: 'db logs',
      }),
    ])
  })

  it('validates virtual libsql.many input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.libsql.many({
              libsqlIds: ['libsql-1', ''],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('libsqlIds[1] must be a non-empty string')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual database.many input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.many({
              requests: [{ kind: 'redis', passwordType: 'root' }],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('requests[0].passwordType is only supported for mariadb and mysql')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual database.many required IDs and known kinds before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.many({
              requests: [
                { kind: 'mariadb' },
                { kind: 'mongo' },
                { kind: 'sqlite', sqliteId: 'sqlite-1' },
              ],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow(
      'requests[0].mariadbId is required; requests[1].mongoId is required; requests[2].kind must be one of mariadb, mongo, mysql, postgres, redis',
    )

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual tag.bulkAssignPreview input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.tag.bulkAssignPreview({
              projectId: 'project-1',
              tagIds: ['tag-1', ''],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('tagIds[1] must be a non-empty string')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual database.rotatePasswordPreview input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.rotatePasswordPreview({
              kind: 'mysql',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('mysqlId is required')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual database.rotatePasswordPreview kind and type before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.rotatePasswordPreview({
              kind: 'sqlite',
              sqliteId: 'sqlite-1',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('kind must be one of mariadb, mongo, mysql, postgres, redis')

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.rotatePasswordPreview({
              kind: 'postgres',
              postgresId: 'postgres-1',
              type: 'admin',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('type must be one of user, root')

    expect(context.getCalls()).toHaveLength(0)
  })

  it('validates virtual deployment.latestByType input before issuing upstream calls', async () => {
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

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.deployment.latestByType({
              id: 'app-1',
              type: 'invalid',
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow(
      'type must be one of application, compose, server, schedule, previewDeployment, backup, volumeBackup',
    )

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

  it('enforces the execute max call budget for virtual libsql.many fan-out', async () => {
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
    }, 2)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.libsql.many({
              libsqlIds: ['libsql-1', 'libsql-2', 'libsql-3'],
            })
          }
        `,
        context: {
          dokploy: context.dokploy,
        },
      }),
    ).rejects.toThrow('Code Mode execute exceeded 2 API calls.')
  })

  it('enforces the execute max call budget for virtual database.many fan-out', async () => {
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
    }, 2)

    await expect(
      runSandboxedFunction({
        code: `
          async ({ dokploy }) => {
            return await dokploy.database.many({
              requests: [
                { kind: 'postgres', postgresId: 'postgres-1' },
                { kind: 'redis', redisId: 'redis-1' },
                { kind: 'mongo', mongoId: 'mongo-1' },
              ],
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
