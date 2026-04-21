import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'

import {
  getElicitationSupport,
  safeFormElicitation,
  safeUrlElicitation,
} from '../src/mcp/elicitation/runtime.js'
import {
  buildDeploymentIntentSchema,
  buildPreviewOrApplySchema,
} from '../src/mcp/elicitation/schemas.js'
import {
  createBoundedWorkflowPlan,
  createFallbackWorkflowPlan,
} from '../src/mcp/sampling/runtime.js'

function createMockServer(options: {
  clientCapabilities?: Record<string, unknown>
  createMessageResult?: unknown
  createMessageError?: Error
  elicitInputResult?: unknown
  elicitInputError?: Error
}) {
  return {
    server: {
      getClientCapabilities: () => options.clientCapabilities,
      createMessage: vi.fn(async () => {
        if (options.createMessageError) {
          throw options.createMessageError
        }

        return options.createMessageResult
      }),
      elicitInput: vi.fn(async () => {
        if (options.elicitInputError) {
          throw options.elicitInputError
        }

        return options.elicitInputResult
      }),
    },
  } as unknown as McpServer
}

function createPlannerInput() {
  return {
    workflowKind: 'deploy-application',
    action: 'preview' as const,
    intent: 'Preview a safe deploy.',
    application: {
      applicationId: 'app-1',
      name: 'Frontend',
      appName: 'frontend',
      applicationStatus: 'running',
      projectId: 'project-1',
      environmentId: 'env-1',
      serverId: 'server-1',
      latestDeploymentId: 'dep-1',
    },
    rollout: {
      includeProjectLogs: true,
      tailLines: 40,
    },
  }
}

describe('phase 3 runtime units', () => {
  it('treats an empty elicitation capability object as form support when the server flag is enabled', () => {
    const support = getElicitationSupport(
      createMockServer({
        clientCapabilities: {
          elicitation: {},
        },
      }),
      {
        elicitation: true,
      },
    )

    expect(support).toEqual({
      enabled: true,
      supportsForm: true,
      supportsUrl: false,
    })
  })

  it('disables elicitation support completely when the server flag is off', () => {
    const support = getElicitationSupport(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            form: {},
            url: {},
          },
        },
      }),
      undefined,
    )

    expect(support).toEqual({
      enabled: false,
      supportsForm: false,
      supportsUrl: false,
    })
  })

  it('builds a deterministic fallback plan with bounded deploy defaults', () => {
    expect(createFallbackWorkflowPlan(createPlannerInput())).toMatchObject({
      riskLevel: 'low',
      preflightChecks: expect.arrayContaining([
        expect.stringContaining('Confirm the selected application'),
      ]),
      executionSteps: expect.arrayContaining([
        expect.stringContaining('Do not mutate Dokploy state'),
      ]),
    })
  })

  it('uses the sampled planner output when the client supports sampling and returns valid JSON', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageResult: {
          model: 'phase3-runtime-test',
          role: 'assistant',
          content: {
            type: 'text',
            text: JSON.stringify({
              summary: 'Preview Frontend deploy safely.',
              riskLevel: 'medium',
              preflightChecks: ['Check latest deployment health.'],
              executionSteps: ['Review the planned deploy input only.'],
              followUpChecks: ['Inspect the application summary link.'],
              notes: ['Planner stayed within bounded context.'],
            }),
          },
        },
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result).toMatchObject({
      source: 'sampling',
      plan: {
        riskLevel: 'medium',
        summary: 'Preview Frontend deploy safely.',
      },
    })
  })

  it('parses a sampled JSON object that is wrapped in surrounding prose', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageResult: {
          model: 'phase3-runtime-test',
          role: 'assistant',
          content: {
            type: 'text',
            text: [
              'Here is the bounded deploy plan:',
              '```json',
              JSON.stringify({
                summary: 'Preview the deploy carefully.',
                riskLevel: 'low',
                preflightChecks: ['Check current app status.'],
                executionSteps: ['Stay in preview mode.'],
                followUpChecks: ['Inspect the application summary resource.'],
                notes: ['Plan extracted from fenced JSON.'],
              }),
              '```',
            ].join('\n'),
          },
        },
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result.source).toBe('sampling')
    expect(result.plan.summary).toBe('Preview the deploy carefully.')
  })

  it('falls back cleanly when the sampled planner response is malformed', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageResult: {
          model: 'phase3-runtime-test',
          role: 'assistant',
          content: {
            type: 'text',
            text: 'malformed-plan',
          },
        },
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result.source).toBe('fallback')
    expect(result.plan.summary).toContain('Preview a bounded deploy workflow')
  })

  it('falls back when sampling returns non-text content', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageResult: {
          model: 'phase3-runtime-test',
          role: 'assistant',
          content: {
            type: 'image',
            data: 'ZmFrZQ==',
            mimeType: 'image/png',
          },
        },
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result.source).toBe('fallback')
  })

  it('falls back when sampling raises an error', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageError: new Error('sampling boom'),
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result.source).toBe('fallback')
  })

  it('falls back when sampled JSON omits required plan fields', async () => {
    const result = await createBoundedWorkflowPlan(
      createMockServer({
        clientCapabilities: {
          sampling: {},
        },
        createMessageResult: {
          model: 'phase3-runtime-test',
          role: 'assistant',
          content: {
            type: 'text',
            text: JSON.stringify({
              summary: 'Missing risk level.',
              preflightChecks: ['Check something.'],
            }),
          },
        },
      }),
      {
        sampling: true,
      },
      createPlannerInput(),
    )

    expect(result.source).toBe('fallback')
  })

  it('returns a high fallback risk level when applying over an unhealthy application snapshot', () => {
    const plan = createFallbackWorkflowPlan({
      ...createPlannerInput(),
      action: 'apply',
      application: {
        ...createPlannerInput().application,
        applicationStatus: 'degraded',
      },
    })

    expect(plan.riskLevel).toBe('high')
  })

  it('returns accepted form elicitation content through the safe wrapper', async () => {
    const result = await safeFormElicitation<{ intent: string }>(
      createMockServer({
        clientCapabilities: {
          elicitation: {},
        },
        elicitInputResult: {
          action: 'accept',
          content: {
            intent: 'Deploy carefully.',
          },
        },
      }),
      {
        elicitation: true,
      },
      {
        message: 'What is the deployment intent?',
        requestedSchema: buildDeploymentIntentSchema(),
      },
    )

    expect(result).toEqual({
      status: 'accepted',
      content: {
        intent: 'Deploy carefully.',
      },
    })
  })

  it('returns declined when the client declines form elicitation', async () => {
    const result = await safeFormElicitation<{ action: 'preview' | 'apply' }>(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            form: {},
          },
        },
        elicitInputResult: {
          action: 'decline',
        },
      }),
      {
        elicitation: true,
      },
      {
        message: 'Choose preview or apply.',
        requestedSchema: buildPreviewOrApplySchema(),
      },
    )

    expect(result).toEqual({
      status: 'declined',
    })
  })

  it('returns cancelled when the client cancels form elicitation without content', async () => {
    const result = await safeFormElicitation<{ action: 'preview' | 'apply' }>(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            form: {},
          },
        },
        elicitInputResult: {
          action: 'cancel',
        },
      }),
      {
        elicitation: true,
      },
      {
        message: 'Choose preview or apply.',
        requestedSchema: buildPreviewOrApplySchema(),
      },
    )

    expect(result).toEqual({
      status: 'cancelled',
    })
  })

  it('returns unsupported when URL elicitation is enabled on the server but not negotiated by the client', async () => {
    const result = await safeUrlElicitation(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            form: {},
          },
        },
      }),
      {
        elicitation: true,
      },
      {
        elicitationId: 'elicitation-1',
        message: 'Open an approval page.',
        url: 'https://example.com/approve',
      },
    )

    expect(result).toEqual({
      status: 'unsupported',
    })
  })

  it('returns an error result when elicitation raises a transport-level failure', async () => {
    const result = await safeUrlElicitation(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            url: {},
          },
        },
        elicitInputError: new Error('transport boom'),
      }),
      {
        elicitation: true,
      },
      {
        elicitationId: 'elicitation-1',
        message: 'Open an approval page.',
        url: 'https://example.com/approve',
      },
    )

    expect(result).toEqual({
      status: 'error',
      error: 'transport boom',
    })
  })

  it('returns declined when the client declines a URL elicitation request', async () => {
    const result = await safeUrlElicitation(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            url: {},
          },
        },
        elicitInputResult: {
          action: 'decline',
        },
      }),
      {
        elicitation: true,
      },
      {
        elicitationId: 'elicitation-2',
        message: 'Open an approval page.',
        url: 'https://example.com/approve',
      },
    )

    expect(result).toEqual({
      status: 'declined',
    })
  })

  it('returns cancelled when the client cancels a URL elicitation request', async () => {
    const result = await safeUrlElicitation(
      createMockServer({
        clientCapabilities: {
          elicitation: {
            url: {},
          },
        },
        elicitInputResult: {
          action: 'cancel',
        },
      }),
      {
        elicitation: true,
      },
      {
        elicitationId: 'elicitation-3',
        message: 'Open an approval page.',
        url: 'https://example.com/approve',
      },
    )

    expect(result).toEqual({
      status: 'cancelled',
    })
  })
})
