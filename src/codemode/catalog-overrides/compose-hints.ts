import { createSharedHints } from './builders.js'
import type { CatalogResponseHints } from './types.js'

export const composeCatalogResponseHints: Record<string, CatalogResponseHints> = {
  ...createSharedHints(['compose.create'], {
    responseHints: [
      'compose.create creates the Compose record shell, but inline composeFile content does not automatically imply a raw Compose deployment path.',
    ],
    notes: [
      'If you want an inline Compose workflow, follow compose.create with compose.update({ composeId, sourceType: "raw", composeFile }) before compose.deploy.',
      'If you want a GitHub-backed workflow, configure the GitHub provider details and composePath instead of treating composeFile as the source of truth.',
    ],
    examples: [
      'await dokploy.compose.create({ name: "demo", environmentId: "env-1", composeType: "docker-compose" })',
      'await dokploy.compose.update({ composeId: "compose-1", sourceType: "raw", composeFile: "services:\\n  web:\\n    image: nginx:alpine" })',
    ],
  }),
  ...createSharedHints(['compose.update'], {
    responseHints: [
      'Use compose.update to make the source mode explicit: sourceType "raw" for inline Compose content, or a Git-backed sourceType plus provider details and composePath for repository-based workflows.',
    ],
    notes: [
      'Inline composeFile plus sourceType "raw" is the safest MCP path when you already have the Compose content in hand.',
      'Git-backed compose deployments still need provider identity and composePath, not just a name and a deploy call.',
    ],
  }),
  ...createSharedHints(['compose.deploy'], {
    responseHints: [
      'compose.deploy expects the Compose record to be fully configured first. MCP preflights the record and returns an actionable validation error when the source mode does not match the configured fields.',
    ],
    notes: [
      'Raw Compose path: sourceType "raw" plus composeFile.',
      'GitHub path: sourceType "github" plus GitHub details and composePath.',
    ],
  }),
}
