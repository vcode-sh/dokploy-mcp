import type { CatalogResponseHints } from './types.js'

export const coreCatalogResponseHints: Record<string, CatalogResponseHints> = {
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
    commonResponseFields: ['projectId', 'name', 'description', 'env', 'environments'],
    responseHints: [
      'Project detail endpoint used to inspect one project, its project-level shared environment variables, and its environments.',
      'The env field is project.env, the shared project environment shown on the project-level UI surface.',
      'Project-level env is separate from environment.env; use environment.one for the environment-level shared env.',
    ],
    examples: [
      'const project = await dokploy.project.one({ projectId: "project-1" })',
      'const projectEnv = project.env',
    ],
    notes: [
      'Generated OpenAPI output schema is currently incomplete for this endpoint, so nested service details may not be visible from the schema alone.',
      'Do not confuse project.env with per-application env or environment.env.',
    ],
  },
  'project.update': {
    commonResponseFields: ['projectId', 'name', 'description', 'env'],
    responseHints: [
      'Updates project-level shared environment variables stored in project.env.',
      'Use this endpoint when the Dokploy UI surface is the project shared environment, not a specific environment tab or app env.',
      'Project-level shared env is a full string replacement through the env input; read project.one first and preserve existing lines when editing one key.',
    ],
    examples: ['await dokploy.project.update({ projectId: "project-1", env: nextProjectEnv })'],
    notes: [
      'project.update targets project.env. environment.update targets environment.env.',
      'Passing an empty env string can clear the project shared env; prefer read-modify-write for edits.',
    ],
  },
  'environment.one': {
    commonResponseFields: ['environmentId', 'projectId', 'name', 'description', 'env'],
    responseHints: [
      'Environment detail endpoint used to inspect environment-level shared environment variables stored in environment.env.',
      'Environment-level env is separate from project.env; use project.one for the project-level shared env shown on the project UI surface.',
    ],
    examples: [
      'const environment = await dokploy.environment.one({ environmentId: "env-1" })',
      'const environmentEnv = environment.env',
    ],
  },
  'environment.update': {
    commonResponseFields: ['environmentId', 'projectId', 'name', 'description', 'env'],
    responseHints: [
      'Updates environment-level shared environment variables stored in environment.env.',
      'Use this endpoint only when the intended Dokploy UI surface is the environment shared env, not project.env.',
      'Environment-level shared env is a full string replacement through the env input; read environment.one first and preserve existing lines when editing one key.',
    ],
    examples: [
      'await dokploy.environment.update({ environmentId: "env-1", env: nextEnvironmentEnv })',
    ],
    notes: [
      'environment.update targets environment.env. project.update targets project.env.',
      'Passing an empty env string can clear the environment shared env; prefer read-modify-write for edits.',
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
