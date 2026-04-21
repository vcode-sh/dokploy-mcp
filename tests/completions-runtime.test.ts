import { describe, expect, it } from 'vitest'
import { registerCodeModeCompletions } from '../src/mcp/completions/index.js'
import {
  createCodeModeCompletionProviders,
  createStaticCompletionProvider,
  rankCompletionValues,
} from '../src/mcp/completions/runtime.js'

describe('mcp completions runtime', () => {
  it('ranks completion candidates by exact match, prefix, alias, and dedupes repeated IDs', () => {
    const suggestions = rankCompletionValues(
      [
        { value: 'alpha', aliases: [], index: 0 },
        { value: 'alpha-2', aliases: [], index: 1 },
        { value: 'project-3', aliases: ['alpha'], index: 2 },
        { value: 'project-4', aliases: ['alpha-prod'], index: 3 },
        { value: 'alpha', aliases: ['duplicate'], index: 4 },
      ],
      'alpha',
    )

    expect(suggestions).toEqual(['alpha', 'alpha-2', 'project-3', 'project-4'])
  })

  it('filters static completion providers for enum-like values', async () => {
    const provider = createStaticCompletionProvider(['user', 'root'])

    expect(provider('ro')).toEqual(['root'])
  })

  it('lists bounded project completions and skips malformed search results', async () => {
    const completions = createCodeModeCompletionProviders(async (procedure, input = {}) => {
      expect(procedure).toBe('project.search')
      expect(input).toEqual({ limit: 25 })

      return {
        items: [
          null,
          { name: 'Missing ID' },
          { projectId: 'project-1' },
          { projectId: 'project-2' },
        ],
      }
    })

    await expect(completions.projectId('')).resolves.toEqual(['project-1', 'project-2'])
  })

  it('uses environment.byProjectId when project context is already known', async () => {
    const completions = createCodeModeCompletionProviders(async (procedure, input = {}) => {
      expect(procedure).toBe('environment.byProjectId')
      expect(input).toEqual({ projectId: 'project-1' })

      return [
        { environmentId: 'env-1', name: 'Production' },
        { environmentId: 'env-2', name: 'Preview' },
      ]
    })

    await expect(
      completions.environmentId('prod', {
        arguments: {
          projectId: 'project-1',
        },
      }),
    ).resolves.toEqual(['env-1'])
  })

  it('falls back from q-based environment search to unfiltered search when needed', async () => {
    let callCount = 0
    const completions = createCodeModeCompletionProviders(async (procedure, input = {}) => {
      expect(procedure).toBe('environment.search')
      callCount += 1

      if (callCount === 1) {
        expect(input).toEqual({ limit: 25, q: 'env-2' })
        return { items: [] }
      }

      expect(input).toEqual({ limit: 25 })
      return { items: [{ environmentId: 'env-2', name: 'Preview' }] }
    })

    await expect(completions.environmentId('env-2')).resolves.toEqual(['env-2'])
  })

  it('threads project and environment filters into application completions', async () => {
    const completions = createCodeModeCompletionProviders(async (procedure, input = {}) => {
      expect(procedure).toBe('application.search')
      expect(input).toEqual({
        limit: 25,
        q: 'frontend',
        projectId: 'project-1',
        environmentId: 'env-1',
      })

      return {
        items: [{ applicationId: 'app-1', name: 'Frontend' }],
      }
    })

    await expect(
      completions.applicationId('frontend', {
        arguments: {
          projectId: 'project-1',
          environmentId: 'env-1',
        },
      }),
    ).resolves.toEqual(['app-1'])
  })

  it('matches server completions through alias fields like name, hostname, and IP', async () => {
    const completions = createCodeModeCompletionProviders(async (procedure) => {
      expect(procedure).toBe('server.all')

      return [
        { serverId: 'server-1', name: 'Primary', hostname: 'prod-01', ipAddress: '10.0.0.1' },
        { serverId: 'server-2', name: 'Backup', hostname: 'backup-01', ipAddress: '10.0.0.2' },
      ]
    })

    await expect(completions.serverId('backup')).resolves.toEqual(['server-2'])
  })

  it('uses kind-specific database search procedures and returns empty for unsupported kinds', async () => {
    const completions = createCodeModeCompletionProviders(async (procedure, input = {}) => {
      expect(procedure).toBe('redis.search')
      expect(input).toEqual({
        limit: 25,
        q: 'cache',
      })

      return {
        items: [{ redisId: 'redis-1', name: 'Cache' }],
      }
    })

    await expect(
      completions.databaseId('cache', {
        arguments: {
          kind: 'redis',
        },
      }),
    ).resolves.toEqual(['redis-1'])
    await expect(
      completions.databaseId('cache', {
        arguments: {
          kind: 'unsupported',
        },
      }),
    ).resolves.toEqual([])
  })

  it('treats completion capability registration as a safe no-op when prompts own the completable fields', () => {
    const server = {} as Parameters<typeof registerCodeModeCompletions>[0]

    expect(() => registerCodeModeCompletions(server)).not.toThrow()
  })
})
