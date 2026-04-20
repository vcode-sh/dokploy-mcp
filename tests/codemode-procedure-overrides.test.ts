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
})
