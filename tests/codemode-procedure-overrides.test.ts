import { describe, expect, it } from 'vitest'

import {
  getEffectiveProcedureSchema,
  mapProcedureInput,
  transformProcedureResponse,
} from '../src/codemode/overrides/procedure-overrides.js'

function getInputSchemaProperties(procedure: string) {
  const schema = getEffectiveProcedureSchema(procedure) as {
    inputSchema?: {
      properties?: Record<string, unknown>
    }
  } | null

  expect(schema).not.toBeNull()
  return schema?.inputSchema?.properties ?? {}
}

describe('codemode procedure overrides', () => {
  it('adds includeSecrets to secret-bearing reads and strips it from mapped input', () => {
    const cases = [
      {
        procedure: 'github.githubProviders',
        input: { includeSecrets: true },
        expected: {},
      },
      {
        procedure: 'notification.one',
        input: { notificationId: 'notif-1', includeSecrets: true },
        expected: { notificationId: 'notif-1' },
      },
      {
        procedure: 'destination.all',
        input: { includeSecrets: true },
        expected: {},
      },
      {
        procedure: 'sshKey.one',
        input: { sshKeyId: 'ssh-1', includeSecrets: true },
        expected: { sshKeyId: 'ssh-1' },
      },
    ]

    for (const { procedure, input, expected } of cases) {
      const properties = getInputSchemaProperties(procedure)
      expect(properties).toHaveProperty('includeSecrets')
      expect(mapProcedureInput(procedure, input)).toEqual(expected)
    }
  })

  it('redacts git provider secrets across list reads by default', () => {
    const cases = [
      {
        procedure: 'github.githubProviders',
        data: [
          {
            githubId: 'gh-1',
            githubClientSecret: 'secret-value',
            githubPrivateKey: 'private-key',
            githubWebhookSecret: 'webhook-secret',
          },
        ],
        keys: ['githubClientSecret', 'githubPrivateKey', 'githubWebhookSecret'],
      },
      {
        procedure: 'gitea.giteaProviders',
        data: [
          {
            giteaId: 'gt-1',
            clientSecret: 'client-secret',
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        ],
        keys: ['clientSecret', 'accessToken', 'refreshToken'],
      },
      {
        procedure: 'gitlab.gitlabProviders',
        data: [{ gitlabId: 'gl-1', secret: 'gitlab-secret' }],
        keys: ['secret'],
      },
      {
        procedure: 'bitbucket.bitbucketProviders',
        data: [{ bitbucketId: 'bb-1', appPassword: 'app-pass', apiToken: 'api-token' }],
        keys: ['appPassword', 'apiToken'],
      },
      {
        procedure: 'gitProvider.getAll',
        data: [{ gitProviderId: 'gp-1', clientSecret: 'shared-secret' }],
        keys: ['clientSecret'],
      },
    ]

    for (const { procedure, data, keys } of cases) {
      const redacted = transformProcedureResponse(procedure, {}, data) as Array<
        Record<string, string>
      >

      for (const key of keys) {
        expect(redacted[0]?.[key]).toBe('[REDACTED]')
      }

      expect(transformProcedureResponse(procedure, { includeSecrets: true }, data)).toEqual(data)
    }
  })

  it('redacts git provider secrets inside application response arrays', () => {
    const data = [
      {
        applicationId: 'app-1',
        githubClientSecret: 'test-placeholder-not-a-real-key',
      },
      {
        applicationId: 'app-2',
        githubClientSecret: 'test-placeholder-not-a-real-key-2',
      },
    ]

    const redacted = transformProcedureResponse('github.one', {}, data) as Array<
      Record<string, string>
    >

    expect(redacted[0]?.githubClientSecret).toBe('[REDACTED]')
    expect(redacted[1]?.githubClientSecret).toBe('[REDACTED]')
    expect(transformProcedureResponse('github.one', { includeSecrets: true }, data)).toBe(data)
  })

  it('redacts git provider secrets inside nested arrays', () => {
    const data = {
      applicationId: 'app-1',
      github: [
        {
          name: 'primary',
          privateKey: 'test-placeholder-not-a-real-key',
        },
      ],
    }

    const redacted = transformProcedureResponse('github.one', {}, data) as {
      github: Array<Record<string, string>>
    }

    expect(redacted.github[0]?.privateKey).toBe('[REDACTED]')
  })

  it('preserves identity when git provider redaction does not change a response', () => {
    const data = {
      applicationId: 'app-1',
      github: {
        name: 'primary',
      },
    }

    expect(transformProcedureResponse('github.one', {}, data)).toBe(data)
  })

  it('redacts notification provider secrets by default', () => {
    const notification = {
      notificationId: 'notif-1',
      name: 'alerts',
      webhookUrl: 'https://hooks.example.com/secret',
      password: 'smtp-password',
      appToken: 'gotify-token',
      headers: {
        Authorization: 'Bearer secret',
      },
    }

    const redacted = transformProcedureResponse('notification.one', {}, notification) as Record<
      string,
      unknown
    >

    expect(redacted.webhookUrl).toBe('[REDACTED]')
    expect(redacted.password).toBe('[REDACTED]')
    expect(redacted.appToken).toBe('[REDACTED]')
    expect(redacted.headers).toBe('[REDACTED]')
    expect(redacted.name).toBe('alerts')
    expect(
      transformProcedureResponse('notification.one', { includeSecrets: true }, notification),
    ).toEqual(notification)
  })

  it('redacts destination, certificate, and sso secrets by default', () => {
    const destination = {
      destinationId: 'dest-1',
      name: 'backup-bucket',
      accessKey: 'AKIAEXAMPLE',
      secretAccessKey: 'secret-access-key',
    }
    const certificate = {
      certificateId: 'cert-1',
      domain: 'example.com',
      certificateData: '-----BEGIN CERTIFICATE-----',
      privateKey: '-----BEGIN PRIVATE KEY-----',
    }
    const sso = {
      providerId: 'provider-1',
      oidcConfig: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
      },
      samlConfig: {
        privateKey: 'saml-private-key',
        decryptionPvk: 'decryption-private-key',
        spMetadata: {
          encPrivateKey: 'encrypted-private-key',
        },
      },
    }

    expect(transformProcedureResponse('destination.one', {}, destination)).toEqual({
      destinationId: 'dest-1',
      name: 'backup-bucket',
      accessKey: '[REDACTED]',
      secretAccessKey: '[REDACTED]',
    })
    expect(transformProcedureResponse('certificates.one', {}, certificate)).toEqual({
      certificateId: 'cert-1',
      domain: 'example.com',
      certificateData: '-----BEGIN CERTIFICATE-----',
      privateKey: '[REDACTED]',
    })
    expect(transformProcedureResponse('sso.one', {}, sso)).toEqual({
      providerId: 'provider-1',
      oidcConfig: {
        clientId: 'client-id',
        clientSecret: '[REDACTED]',
      },
      samlConfig: {
        privateKey: '[REDACTED]',
        decryptionPvk: '[REDACTED]',
        spMetadata: {
          encPrivateKey: '[REDACTED]',
        },
      },
    })
  })

  it('redacts database service passwords from mutation and read responses by default', () => {
    const postgres = {
      postgresId: 'pg-1',
      name: 'main-db',
      databaseUser: 'app',
      databasePassword: 'super-secret',
      dockerImage: 'postgres:18-alpine',
    }
    const mysql = {
      mysqlId: 'mysql-1',
      name: 'main-mysql',
      databaseUser: 'app',
      databasePassword: 'secret-db-pass',
      databaseRootPassword: 'secret-root-pass',
    }

    expect(transformProcedureResponse('postgres.deploy', {}, postgres)).toEqual({
      postgresId: 'pg-1',
      name: 'main-db',
      databaseUser: 'app',
      databasePassword: '[REDACTED]',
      dockerImage: 'postgres:18-alpine',
    })
    expect(transformProcedureResponse('mysql.one', {}, mysql)).toEqual({
      mysqlId: 'mysql-1',
      name: 'main-mysql',
      databaseUser: 'app',
      databasePassword: '[REDACTED]',
      databaseRootPassword: '[REDACTED]',
    })
  })

  it('redacts ssh key material by default and preserves it with includeSecrets', () => {
    const sshKey = {
      sshKeyId: 'ssh-1',
      name: 'prod',
      privateKey: 'secret-private-key',
      privateKeyPass: 'secret-passphrase',
      publicKey: 'ssh-ed25519 AAAA...',
    }
    const serverWithKey = [
      {
        serverId: 'srv-1',
        name: 'primary',
        sshKey: {
          sshKeyId: 'ssh-1',
          privateKey: 'secret-private-key',
          encPrivateKey: 'encrypted-private-key',
          publicKey: 'ssh-ed25519 AAAA...',
        },
      },
    ]

    expect(transformProcedureResponse('sshKey.one', {}, sshKey)).toEqual({
      sshKeyId: 'ssh-1',
      name: 'prod',
      privateKey: '[REDACTED]',
      privateKeyPass: '[REDACTED]',
      publicKey: 'ssh-ed25519 AAAA...',
    })
    expect(transformProcedureResponse('server.withSSHKey', {}, serverWithKey)).toEqual([
      {
        serverId: 'srv-1',
        name: 'primary',
        sshKey: {
          sshKeyId: 'ssh-1',
          privateKey: '[REDACTED]',
          encPrivateKey: '[REDACTED]',
          publicKey: 'ssh-ed25519 AAAA...',
        },
      },
    ])
    expect(transformProcedureResponse('sshKey.one', { includeSecrets: true }, sshKey)).toEqual(
      sshKey,
    )
    expect(
      transformProcedureResponse('server.withSSHKey', { includeSecrets: true }, serverWithKey),
    ).toEqual(serverWithKey)
  })

  it('clamps oversized log tail requests before calling readLogs procedures', () => {
    expect(
      mapProcedureInput('application.readLogs', {
        applicationId: 'app-1',
        tail: 5000,
        since: '1h',
      }),
    ).toEqual({
      applicationId: 'app-1',
      tail: 200,
      since: '1h',
    })

    expect(
      mapProcedureInput('compose.readLogs', {
        composeId: 'compose-1',
        containerId: 'container-1',
        tail: 20,
      }),
    ).toEqual({
      composeId: 'compose-1',
      containerId: 'container-1',
      tail: 20,
    })
  })

  it('bounds multiline log text and redacts common secret patterns', () => {
    const logText = [
      'AUTHORIZATION=Bearer top-secret-token',
      'DATABASE_URL=postgres://dokploy:super-secret@db.example.com:5432/app',
      '-----BEGIN PRIVATE KEY-----',
      'key-material',
      '-----END PRIVATE KEY-----',
      ...Array.from({ length: 240 }, (_value, index) => `line ${index + 1}`),
    ].join('\n')

    const shaped = transformProcedureResponse(
      'application.readLogs',
      {},
      {
        logs: logText,
      },
    ) as { logs: string }

    expect(shaped.logs).toContain('[TRUNCATED TO LAST 200 LINES]')
    expect(shaped.logs).toContain('line 41')
    expect(shaped.logs).toContain('line 240')
    expect(shaped.logs).not.toContain('\nline 40\n')
    expect(shaped.logs).not.toContain('Bearer top-secret-token')
    expect(shaped.logs).not.toContain('super-secret@')
    expect(shaped.logs).not.toContain('key-material')
  })

  it('redacts secret patterns that remain inside bounded log output', () => {
    const logText = [
      'AUTHORIZATION=Bearer top-secret-token',
      'DATABASE_URL=postgres://dokploy:super-secret@db.example.com:5432/app',
      '-----BEGIN PRIVATE KEY-----',
      'key-material',
      '-----END PRIVATE KEY-----',
    ].join('\n')

    const shaped = transformProcedureResponse(
      'application.readLogs',
      {},
      {
        logs: logText,
      },
    ) as { logs: string }

    expect(shaped.logs).toContain('AUTHORIZATION=[REDACTED]')
    expect(shaped.logs).toContain('postgres://dokploy:[REDACTED]@db.example.com:5432/app')
    expect(shaped.logs).toContain('[REDACTED PRIVATE KEY]')
    expect(shaped.logs).not.toContain('top-secret-token')
    expect(shaped.logs).not.toContain('super-secret@')
    expect(shaped.logs).not.toContain('key-material')
  })

  it('redacts broader env and URI credential log patterns without over-redacting prose', () => {
    const logText = [
      'DATABASE_DSN=postgres://dokploy:super-secret@db.example.com:5432/app',
      'SENTRY_DSN=https://public:private@sentry.example.com/1',
      'BROKER_URL=amqp://worker:rabbit-secret@queue.example.com/vhost',
      'ENCRYPTION_KEY=test-placeholder-not-a-real-key',
      'AUTHOR=jane',
      'the password field is configured elsewhere',
    ].join('\n')

    const shaped = transformProcedureResponse(
      'application.readLogs',
      {},
      {
        logs: logText,
      },
    ) as { logs: string }

    expect(shaped.logs).toContain('DATABASE_DSN=[REDACTED]')
    expect(shaped.logs).toContain('SENTRY_DSN=[REDACTED]')
    expect(shaped.logs).toContain('amqp://worker:[REDACTED]@queue.example.com/vhost')
    expect(shaped.logs).toContain('ENCRYPTION_KEY=[REDACTED]')
    expect(shaped.logs).toContain('AUTHOR=jane')
    expect(shaped.logs).toContain('the password field is configured elsewhere')
    expect(shaped.logs).not.toContain('super-secret')
    expect(shaped.logs).not.toContain('rabbit-secret')
  })

  it('caps structured log arrays and redacts secrets inside log messages', () => {
    const entries = Array.from({ length: 220 }, (_value, index) => ({
      timestamp: `2026-04-20T10:${String(index).padStart(2, '0')}:00Z`,
      message: `password=secret-${index}`,
      stream: index % 2 === 0 ? 'stdout' : 'stderr',
    }))

    const shaped = transformProcedureResponse('postgres.readLogs', {}, entries) as Array<{
      timestamp: string
      message: string
      stream: string
    }>

    expect(shaped.length).toBeLessThanOrEqual(200)
    expect(shaped[0]?.timestamp).not.toBe('2026-04-20T10:00:00Z')
    expect(shaped.at(-1)?.message).toBe('password=[REDACTED]')
    expect(shaped.some((entry) => entry.message.includes('secret-'))).toBe(false)
  })
})
