import type { GatewayCallResult } from '../gateway/api-gateway.js'

export interface ApplicationShapingInput {
  select?: string[]
  includeDeployments?: boolean
  deploymentLimit?: number
}

export interface ExecuteApplicationOneInput extends ApplicationShapingInput {
  applicationId: string
}

export interface ApplicationManyInput extends ApplicationShapingInput {
  applicationIds: string[]
}

export interface ApplicationManyOutput {
  items: Record<string, unknown>[]
  total: number
}

export interface ServerManyInput {
  serverIds: string[]
  includeSecurity?: boolean
}

export interface ServerManyOutput {
  items: Record<string, unknown>[]
  total: number
}

export type TailManyRequest =
  | {
      kind: 'application'
      applicationId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'compose'
      composeId: string
      containerId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'libsql'
      libsqlId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'mariadb'
      mariadbId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'mongo'
      mongoId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'mysql'
      mysqlId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'postgres'
      postgresId: string
      tail?: number
      since?: string
      search?: string
    }
  | {
      kind: 'redis'
      redisId: string
      tail?: number
      since?: string
      search?: string
    }

export interface TailManyInput {
  requests: TailManyRequest[]
}

export interface TailManyOutput {
  items: Record<string, unknown>[]
  total: number
}

export interface LibsqlManyInput {
  libsqlIds: string[]
}

export interface LibsqlManyOutput {
  items: Record<string, unknown>[]
  total: number
}

export interface ProjectOverviewInput {
  projectId: string
  pageSize?: number
}

export interface ProjectOverviewApplication {
  applicationId: string | null
  name: string | null
  appName: string | null
  applicationStatus: string | null
  domains: unknown[]
  mounts: unknown[]
  watchPaths: unknown[]
  lastDeployment: unknown
}

export interface ProjectOverviewEnvironment {
  environmentId: string
  name: string | null
  applications: ProjectOverviewApplication[]
}

export interface ProjectOverviewOutput {
  projectId: string
  name: string | null
  environments: ProjectOverviewEnvironment[]
}

export interface ProjectInfrastructureOverviewInput {
  projectId: string
  includeServerSecurity?: boolean
}

export interface ProjectLogsOverviewInput {
  projectId: string
  tail?: number
  search?: string
  includeDatabases?: boolean
  maxApplications?: number
  maxDatabases?: number
}

export interface ProjectLogsOverviewSource {
  kind: string
  resourceId: string
  name: string | null
  environmentId: string
  environmentName: string | null
}

export interface ProjectLogsOverviewOutput {
  projectId: string
  projectName: string | null
  sources: ProjectLogsOverviewSource[]
  items: Record<string, unknown>[]
  total: number
}

export interface ProjectInfrastructureStatusSummary {
  total: number
  statusCounts: Record<string, number>
}

export interface ProjectInfrastructureDatabaseSummary {
  mariadb: number
  mongo: number
  mysql: number
  postgres: number
  redis: number
  total: number
}

export interface ProjectInfrastructureSecuritySummary {
  ufw: {
    installed: boolean | null
    active: boolean | null
    defaultIncoming: string | null
  }
  ssh: {
    enabled: boolean | null
    keyAuth: boolean | null
    passwordAuth: boolean | null
    permitRootLogin: string | null
    usePam: boolean | null
  }
  fail2ban: {
    installed: boolean | null
    enabled: boolean | null
    active: boolean | null
    sshEnabled: boolean | null
    sshMode: string | null
  }
}

export interface ProjectInfrastructureOverviewEnvironment {
  environmentId: string
  name: string | null
  description: string | null
  isDefault: boolean
  serverIds: string[]
  applications: ProjectInfrastructureStatusSummary
  compose: ProjectInfrastructureStatusSummary
  databases: ProjectInfrastructureDatabaseSummary
}

export interface ProjectInfrastructureOverviewServer {
  serverId: string | null
  name: string | null
  serverStatus: string | null
  serverType: string | null
  ipAddress: string | null
  lastDeployment: unknown
  security: ProjectInfrastructureSecuritySummary | null
}

export interface ProjectInfrastructureOverviewOutput {
  projectId: string
  name: string | null
  description: string | null
  environments: ProjectInfrastructureOverviewEnvironment[]
  servers: ProjectInfrastructureOverviewServer[]
  totals: {
    environments: number
    applications: number
    compose: number
    databases: number
    servers: number
  }
}

export interface TagBulkAssignPreviewInput {
  projectId: string
  tagIds: string[]
}

export interface TagBulkAssignPreviewOutput {
  projectId: string
  projectName: string | null
  requestedTagIds: string[]
  currentTagIds: string[]
  resolvedTags: Record<string, unknown>[]
  missingTagIds: string[]
  unchangedTagIds: string[]
  toAddTagIds: string[]
  previewOperation: {
    procedure: 'tag.bulkAssign'
    input: {
      projectId: string
      tagIds: string[]
    }
  }
}

export type DatabaseManyRequest =
  | {
      kind: 'mariadb'
      mariadbId: string
      passwordType?: 'user' | 'root'
    }
  | {
      kind: 'mongo'
      mongoId: string
    }
  | {
      kind: 'mysql'
      mysqlId: string
      passwordType?: 'user' | 'root'
    }
  | {
      kind: 'postgres'
      postgresId: string
    }
  | {
      kind: 'redis'
      redisId: string
    }

export interface DatabaseManyInput {
  requests: DatabaseManyRequest[]
  includePasswordRotationPreview?: boolean
}

export interface DatabaseManyItem {
  kind: string
  resourceId: string
  name: string | null
  appName: string | null
  environmentId: string | null
  projectId: string | null
  detail: Record<string, unknown>
  passwordRotationPreview: DatabaseRotatePasswordPreviewOutput['previewOperation'] | null
}

export interface DatabaseManyOutput {
  items: DatabaseManyItem[]
  total: number
}

export type DatabaseRotatePasswordPreviewInput =
  | {
      kind: 'mariadb'
      mariadbId: string
      type?: 'user' | 'root'
    }
  | {
      kind: 'mongo'
      mongoId: string
    }
  | {
      kind: 'mysql'
      mysqlId: string
      type?: 'user' | 'root'
    }
  | {
      kind: 'postgres'
      postgresId: string
    }
  | {
      kind: 'redis'
      redisId: string
    }

export interface DatabaseRotatePasswordPreviewOutput {
  kind: string
  resourceId: string
  name: string | null
  appName: string | null
  environmentId: string | null
  projectId: string | null
  previewOperation: {
    procedure:
      | 'mariadb.changePassword'
      | 'mongo.changePassword'
      | 'mysql.changePassword'
      | 'postgres.changePassword'
      | 'redis.changePassword'
    inputTemplate: Record<string, unknown>
    requiredSecretField: 'password'
  }
}

export interface DeploymentLatestByTypeInput {
  id: string
  type:
    | 'application'
    | 'compose'
    | 'server'
    | 'schedule'
    | 'previewDeployment'
    | 'backup'
    | 'volumeBackup'
}

export interface DeploymentLatestByTypeOutput {
  id: string
  type:
    | 'application'
    | 'compose'
    | 'server'
    | 'schedule'
    | 'previewDeployment'
    | 'backup'
    | 'volumeBackup'
  total: number | null
  latestDeployment: unknown
}

export interface ExecuteDokployProcedureMap {
  'application.one': {
    input: ExecuteApplicationOneInput
    output: Record<string, unknown>
  }
  'application.many': {
    input: ApplicationManyInput
    output: ApplicationManyOutput
  }
  'server.many': {
    input: ServerManyInput
    output: ServerManyOutput
  }
  'logs.tailMany': {
    input: TailManyInput
    output: TailManyOutput
  }
  'libsql.many': {
    input: LibsqlManyInput
    output: LibsqlManyOutput
  }
  'database.many': {
    input: DatabaseManyInput
    output: DatabaseManyOutput
  }
  'database.rotatePasswordPreview': {
    input: DatabaseRotatePasswordPreviewInput
    output: DatabaseRotatePasswordPreviewOutput
  }
  'deployment.latestByType': {
    input: DeploymentLatestByTypeInput
    output: DeploymentLatestByTypeOutput
  }
  'project.overview': {
    input: ProjectOverviewInput
    output: ProjectOverviewOutput
  }
  'project.logsOverview': {
    input: ProjectLogsOverviewInput
    output: ProjectLogsOverviewOutput
  }
  'project.infrastructureOverview': {
    input: ProjectInfrastructureOverviewInput
    output: ProjectInfrastructureOverviewOutput
  }
  'tag.bulkAssignPreview': {
    input: TagBulkAssignPreviewInput
    output: TagBulkAssignPreviewOutput
  }
}

type GeneratedModuleRuntime = Record<string, unknown>

export interface GeneratedDokployRuntime {
  call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
  application: GeneratedModuleRuntime
  deployment: GeneratedModuleRuntime
  libsql: GeneratedModuleRuntime
  server: GeneratedModuleRuntime
  tag: GeneratedModuleRuntime
  project: GeneratedModuleRuntime
  [moduleName: string]: unknown
}

export interface ExecuteDokployRuntime extends GeneratedDokployRuntime {
  call(procedure: string, input?: Record<string, unknown>): Promise<unknown>
  call<P extends keyof ExecuteDokployProcedureMap>(
    procedure: P,
    input: ExecuteDokployProcedureMap[P]['input'],
  ): Promise<ExecuteDokployProcedureMap[P]['output']>
  application: GeneratedModuleRuntime & {
    one(
      input: ExecuteApplicationOneInput,
    ): Promise<ExecuteDokployProcedureMap['application.one']['output']>
    many(input: ApplicationManyInput): Promise<ApplicationManyOutput>
  }
  server: GeneratedModuleRuntime & {
    many(input: ServerManyInput): Promise<ServerManyOutput>
  }
  logs: GeneratedModuleRuntime & {
    tailMany(input: TailManyInput): Promise<TailManyOutput>
  }
  libsql: GeneratedModuleRuntime & {
    many(input: LibsqlManyInput): Promise<LibsqlManyOutput>
  }
  tag: GeneratedModuleRuntime & {
    bulkAssignPreview(input: TagBulkAssignPreviewInput): Promise<TagBulkAssignPreviewOutput>
  }
  database: GeneratedModuleRuntime & {
    many(input: DatabaseManyInput): Promise<DatabaseManyOutput>
    rotatePasswordPreview(
      input: DatabaseRotatePasswordPreviewInput,
    ): Promise<DatabaseRotatePasswordPreviewOutput>
  }
  deployment: GeneratedModuleRuntime & {
    latestByType(input: DeploymentLatestByTypeInput): Promise<DeploymentLatestByTypeOutput>
  }
  project: GeneratedModuleRuntime & {
    overview(input: ProjectOverviewInput): Promise<ProjectOverviewOutput>
    logsOverview(input: ProjectLogsOverviewInput): Promise<ProjectLogsOverviewOutput>
    infrastructureOverview(
      input: ProjectInfrastructureOverviewInput,
    ): Promise<ProjectInfrastructureOverviewOutput>
  }
}

export interface ExecuteContext {
  dokploy: ExecuteDokployRuntime
  helpers: ReturnType<typeof buildHelpers>
  getCalls: () => GatewayCallResult['trace'][]
}

export function buildHelpers() {
  return {
    sleep(ms: number) {
      const clamped = Math.min(Math.max(0, ms), 15_000)
      return new Promise<void>((resolve) => setTimeout(resolve, clamped))
    },
    assert(condition: unknown, message = 'Assertion failed') {
      if (!condition) {
        throw new Error(message)
      }
    },
    pick<T extends Record<string, unknown>, K extends keyof T>(value: T, keys: K[]) {
      return Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>
    },
    limit<T>(items: T[], count: number) {
      return items.slice(0, count)
    },
    selectOne<T>(items: T[], predicate?: (item: T) => boolean) {
      if (!predicate) return items[0] ?? null
      return items.find(predicate) ?? null
    },
    async paginateUntil<T>(
      fetchPage: (offset: number) => Promise<{ items: T[]; total?: number }>,
      predicate: (item: T) => boolean,
      pageSize = 20,
    ) {
      let offset = 0
      while (true) {
        const page = await fetchPage(offset)
        const found = page.items.find(predicate)
        if (found) return found
        if (page.items.length < pageSize) return null
        offset += pageSize
      }
    },
  }
}
