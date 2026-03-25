import { createGeneratedDokployRuntime } from '../../generated/dokploy-sdk.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import {
  executeVirtualProcedure,
  isVirtualProcedure,
  validateVirtualProcedureInput,
} from '../overrides/virtual-procedures.js'

type CallExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<GatewayCallResult>

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

export interface ExecuteDokployProcedureMap {
  'application.one': {
    input: ExecuteApplicationOneInput
    output: Record<string, unknown>
  }
  'application.many': {
    input: ApplicationManyInput
    output: ApplicationManyOutput
  }
  'project.overview': {
    input: ProjectOverviewInput
    output: ProjectOverviewOutput
  }
}

type GeneratedModuleRuntime = Record<string, unknown>

interface GeneratedDokployRuntime {
  call: (procedure: string, input?: Record<string, unknown>) => Promise<unknown>
  application: GeneratedModuleRuntime
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
  project: GeneratedModuleRuntime & {
    overview(input: ProjectOverviewInput): Promise<ProjectOverviewOutput>
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

export function createCallTracker(executor: CallExecutor, maxCalls: number) {
  const traces: GatewayCallResult['trace'][] = []
  let callCount = 0

  async function call(procedure: string, input: Record<string, unknown> = {}) {
    callCount += 1
    if (callCount > maxCalls) {
      throw new Error(`Code Mode execute exceeded ${maxCalls} API calls.`)
    }

    const result = await executor(procedure, input)
    traces.push(result.trace)
    return result.data
  }

  return {
    call,
    getCalls() {
      return traces
    },
  }
}

export function createExecuteContext(executor: CallExecutor, maxCalls: number): ExecuteContext {
  const tracker = createCallTracker(executor, maxCalls)
  const dispatchCall = async (procedure: string, input: Record<string, unknown> = {}) => {
    if (!isVirtualProcedure(procedure)) {
      return tracker.call(procedure, input)
    }

    const validationErrors = validateVirtualProcedureInput(procedure, input)
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '))
    }

    return executeVirtualProcedure(procedure, input, {
      call: dispatchCall,
    })
  }
  const runtime = createGeneratedDokployRuntime(dispatchCall) as GeneratedDokployRuntime
  const dokploy = {
    ...runtime,
    call: <P extends keyof ExecuteDokployProcedureMap>(
      procedure: P,
      input: ExecuteDokployProcedureMap[P]['input'],
    ) =>
      dispatchCall(procedure, input as unknown as Record<string, unknown>) as Promise<
        ExecuteDokployProcedureMap[P]['output']
      >,
    application: {
      ...runtime.application,
      one: (input: ExecuteApplicationOneInput) =>
        dispatchCall('application.one', input as unknown as Record<string, unknown>) as Promise<
          ExecuteDokployProcedureMap['application.one']['output']
        >,
      many: (input: ApplicationManyInput) =>
        dispatchCall(
          'application.many',
          input as unknown as Record<string, unknown>,
        ) as Promise<ApplicationManyOutput>,
    },
    project: {
      ...runtime.project,
      overview: (input: ProjectOverviewInput) =>
        dispatchCall(
          'project.overview',
          input as unknown as Record<string, unknown>,
        ) as Promise<ProjectOverviewOutput>,
    },
  } satisfies ExecuteDokployRuntime

  return {
    dokploy,
    helpers: buildHelpers(),
    getCalls: tracker.getCalls,
  }
}
