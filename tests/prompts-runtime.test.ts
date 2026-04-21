import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'
import { describe, expect, it } from 'vitest'

import { createCodeModeCompletionProviders } from '../src/mcp/completions/runtime.js'
import {
  createPromptExecutor,
  renderDeployApplicationPrompt,
  renderDiagnoseDeploymentPrompt,
  renderReviewProjectInfrastructurePrompt,
  renderRotateDatabasePasswordPreviewPrompt,
  renderTriageProjectLogsPrompt,
} from '../src/mcp/prompts/runtime.js'

function getTextMessages(result: { messages: { content: { type: string } }[] }) {
  return result.messages
    .filter((message) => message.content.type === 'text')
    .map((message) => ('text' in message.content ? message.content.text : ''))
}

function getResourceLinkUris(result: { messages: { content: { type: string } }[] }) {
  return result.messages
    .filter((message) => message.content.type === 'resource_link')
    .map((message) => ('uri' in message.content ? message.content.uri : ''))
}

describe('mcp prompts runtime', () => {
  it('falls back to unfiltered project search results when q-based completion misses an ID match', async () => {
    const completionExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('project.search')

      if ('q' in input) {
        return { items: [] }
      }

      return {
        items: [
          { projectId: 'project-1', name: 'Alpha' },
          { projectId: 'target-project', name: 'Billing' },
        ],
      }
    })
    const completions = createCodeModeCompletionProviders(completionExecutor)

    await expect(completions.projectId('target')).resolves.toEqual(['target-project'])
  })

  it('returns bounded database ID completions from kind-aware search inputs', async () => {
    const completionExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('postgres.search')
      expect(input).toMatchObject({
        projectId: 'project-1',
        environmentId: 'env-1',
      })

      return {
        items: [
          { postgresId: 'pg-1', name: 'Billing DB' },
          { postgresId: 'pg-2', name: 'Analytics DB' },
        ],
      }
    })
    const completions = createCodeModeCompletionProviders(completionExecutor)

    await expect(
      completions.databaseId('billing', {
        arguments: {
          kind: 'postgres',
          projectId: 'project-1',
          environmentId: 'env-1',
        },
      }),
    ).resolves.toEqual(['pg-1'])
  })

  it('returns empty completions when database kind is unsupported or search fails', async () => {
    const completionExecutor = createPromptExecutor(async () => {
      throw new Error('backend unavailable')
    })
    const completions = createCodeModeCompletionProviders(completionExecutor)

    await expect(completions.databaseId('pg', { arguments: { kind: 'unknown' } })).resolves.toEqual(
      [],
    )
    await expect(completions.projectId('alpha')).resolves.toEqual([])
  })

  it('renders deploy prompts with bounded summary context and resource links', async () => {
    const promptExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('application.one')
      expect(input).toMatchObject({
        applicationId: 'app-1',
        deploymentLimit: 1,
      })

      return {
        applicationId: 'app-1',
        name: 'Frontend',
        applicationStatus: 'running',
        projectId: 'project-1',
        environmentId: 'env-1',
        serverId: 'server-1',
        deployments: [{ deploymentId: 'dep-1', status: 'done' }],
      }
    })

    const result = await renderDeployApplicationPrompt(
      {
        applicationId: 'app-1',
        title: 'Release 42',
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://application/app-1/summary',
      'dokploy://deployment/dep-1/summary',
    ])
    expect(getTextMessages(result).join('\n')).toContain('dokploy.application.deploy')
    expect(getTextMessages(result).join('\n')).toContain('"applicationStatus": "running"')
    expect(getTextMessages(result).join('\n')).toContain('"title": "Release 42"')
  })

  it('renders diagnosis prompts with project logs links when application context resolves', async () => {
    const promptExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('application.one')
      expect(input).toMatchObject({
        applicationId: 'app-2',
      })

      return {
        applicationId: 'app-2',
        name: 'Backend',
        applicationStatus: 'error',
        projectId: 'project-9',
        deployments: [{ deploymentId: 'dep-9', status: 'failed' }],
      }
    })

    const result = await renderDiagnoseDeploymentPrompt(
      {
        applicationId: 'app-2',
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://application/app-2/summary',
      'dokploy://deployment/dep-9/summary',
      'dokploy://project/project-9/logs-overview',
    ])
    expect(getTextMessages(result).join('\n')).toContain('application.readLogs')
    expect(getTextMessages(result).join('\n')).toContain('"status": "failed"')
  })

  it('renders diagnosis prompts without optional links when project and deployment context are absent', async () => {
    const promptExecutor = createPromptExecutor(async () => ({
      applicationId: 'app-3',
      name: 'Worker',
      applicationStatus: 'running',
      deployments: [],
    }))

    const result = await renderDiagnoseDeploymentPrompt(
      {
        applicationId: 'app-3',
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual(['dokploy://application/app-3/summary'])
    expect(getTextMessages(result).join('\n')).toContain('"latestDeployment": null')
  })

  it('degrades deploy prompts cleanly when the target application is stale', async () => {
    const promptExecutor = createPromptExecutor(async () => {
      throw new McpError(ErrorCode.InvalidParams, 'Application app-missing not found')
    })

    const result = await renderDeployApplicationPrompt(
      {
        applicationId: 'app-missing',
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([])
    expect(getTextMessages(result)[0]).toContain('could not be resolved')
    expect(getTextMessages(result)[1]).toContain('application.search')
  })

  it('degrades diagnosis prompts cleanly when the target application is stale', async () => {
    const promptExecutor = createPromptExecutor(async () => {
      throw new McpError(ErrorCode.InvalidParams, 'Application app-missing not found')
    })

    const result = await renderDiagnoseDeploymentPrompt(
      {
        applicationId: 'app-missing',
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([])
    expect(getTextMessages(result)[0]).toContain('could not be resolved')
    expect(getTextMessages(result)[1]).toContain('application.search')
  })

  it('renders infrastructure review prompts with security-aware bounded summaries', async () => {
    const promptExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('project.one')
      expect(input).toEqual({ projectId: 'project-1' })

      return {
        projectId: 'project-1',
        name: 'Alpha',
        description: 'Main project',
        environments: [
          {
            environmentId: 'env-1',
            name: 'Production',
            applications: [{ applicationStatus: 'running' }],
            compose: [{ composeStatus: 'running' }],
            mariadb: [],
            mongo: [],
            mysql: [],
            postgres: [{ postgresId: 'pg-1' }],
            redis: [],
            serverId: 'server-1',
          },
        ],
      }
    })

    const result = await renderReviewProjectInfrastructurePrompt(
      {
        projectId: 'project-1',
        includeServerSecurity: true,
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://project/project-1/infrastructure',
      'dokploy://project/project-1/overview',
    ])
    expect(getTextMessages(result).join('\n')).toContain('server.one')
    expect(getTextMessages(result).join('\n')).toContain('"projectId": "project-1"')
  })

  it('renders infrastructure review prompts from scalar summaries and keeps resource links', async () => {
    const result = await renderReviewProjectInfrastructurePrompt(
      {
        projectId: 'project-scalar',
      },
      async () => 'summary-text',
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://project/project-scalar/infrastructure',
      'dokploy://project/project-scalar/overview',
    ])
    expect(getTextMessages(result).join('\n')).toContain('"value": "summary-text"')
  })

  it('surfaces generic bounded-context errors for infrastructure review failures', async () => {
    const result = await renderReviewProjectInfrastructurePrompt(
      {
        projectId: 'project-err',
      },
      async () => {
        throw new Error('backend unavailable')
      },
    )

    expect(getResourceLinkUris(result)).toEqual([])
    expect(getTextMessages(result)[0]).toContain(
      'could not render bounded prompt context automatically',
    )
    expect(getTextMessages(result)[1]).toContain('project.search')
  })

  it('renders password-rotation previews without leaking secrets', async () => {
    const promptExecutor = createPromptExecutor(async (procedure, input = {}) => {
      expect(procedure).toBe('postgres.one')
      expect(input).toEqual({ postgresId: 'pg-1' })

      return {
        postgresId: 'pg-1',
        name: 'Billing DB',
        appName: 'billing-db',
        environmentId: 'env-1',
        projectId: 'project-1',
      }
    })

    const result = await renderRotateDatabasePasswordPreviewPrompt(
      {
        kind: 'postgres',
        databaseId: 'pg-1',
      },
      promptExecutor,
    )

    const promptText = getTextMessages(result).join('\n')
    expect(promptText).toContain('dokploy.postgres.changePassword')
    expect(promptText).toContain('<REDACTED>')
    expect(promptText).not.toContain('"password": "secret"')
  })

  it('falls back to the raw changePassword procedure when preview metadata is missing', async () => {
    const result = await renderRotateDatabasePasswordPreviewPrompt(
      {
        kind: 'redis',
        databaseId: 'redis-1',
      },
      async () => 'preview-text',
    )

    const promptText = getTextMessages(result).join('\n')
    expect(promptText).toContain('dokploy.redis.changePassword')
    expect(promptText).toContain('"value": "preview-text"')
    expect(promptText).toContain('<REDACTED>')
  })

  it('degrades password-rotation preview prompts when the database target is stale', async () => {
    const result = await renderRotateDatabasePasswordPreviewPrompt(
      {
        kind: 'postgres',
        databaseId: 'pg-missing',
      },
      async () => {
        throw new McpError(ErrorCode.InvalidParams, 'Database pg-missing not found')
      },
    )

    expect(getResourceLinkUris(result)).toEqual([])
    expect(getTextMessages(result)[0]).toContain('could not be resolved')
    expect(getTextMessages(result)[1]).toContain('databaseId')
  })

  it('renders bounded logs triage prompts with overview links and source summaries', async () => {
    const promptExecutor = createPromptExecutor(async (procedure, input = {}) => {
      switch (procedure) {
        case 'project.one':
          expect(input).toEqual({ projectId: 'project-1' })
          return {
            projectId: 'project-1',
            name: 'Alpha',
            environments: [
              {
                environmentId: 'env-1',
                name: 'Production',
                applications: [{ applicationId: 'app-1', name: 'Frontend' }],
                postgres: [{ postgresId: 'pg-1', name: 'Billing DB' }],
              },
            ],
          }
        case 'application.readLogs':
          expect(input).toMatchObject({
            applicationId: 'app-1',
            tail: 25,
          })
          return {
            lines: ['frontend failed readiness probe'],
            truncated: false,
          }
        case 'postgres.readLogs':
          expect(input).toMatchObject({
            postgresId: 'pg-1',
            tail: 25,
          })
          return {
            lines: ['connection refused'],
            truncated: false,
          }
        default:
          throw new Error(`Unexpected procedure ${procedure}`)
      }
    })

    const result = await renderTriageProjectLogsPrompt(
      {
        projectId: 'project-1',
        includeDatabases: true,
        tail: 25,
      },
      promptExecutor,
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://project/project-1/logs-overview',
      'dokploy://project/project-1/overview',
    ])
    expect(getTextMessages(result).join('\n')).toContain('application.readLogs')
    expect(getTextMessages(result).join('\n')).toContain('"total": 2')
  })

  it('renders logs triage prompts from scalar summaries and keeps overview links', async () => {
    const result = await renderTriageProjectLogsPrompt(
      {
        projectId: 'project-scalar',
      },
      async () => 'logs-summary',
    )

    expect(getResourceLinkUris(result)).toEqual([
      'dokploy://project/project-scalar/logs-overview',
      'dokploy://project/project-scalar/overview',
    ])
    expect(getTextMessages(result).join('\n')).toContain('"value": "logs-summary"')
  })

  it('degrades logs triage prompts when the target project is stale', async () => {
    const result = await renderTriageProjectLogsPrompt(
      {
        projectId: 'project-missing',
      },
      async () => {
        throw new McpError(ErrorCode.InvalidParams, 'Project project-missing not found')
      },
    )

    expect(getResourceLinkUris(result)).toEqual([])
    expect(getTextMessages(result)[0]).toContain('could not be resolved')
    expect(getTextMessages(result)[1]).toContain('project.search')
  })
})
