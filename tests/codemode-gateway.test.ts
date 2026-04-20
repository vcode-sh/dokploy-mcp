import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../src/api/client.js'
import { invokeProcedure, invokeProcedureWithApi } from '../src/codemode/gateway/api-gateway.js'
import {
  buildTrpcPostBody,
  buildTrpcQueryString,
} from '../src/codemode/gateway/request-normalizer.js'

describe('codemode gateway request normalization', () => {
  it('serializes GET params using tRPC envelope', () => {
    expect(buildTrpcQueryString({ projectId: 'abc123' })).toBe(
      'input=%7B%22json%22%3A%7B%22projectId%22%3A%22abc123%22%7D%7D',
    )
  })

  it('serializes empty GET params to empty tRPC input object', () => {
    expect(buildTrpcQueryString({})).toBe('input=%7B%22json%22%3A%7B%7D%7D')
  })

  it('serializes POST body using tRPC envelope', () => {
    expect(buildTrpcPostBody({ projectId: 'abc123' })).toBe('{"json":{"projectId":"abc123"}}')
  })
})

describe('codemode gateway validation', () => {
  it('rejects unknown procedures', async () => {
    await expect(invokeProcedure('unknown.procedure')).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'unknown.procedure',
    })
  })

  it('rejects missing required fields for known procedures', async () => {
    await expect(invokeProcedure('project.one', {})).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'project.one',
    })
  })

  it('rejects generated string inputs that violate minLength constraints', async () => {
    await expect(invokeProcedure('project.one', { projectId: '' })).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'project.one',
      message: expect.stringContaining('projectId must have length >= 1'),
    })
  })

  it('rejects unexpected input properties when the schema disallows them', async () => {
    await expect(
      invokeProcedureWithApi(
        'application.one',
        {
          applicationId: 'app-1',
          unexpected: true,
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'application.one',
      message: expect.stringContaining('unexpected is not allowed'),
    })
  })

  it('rejects generated integer inputs that are not integers', async () => {
    await expect(
      invokeProcedureWithApi(
        'application.readLogs',
        {
          applicationId: 'app-1',
          tail: 1.5,
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'application.readLogs',
      message: expect.stringContaining('tail must be an integer'),
    })
  })

  it('rejects generated string inputs that violate pattern constraints', async () => {
    await expect(
      invokeProcedureWithApi(
        'docker.restartContainer',
        {
          containerId: 'bad id',
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'docker.restartContainer',
      message: expect.stringContaining('containerId must match pattern'),
    })
  })

  it('accepts null values for anyOf fields and forwards them to POST procedures', async () => {
    const fakeApi = {
      async get() {
        throw new Error('Unexpected GET call')
      },
      async post(_path: string, input?: Record<string, unknown>) {
        expect(input).toEqual({
          name: 'Alpha',
          description: null,
          env: 'KEY=value',
        })
        return { ok: true }
      },
    }

    const result = await invokeProcedureWithApi(
      'project.create',
      {
        name: 'Alpha',
        description: null,
        env: 'KEY=value',
      },
      fakeApi,
    )

    expect(result.data).toEqual({ ok: true })
  })

  it('rejects nested enum violations in object array inputs', async () => {
    await expect(
      invokeProcedureWithApi(
        'settings.updateTraefikPorts',
        {
          additionalPorts: [
            {
              targetPort: 80,
              publishedPort: 443,
              protocol: 'icmp',
            },
          ],
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'settings.updateTraefikPorts',
      message: expect.stringContaining('additionalPorts[0].protocol must be one of tcp, udp, sctp'),
    })
  })

  it('rejects arrays that violate minItems constraints', async () => {
    await expect(
      invokeProcedureWithApi(
        'notification.createEmail',
        {
          appBuildError: false,
          databaseBackup: false,
          dokployBackup: false,
          volumeBackup: false,
          dokployRestart: false,
          name: 'Alerts',
          appDeploy: false,
          dockerCleanup: false,
          serverThreshold: false,
          smtpServer: 'smtp.example.com',
          smtpPort: 587,
          username: 'user',
          password: 'pass',
          fromAddress: 'from@example.com',
          toAddresses: [],
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'notification.createEmail',
      message: expect.stringContaining('toAddresses must contain at least 1 items'),
    })
  })

  it('rejects numeric values below minimum constraints', async () => {
    await expect(
      invokeProcedureWithApi(
        'notification.createEmail',
        {
          appBuildError: false,
          databaseBackup: false,
          dokployBackup: false,
          volumeBackup: false,
          dokployRestart: false,
          name: 'Alerts',
          appDeploy: false,
          dockerCleanup: false,
          serverThreshold: false,
          smtpServer: 'smtp.example.com',
          smtpPort: 0,
          username: 'user',
          password: 'pass',
          fromAddress: 'from@example.com',
          toAddresses: ['to@example.com'],
        },
        {
          async get() {
            throw new Error('Unexpected GET call')
          },
          async post() {
            throw new Error('Unexpected POST call')
          },
        },
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'notification.createEmail',
      message: expect.stringContaining('smtpPort must be >= 1'),
    })
  })

  it('retries retryable GET failures through the gateway', async () => {
    let attempts = 0
    const fakeApi = {
      async get() {
        attempts += 1
        if (attempts === 1) {
          throw new ApiError(503, 'Service Unavailable', { message: 'try again' }, '/project.all')
        }
        return []
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('project.all', {}, fakeApi)
    expect(result.data).toEqual([])
    expect(attempts).toBe(2)
  })

  it('does not retry retryable failures for POST procedures', async () => {
    let attempts = 0
    const fakeApi = {
      async get() {
        throw new Error('Unexpected GET call')
      },
      async post() {
        attempts += 1
        throw new ApiError(503, 'Service Unavailable', { message: 'retry me' }, '/project.create')
      },
    }

    await expect(
      invokeProcedureWithApi('project.create', { name: 'Alpha' }, fakeApi),
    ).rejects.toMatchObject({
      type: 'dokploy_error',
      status: 503,
      procedure: 'project.create',
    })
    expect(attempts).toBe(1)
  })

  it('respects zero gateway retries from env configuration', async () => {
    const previous = process.env.DOKPLOY_MCP_GATEWAY_RETRIES
    process.env.DOKPLOY_MCP_GATEWAY_RETRIES = '0'

    let attempts = 0
    const fakeApi = {
      async get() {
        attempts += 1
        throw new ApiError(503, 'Service Unavailable', { message: 'retry me' }, '/project.all')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    try {
      await expect(invokeProcedureWithApi('project.all', {}, fakeApi)).rejects.toMatchObject({
        type: 'dokploy_error',
        status: 503,
        procedure: 'project.all',
      })
      expect(attempts).toBe(1)
    } finally {
      if (previous === undefined) {
        process.env = Object.fromEntries(
          Object.entries(process.env).filter(([key]) => key !== 'DOKPLOY_MCP_GATEWAY_RETRIES'),
        )
      } else {
        process.env.DOKPLOY_MCP_GATEWAY_RETRIES = previous
      }
    }
  })

  it('maps Dokploy API errors to compact gateway errors', async () => {
    const fakeApi = {
      async get() {
        throw new ApiError(404, 'Not Found', { message: 'missing' }, '/project.one')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'project.one',
      message: 'Dokploy API error (404): missing',
    })
  })

  it('does not probe backend version for ordinary 404 responses', async () => {
    const getBackendVersionInfo = vi.fn().mockResolvedValue({
      state: 'detected',
      version: 'v0.28.8',
    })
    const fakeApi = {
      async get() {
        throw new ApiError(404, 'Not Found', { message: 'missing' }, '/project.one')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'project.one',
      message: 'Dokploy API error (404): missing',
    })
    expect(getBackendVersionInfo).not.toHaveBeenCalled()
  })

  it('falls back to the original 404 when backend version probing throws', async () => {
    const getBackendVersionInfo = vi.fn().mockRejectedValue(new Error('probe failed'))
    const fakeApi = {
      async get() {
        throw new ApiError(
          404,
          'Not Found',
          { message: 'resource missing' },
          '/settings.checkInfrastructureHealth',
        )
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(
      invokeProcedureWithApi('settings.checkInfrastructureHealth', {}, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'settings.checkInfrastructureHealth',
      message: 'Dokploy API error (404): resource missing',
    })
    expect(getBackendVersionInfo).toHaveBeenCalledTimes(1)
  })

  it('maps auth errors to compact gateway errors', async () => {
    const fakeApi = {
      async get() {
        throw new ApiError(403, 'Forbidden', { message: 'denied' }, '/project.one')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 403,
      procedure: 'project.one',
      message: 'Dokploy API error (403): denied',
    })
  })

  it('maps unknown runtime errors to sandbox_error payloads', async () => {
    const fakeApi = {
      async get() {
        throw new Error('boom')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'sandbox_error',
      status: undefined,
      procedure: 'project.one',
      message: 'boom',
    })
  })

  it('passes through preformatted gateway-style errors without rewrapping them', async () => {
    const fakeApi = {
      async get() {
        throw {
          type: 'validation_error',
          procedure: 'project.one',
          message: 'already formatted',
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      type: 'validation_error',
      procedure: 'project.one',
      message: 'already formatted',
    })
  })

  it('returns trace metadata for successful gateway calls', async () => {
    const fakeApi = {
      async get() {
        return [{ projectId: 'p1' }]
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('project.all', {}, fakeApi)
    expect(result.trace.procedure).toBe('project.all')
    expect(result.trace.method).toBe('GET')
    expect(result.trace.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('does not forward MCP-only shaping params upstream for application.one', async () => {
    const fakeApi = {
      async get(_path: string, input?: Record<string, unknown>) {
        expect(input).toEqual({ applicationId: 'app-1' })
        return {
          applicationId: 'app-1',
          name: 'Demo app',
          deployments: [{ deploymentId: 'dep-1' }, { deploymentId: 'dep-2' }],
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      {
        applicationId: 'app-1',
        select: ['name', 'deployments'],
        deploymentLimit: 1,
      },
      fakeApi,
    )

    expect(result.data).toEqual({
      name: 'Demo app',
      deployments: [{ deploymentId: 'dep-1' }],
    })
  })

  it('keeps application.one default behavior unchanged without shaping params', async () => {
    const payload = {
      applicationId: 'app-1',
      name: 'Demo app',
      applicationStatus: 'running',
      deployments: [{ deploymentId: 'dep-1' }, { deploymentId: 'dep-2' }],
    }
    const fakeApi = {
      async get() {
        return payload
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      { applicationId: 'app-1' },
      fakeApi,
    )
    expect(result.data).toEqual(payload)
  })

  it('removes deployments when includeDeployments is false', async () => {
    const fakeApi = {
      async get() {
        return {
          applicationId: 'app-1',
          name: 'Demo app',
          deployments: [{ deploymentId: 'dep-1' }],
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      {
        applicationId: 'app-1',
        select: ['name', 'deployments'],
        includeDeployments: false,
      },
      fakeApi,
    )

    expect(result.data).toEqual({ name: 'Demo app' })
  })

  it('supports deploymentLimit zero for application.one', async () => {
    const fakeApi = {
      async get() {
        return {
          applicationId: 'app-1',
          deployments: [{ deploymentId: 'dep-1' }],
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      {
        applicationId: 'app-1',
        select: ['deployments'],
        deploymentLimit: 0,
      },
      fakeApi,
    )

    expect(result.data).toEqual({ deployments: [] })
  })

  it('ignores unknown fields in application.one select instead of failing', async () => {
    const fakeApi = {
      async get() {
        return {
          applicationId: 'app-1',
          name: 'Demo app',
          watchPaths: ['apps/web'],
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      {
        applicationId: 'app-1',
        select: ['watchPaths', 'missingField'],
      },
      fakeApi,
    )

    expect(result.data).toEqual({
      watchPaths: ['apps/web'],
    })
  })

  it('rejects invalid application.one shaping combinations', async () => {
    const fakeApi = {
      async get() {
        throw new Error('Unexpected GET call')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi(
        'application.one',
        {
          applicationId: 'app-1',
          includeDeployments: false,
          deploymentLimit: 1,
        },
        fakeApi,
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'application.one',
      message: expect.stringContaining(
        'deploymentLimit cannot be used when includeDeployments is false',
      ),
    })
  })

  it('rejects invalid application.one shaping values', async () => {
    const fakeApi = {
      async get() {
        throw new Error('Unexpected GET call')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi(
        'application.one',
        {
          applicationId: 'app-1',
          select: ['name', ''],
          deploymentLimit: -1,
        },
        fakeApi,
      ),
    ).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'application.one',
      message: expect.stringContaining('select[1] must be a non-empty string'),
    })
  })
})

describe('codemode gateway secret redaction', () => {
  const githubProvider = {
    githubId: 'gh-1',
    githubAppName: 'my-app',
    githubClientId: 'Iv23abc',
    githubClientSecret: 'secret-value',
    githubPrivateKey: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----',
    githubWebhookSecret: 'whsec-123',
    gitProviderId: 'gp-1',
  }

  const applicationWithGithub = {
    applicationId: 'app-1',
    name: 'Demo',
    github: githubProvider,
    gitea: null,
    gitlab: null,
    bitbucket: null,
  }

  it('redacts github secrets from application.one by default', async () => {
    const fakeApi = {
      async get() {
        return applicationWithGithub
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      { applicationId: 'app-1' },
      fakeApi,
    )

    const data = result.data as Record<string, unknown>
    const github = data.github as Record<string, unknown>
    expect(github.githubClientSecret).toBe('[REDACTED]')
    expect(github.githubPrivateKey).toBe('[REDACTED]')
    expect(github.githubWebhookSecret).toBe('[REDACTED]')
    expect(github.githubId).toBe('gh-1')
    expect(github.githubAppName).toBe('my-app')
    expect(github.githubClientId).toBe('Iv23abc')
  })

  it('returns secrets when includeSecrets is true', async () => {
    const fakeApi = {
      async get() {
        return applicationWithGithub
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      { applicationId: 'app-1', includeSecrets: true },
      fakeApi,
    )

    const data = result.data as Record<string, unknown>
    const github = data.github as Record<string, unknown>
    expect(github.githubClientSecret).toBe('secret-value')
    expect(github.githubPrivateKey).toContain('BEGIN RSA PRIVATE KEY')
    expect(github.githubWebhookSecret).toBe('whsec-123')
  })

  it('redacts secrets from github.one by default', async () => {
    const fakeApi = {
      async get() {
        return githubProvider
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('github.one', { githubId: 'gh-1' }, fakeApi)

    const data = result.data as Record<string, unknown>
    expect(data.githubClientSecret).toBe('[REDACTED]')
    expect(data.githubPrivateKey).toBe('[REDACTED]')
    expect(data.githubWebhookSecret).toBe('[REDACTED]')
    expect(data.githubId).toBe('gh-1')
  })

  it('returns secrets from github.one when includeSecrets is true', async () => {
    const fakeApi = {
      async get() {
        return githubProvider
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'github.one',
      { githubId: 'gh-1', includeSecrets: true },
      fakeApi,
    )

    const data = result.data as Record<string, unknown>
    expect(data.githubClientSecret).toBe('secret-value')
    expect(data.githubPrivateKey).toContain('BEGIN RSA PRIVATE KEY')
  })

  it('redacts gitea secrets from application.one', async () => {
    const fakeApi = {
      async get() {
        return {
          applicationId: 'app-1',
          github: null,
          gitea: {
            giteaId: 'gt-1',
            clientSecret: 'gitea-secret',
            accessToken: 'gitea-token',
            refreshToken: 'gitea-refresh',
            name: 'my-gitea',
          },
          gitlab: null,
          bitbucket: null,
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      { applicationId: 'app-1' },
      fakeApi,
    )

    const data = result.data as Record<string, unknown>
    const gitea = data.gitea as Record<string, unknown>
    expect(gitea.clientSecret).toBe('[REDACTED]')
    expect(gitea.accessToken).toBe('[REDACTED]')
    expect(gitea.refreshToken).toBe('[REDACTED]')
    expect(gitea.name).toBe('my-gitea')
  })

  it('redacts secrets from gitProvider.getAll array response', async () => {
    const fakeApi = {
      async get() {
        return [
          { gitProviderId: 'gp-1', githubClientSecret: 'sec-1', githubPrivateKey: 'pk-1' },
          { gitProviderId: 'gp-2', clientSecret: 'sec-2', accessToken: 'tok-2' },
        ]
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('gitProvider.getAll', {}, fakeApi)

    const data = result.data as Array<Record<string, unknown>>
    expect(data[0].githubClientSecret).toBe('[REDACTED]')
    expect(data[0].githubPrivateKey).toBe('[REDACTED]')
    expect(data[0].gitProviderId).toBe('gp-1')
    expect(data[1].clientSecret).toBe('[REDACTED]')
    expect(data[1].accessToken).toBe('[REDACTED]')
    expect(data[1].gitProviderId).toBe('gp-2')
  })

  it('does not strip includeSecrets from non-overridden procedures', async () => {
    const fakeApi = {
      async get() {
        return applicationWithGithub
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi(
      'application.one',
      { applicationId: 'app-1', select: ['name', 'github'] },
      fakeApi,
    )

    const data = result.data as Record<string, unknown>
    expect(data.name).toBe('Demo')
    const github = data.github as Record<string, unknown>
    expect(github.githubClientSecret).toBe('[REDACTED]')
  })

  it('redacts private keys from sshKey.one responses', async () => {
    const fakeApi = {
      async get() {
        return {
          sshKeyId: 'ssh-1',
          name: 'prod',
          privateKey:
            '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----',
          publicKey: 'ssh-ed25519 AAAA...',
        }
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('sshKey.one', { sshKeyId: 'ssh-1' }, fakeApi)

    const data = result.data as Record<string, unknown>
    expect(data.privateKey).toBe('[REDACTED]')
    expect(data.publicKey).toBe('ssh-ed25519 AAAA...')
    expect(data.name).toBe('prod')
  })

  it('redacts nested private keys from server.withSSHKey responses', async () => {
    const fakeApi = {
      async get() {
        return [
          {
            serverId: 'srv-1',
            name: 'primary',
            sshKey: {
              sshKeyId: 'ssh-1',
              privateKey: 'secret-private-key',
              publicKey: 'ssh-ed25519 AAAA...',
            },
          },
        ]
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('server.withSSHKey', {}, fakeApi)

    const data = result.data as Array<Record<string, unknown>>
    const sshKey = data[0]?.sshKey as Record<string, unknown>
    expect(sshKey.privateKey).toBe('[REDACTED]')
    expect(sshKey.publicKey).toBe('ssh-ed25519 AAAA...')
    expect(data[0]?.name).toBe('primary')
  })
})
