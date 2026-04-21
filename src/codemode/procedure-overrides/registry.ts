import { applicationOneOverride } from './application-one.js'
import { createLogReadOverride, logProcedureNames } from './logs.js'
import { mountsCreateOverride, mountsUpdateOverride } from './mounts.js'
import { dokployResourceConfigOverride } from './resource-config.js'
import {
  transformArrayWithSecretGate,
  transformCertificateSecretResponse,
  transformDataServiceSecretResponse,
  transformDestinationSecretResponse,
  transformProviderStyleSecretResponse,
  transformSshSecretResponse,
  transformWithSecretGate,
} from './secrets.js'
import {
  createIdInputSchema,
  emptyIncludeSecretsInputSchema,
  mapIncludeSecretsInput,
  withIncludeSecrets,
} from './shared.js'
import type { ProcedureOverride } from './types.js'

function createSecretReadOverride(
  idKey: string,
  transformResponse: ProcedureOverride['transformResponse'],
): ProcedureOverride {
  return {
    inputSchema: createIdInputSchema(idKey),
    mapInput: mapIncludeSecretsInput,
    transformResponse,
  }
}

function createSecretListOverride(
  transformResponse: ProcedureOverride['transformResponse'],
): ProcedureOverride {
  return {
    inputSchema: emptyIncludeSecretsInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse,
  }
}

function createTransformOnlyOverride(
  transformResponse: ProcedureOverride['transformResponse'],
): ProcedureOverride {
  return {
    transformResponse,
  }
}

function createResourceConfigSecretOverride(
  transformResponse: ProcedureOverride['transformResponse'],
): ProcedureOverride {
  return {
    ...dokployResourceConfigOverride,
    transformResponse,
  }
}

const sshKeyGenerateInputSchema = withIncludeSecrets({
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['rsa', 'ed25519'],
    },
  },
  additionalProperties: false,
})

export const procedureOverrides: Record<string, ProcedureOverride> = {
  'application.one': applicationOneOverride,
  'application.update': dokployResourceConfigOverride,
  'mounts.create': mountsCreateOverride,
  'mounts.update': mountsUpdateOverride,
  'github.one': createSecretReadOverride('githubId', transformWithSecretGate),
  'github.githubProviders': createSecretListOverride(transformArrayWithSecretGate),
  'gitea.one': createSecretReadOverride('giteaId', transformWithSecretGate),
  'gitea.giteaProviders': createSecretListOverride(transformArrayWithSecretGate),
  'gitlab.one': createSecretReadOverride('gitlabId', transformWithSecretGate),
  'gitlab.gitlabProviders': createSecretListOverride(transformArrayWithSecretGate),
  'bitbucket.one': createSecretReadOverride('bitbucketId', transformWithSecretGate),
  'bitbucket.bitbucketProviders': createSecretListOverride(transformArrayWithSecretGate),
  'gitProvider.getAll': createSecretListOverride(transformArrayWithSecretGate),
  'destination.one': createSecretReadOverride('destinationId', transformDestinationSecretResponse),
  'destination.all': createSecretListOverride(transformDestinationSecretResponse),
  'notification.one': createSecretReadOverride(
    'notificationId',
    transformProviderStyleSecretResponse,
  ),
  'notification.all': createSecretListOverride(transformProviderStyleSecretResponse),
  'certificates.one': createSecretReadOverride('certificateId', transformCertificateSecretResponse),
  'certificates.all': createSecretListOverride(transformCertificateSecretResponse),
  'sso.one': createSecretReadOverride('providerId', transformProviderStyleSecretResponse),
  'server.withSSHKey': createSecretListOverride(transformSshSecretResponse),
  'sshKey.all': createSecretListOverride(transformSshSecretResponse),
  'sshKey.generate': {
    inputSchema: sshKeyGenerateInputSchema,
    mapInput: mapIncludeSecretsInput,
    transformResponse: transformSshSecretResponse,
  },
  'sshKey.one': createSecretReadOverride('sshKeyId', transformSshSecretResponse),
  'sshKey.allForApps': createSecretListOverride(transformSshSecretResponse),
  ...Object.fromEntries(
    [
      'libsql.create',
      'libsql.deploy',
      'libsql.one',
      'mariadb.create',
      'mariadb.deploy',
      'mariadb.one',
      'mongo.create',
      'mongo.deploy',
      'mongo.one',
      'mysql.create',
      'mysql.deploy',
      'mysql.one',
      'postgres.create',
      'postgres.deploy',
      'postgres.one',
      'redis.create',
      'redis.deploy',
      'redis.one',
    ].map((procedure) => [
      procedure,
      createTransformOnlyOverride(transformDataServiceSecretResponse),
    ]),
  ),
  ...Object.fromEntries(
    [
      'libsql.update',
      'mariadb.update',
      'mongo.update',
      'mysql.update',
      'postgres.update',
      'redis.update',
    ].map((procedure) => [
      procedure,
      createResourceConfigSecretOverride(transformDataServiceSecretResponse),
    ]),
  ),
  ...Object.fromEntries(logProcedureNames.map((procedure) => [procedure, createLogReadOverride()])),
}
