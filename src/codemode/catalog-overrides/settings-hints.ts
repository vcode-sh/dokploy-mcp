import { createSharedHints } from './builders.js'
import type { CatalogResponseHints } from './types.js'

export const settingsCatalogResponseHints: Record<string, CatalogResponseHints> = {
  ...createSharedHints(['settings.health', 'settings.checkInfrastructureHealth'], {
    commonResponseFields: ['status', 'message', 'version'],
    responseHints: [
      'Infrastructure status and health endpoint for Dokploy core services and dependencies.',
    ],
  }),
  'settings.getDockerDiskUsage': {
    commonResponseFields: ['images', 'containers', 'volumes', 'buildCache'],
    responseHints: ['Disk usage read for Docker cleanup planning and capacity audits.'],
  },
  ...createSharedHints(
    [
      'settings.readTraefikConfig',
      'settings.readWebServerTraefikConfig',
      'settings.readMiddlewareTraefikConfig',
      'settings.readTraefikFile',
      'settings.readTraefikEnv',
    ],
    {
      commonResponseFields: ['content', 'path'],
      responseHints: [
        'Read-only Traefik config and env endpoints return raw config text for proxy audits.',
        'These responses are token-heavy because they often return full config files or environment files.',
      ],
      notes: ['Prefer the narrowest config read endpoint available to reduce output volume.'],
    },
  ),
  ...createSharedHints(['settings.getWebServerSettings', 'settings.getTraefikPorts'], {
    commonResponseFields: ['httpPort', 'httpsPort', 'dashboardPort'],
    responseHints: [
      'Infra and proxy settings reads used to inspect the current web server and port configuration.',
    ],
  }),
  ...createSharedHints(
    ['settings.getDokployVersion', 'settings.getReleaseTag', 'settings.getUpdateData'],
    {
      commonResponseFields: ['version', 'releaseTag', 'latestVersion'],
      responseHints: [
        'Version and update status endpoints used for upgrade planning and release audits.',
      ],
    },
  ),
  'settings.getLogCleanupStatus': {
    commonResponseFields: ['enabled', 'schedule', 'retentionDays'],
    responseHints: ['Infra settings read for log cleanup, retention, and storage policy checks.'],
  },
  'settings.readDirectories': {
    commonResponseFields: ['rootDir', 'composeDir', 'uploadDir'],
    responseHints: [
      'Filesystem settings read used to inspect Dokploy directory layout and path configuration.',
    ],
  },
}
