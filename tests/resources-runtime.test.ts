import { ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'

import {
  createResourceExecutor,
  listCodeModeResources,
  readCodeModeResource,
} from '../src/mcp/resources/runtime.js'
import { createJsonResourceResult } from '../src/mcp/resources/shared.js'

describe('mcp resources runtime', () => {
  it('lists bounded project, application, and server resources', async () => {
    const executor = createResourceExecutor(async (procedure) => {
      switch (procedure) {
        case 'project.search':
          return {
            items: [{ projectId: 'project-1', name: 'Alpha' }],
          }
        case 'application.search':
          return {
            items: [{ applicationId: 'app-1', name: 'Frontend' }],
          }
        case 'server.all':
          return [{ serverId: 'server-1', name: 'Primary' }]
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    await expect(listCodeModeResources(executor)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uri: 'dokploy://project/project-1/overview',
          mimeType: 'application/json',
        }),
        expect.objectContaining({
          uri: 'dokploy://application/app-1/summary',
          mimeType: 'application/json',
        }),
        expect.objectContaining({
          uri: 'dokploy://server/server-1/summary',
          mimeType: 'application/json',
        }),
      ]),
    )
  })

  it('builds project overview resources via virtual procedures and related links', async () => {
    const executor = createResourceExecutor(async (procedure, input = {}) => {
      switch (procedure) {
        case 'project.one':
          return { projectId: 'project-1', name: 'Alpha' }
        case 'environment.byProjectId':
          return [{ environmentId: 'env-1', name: 'Production' }]
        case 'environment.one':
          expect(input).toEqual({ environmentId: 'env-1' })
          return {
            environmentId: 'env-1',
            applications: [{ applicationId: 'app-1' }],
          }
        case 'application.one':
          expect(input).toMatchObject({
            applicationId: 'app-1',
            deploymentLimit: 1,
          })
          return {
            applicationId: 'app-1',
            name: 'Frontend',
            applicationStatus: 'running',
            deployments: [{ deploymentId: 'dep-1', status: 'done' }],
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const result = await readCodeModeResource(
      'dokploy://project/project-1/overview',
      { projectId: 'project-1' },
      'project-overview',
      executor,
    )
    const payload = JSON.parse(result.contents[0]?.text ?? '{}') as Record<string, unknown>

    expect(payload).toMatchObject({
      projectId: 'project-1',
      name: 'Alpha',
      relatedResources: {
        overview: 'dokploy://project/project-1/overview',
        infrastructure: 'dokploy://project/project-1/infrastructure',
        logsOverview: 'dokploy://project/project-1/logs-overview',
      },
    })
    expect(payload.environments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          environmentId: 'env-1',
          applications: [expect.objectContaining({ applicationId: 'app-1' })],
        }),
      ]),
    )
  })

  it('keeps secret-bearing fields out of application summary resources and bounds oversized text', async () => {
    const oversizedDescription = 'x'.repeat(40_000)
    const executor = createResourceExecutor(async (procedure) => {
      if (procedure !== 'application.one') {
        throw new Error(`Unexpected procedure ${procedure}`)
      }

      return {
        applicationId: 'app-1',
        name: 'Frontend',
        description: oversizedDescription,
        applicationStatus: 'running',
        github: {
          privateKey: 'secret-private-key',
          webhookSecret: 'secret-webhook',
        },
        deployments: [{ deploymentId: 'dep-1', status: 'done' }],
      }
    })

    const result = await readCodeModeResource(
      'dokploy://application/app-1/summary',
      { applicationId: 'app-1' },
      'application-summary',
      executor,
    )
    const payload = JSON.parse(result.contents[0]?.text ?? '{}') as Record<string, unknown>
    const serialized = result.contents[0]?.text ?? ''

    expect(payload).toMatchObject({
      applicationId: 'app-1',
      name: 'Frontend',
      relatedResources: {
        deploymentSummary: 'dokploy://deployment/dep-1/summary',
      },
    })
    expect(payload).not.toHaveProperty('github')
    expect(serialized).not.toContain('secret-private-key')
    expect(serialized).not.toContain('secret-webhook')
    expect(Buffer.byteLength(serialized, 'utf8')).toBeLessThan(24 * 1024)
  })

  it('returns invalid params when a deployment summary cannot be resolved', async () => {
    const executor = createResourceExecutor(async (procedure) => {
      if (procedure !== 'deployment.allCentralized') {
        throw new Error(`Unexpected procedure ${procedure}`)
      }

      return []
    })

    await expect(
      readCodeModeResource(
        'dokploy://deployment/dep-missing/summary',
        { deploymentId: 'dep-missing' },
        'deployment-summary',
        executor,
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      message: expect.stringContaining('Deployment dep-missing not found'),
    })
  })

  it('surfaces compatibility-aware upstream failures from resource reads', async () => {
    const executor = createResourceExecutor(async () => {
      throw {
        type: 'dokploy_error',
        status: 404,
        procedure: 'settings.checkInfrastructureHealth',
        message:
          'Dokploy API error (404): Procedure settings.checkInfrastructureHealth exists in the generated MCP catalog but is not available on connected Dokploy server v0.28.8.',
      }
    })

    await expect(
      readCodeModeResource(
        'dokploy://project/project-1/infrastructure',
        { projectId: 'project-1' },
        'project-infrastructure',
        executor,
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.InternalError,
      message: expect.stringContaining('settings.checkInfrastructureHealth'),
    })
  })

  it('rejects unknown resource template names before reading', async () => {
    await expect(
      readCodeModeResource(
        'dokploy://project/project-1/overview',
        { projectId: 'project-1' },
        'missing-template',
      ),
    ).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
      message: expect.stringContaining('Unknown Dokploy resource template'),
    })
  })

  it('maps list-time executor failures to MCP errors', async () => {
    const executor = createResourceExecutor(async () => {
      throw {
        type: 'dokploy_error',
        message: 'backend unavailable',
      }
    })

    await expect(listCodeModeResources(executor)).rejects.toMatchObject({
      code: expect.any(Number),
      message: expect.stringContaining('backend unavailable'),
    })
  })

  it('validates virtual resource inputs before executing helper procedures', async () => {
    const executor = createResourceExecutor(async () => {
      throw new Error('Unexpected upstream call')
    })

    await expect(executor('project.overview', { projectId: '' })).rejects.toThrow(
      'projectId must be a non-empty string',
    )
  })

  it('falls back to truncated object and array summaries for oversized payloads', () => {
    const hugeObject = Object.fromEntries(
      Array.from({ length: 80 }, (_, index) => [`key-${index}`, 'x'.repeat(6_000)]),
    )
    const hugeArray = Array.from({ length: 40 }, () =>
      Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [`field-${index}`, 'y'.repeat(6_000)]),
      ),
    )

    const objectResult = createJsonResourceResult(
      'dokploy://project/project-1/overview',
      hugeObject,
    )
    const arrayResult = createJsonResourceResult(
      'dokploy://project/project-1/logs-overview',
      hugeArray,
    )

    expect(JSON.parse(objectResult.contents[0]?.text ?? '{}')).toMatchObject({
      truncated: true,
      summary: {
        kind: 'object',
      },
    })
    expect(JSON.parse(arrayResult.contents[0]?.text ?? '{}')).toMatchObject({
      truncated: true,
      summary: {
        kind: 'array',
      },
    })
  })
})
