import { createSharedHints } from './builders.js'
import type { CatalogResponseHints } from './types.js'

export const securityCatalogResponseHints: Record<string, CatalogResponseHints> = {
  ...createSharedHints(['sshKey.one', 'sshKey.all', 'sshKey.generate', 'sshKey.allForApps'], {
    commonResponseFields: ['sshKeyId', 'name', 'description', 'publicKey', 'privateKey'],
    responseHints: [
      'SSH key read endpoints are used for inventory and key-audit workflows.',
      'Some responses may contain private key material, so MCP redacts it by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw key material is explicitly required.'],
  }),
  'server.withSSHKey': {
    commonResponseFields: ['serverId', 'name', 'ipAddress', 'sshKey'],
    responseHints: [
      'Server inventory endpoint that joins servers with their attached SSH keys.',
      'Nested sshKey objects may contain private key material, so MCP redacts it by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw key material is explicitly required.'],
  },
  ...createSharedHints(['certificates.one', 'certificates.all'], {
    commonResponseFields: ['certificateId', 'name', 'domain', 'certificateData', 'privateKey'],
    responseHints: [
      'TLS certificate reads are useful for certificate inventory, expiry checks, and domain audits.',
      'Certificate records may include a private key, so MCP redacts it by default.',
    ],
    notes: [
      'Certificate bodies are typically safe to inspect, but private keys require includeSecrets.',
    ],
  }),
  ...createSharedHints(['destination.one', 'destination.all'], {
    commonResponseFields: [
      'destinationId',
      'name',
      'provider',
      'bucket',
      'region',
      'endpoint',
      'accessKey',
      'secretAccessKey',
    ],
    responseHints: [
      'Object storage destination config used by backup and export flows.',
      'Read outputs can include accessKey and secretAccessKey, so MCP redacts them by default.',
    ],
    notes: ['Pass includeSecrets: true only when credential inspection is explicitly required.'],
  }),
  ...createSharedHints(['notification.one', 'notification.all'], {
    commonResponseFields: [
      'notificationId',
      'name',
      'provider',
      'appDeploy',
      'databaseBackup',
      'dockerCleanup',
      'serverThreshold',
    ],
    responseHints: [
      'Notification read endpoints return provider-specific alert config for Slack, Discord, Email, Resend, Gotify, Ntfy, Teams, and more.',
      'Read outputs can include smtp password, webhook URL, bot token, API key, access token, user key, or custom headers.',
    ],
    notes: [
      'Secret-bearing provider fields are redacted by default unless includeSecrets is true.',
    ],
  }),
  'sso.one': {
    commonResponseFields: ['providerId', 'issuer', 'domains', 'oidcConfig', 'samlConfig'],
    responseHints: [
      'SSO provider detail endpoint for OIDC and SAML configuration audits.',
      'Provider configs may include clientSecret and private key material, so MCP redacts them by default.',
    ],
    notes: ['Pass includeSecrets: true only when raw SSO secrets are explicitly required.'],
  },
  'project.allForPermissions': {
    commonResponseFields: ['projectId', 'name'],
    responseHints: [
      'Permission-scoped project list for picker and authorization-aware selection flows.',
    ],
    examples: ['await dokploy.project.allForPermissions({})'],
  },
  'server.allForPermissions': {
    commonResponseFields: ['serverId', 'name'],
    responseHints: [
      'Permission-scoped server list for picker and authorization-aware selection flows.',
    ],
  },
}
