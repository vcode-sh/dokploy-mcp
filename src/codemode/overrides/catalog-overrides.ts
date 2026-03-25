import type { CatalogEndpoint } from '../../generated/dokploy-catalog.js'

export interface CatalogResponseHints {
  commonResponseFields?: string[]
  responseHints?: string[]
  examples?: string[]
  notes?: string[]
}

export type CatalogEndpointWithHints = CatalogEndpoint & CatalogResponseHints

const catalogResponseHints: Record<string, CatalogResponseHints> = {
  'application.one': {
    commonResponseFields: [
      'name',
      'appName',
      'applicationStatus',
      'mounts',
      'watchPaths',
      'domains',
      'deployments',
    ],
    responseHints: [
      'Heavy detail endpoint for application config, runtime status, mounts, domains, and deployment history.',
      'Deployment history can dominate token usage because entries may include long commit messages.',
    ],
    examples: [
      'await dokploy.application.one({ applicationId: "app-123" })',
      'await dokploy.application.one({ applicationId: "app-123", select: ["name", "watchPaths"], deploymentLimit: 1 })',
      'catalog.get("application.one")',
    ],
    notes: [
      'Generated OpenAPI output schema is currently incomplete for this endpoint, so these are common observed fields rather than a full contract.',
      'MCP adds optional shaping inputs for this endpoint: select, includeDeployments, and deploymentLimit.',
    ],
  },
  'application.many': {
    commonResponseFields: ['items', 'total'],
    responseHints: [
      'MCP-only virtual helper that reads several applications by delegating to application.one.',
      'Preserves input order and supports the same shaping inputs as application.one.',
    ],
    examples: [
      'await dokploy.application.many({ applicationIds: ["app-1", "app-2"], select: ["name", "watchPaths"] })',
    ],
    notes: [
      'This helper is available in execute workflows and is not backed by a Dokploy HTTP endpoint.',
    ],
  },
  'project.all': {
    commonResponseFields: ['projectId', 'name', 'environments'],
    responseHints: ['Commonly returns projects with nested environments and service references.'],
    examples: ['await dokploy.project.all({})'],
  },
  'project.overview': {
    commonResponseFields: ['projectId', 'name', 'environments'],
    responseHints: [
      'MCP-only virtual helper that returns a compact per-environment and per-application project state view.',
      'Per application it focuses on applicationId, name, appName, applicationStatus, domains, mounts, watchPaths, and lastDeployment.',
    ],
    examples: ['await dokploy.project.overview({ projectId: "project-1" })'],
    notes: [
      'This helper is available in execute workflows and is not backed by a Dokploy HTTP endpoint.',
    ],
  },
  'project.one': {
    commonResponseFields: ['projectId', 'name', 'description', 'environments'],
    responseHints: ['Project detail endpoint used to inspect one project and its environments.'],
    notes: [
      'Generated OpenAPI output schema is currently incomplete for this endpoint, so nested service details may not be visible from the schema alone.',
    ],
  },
  'deployment.all': {
    commonResponseFields: ['deploymentId', 'title', 'status', 'createdAt'],
    responseHints: ['Returns deployment history entries ordered for inspection workflows.'],
    examples: ['await dokploy.deployment.all({ applicationId: "app-123" })'],
  },
  'compose.search': {
    commonResponseFields: ['items', 'total'],
    responseHints: ['Search endpoints commonly return paginated results with items and total.'],
    examples: ['await dokploy.compose.search({ name: "wordpress", limit: 5 })'],
  },
}

export function getCatalogResponseHints(procedure: string): CatalogResponseHints | null {
  return catalogResponseHints[procedure] ?? null
}

export function applyCatalogResponseHints(endpoint: CatalogEndpoint): CatalogEndpointWithHints {
  const hints = getCatalogResponseHints(endpoint.procedure)
  return hints ? { ...endpoint, ...hints } : endpoint
}
