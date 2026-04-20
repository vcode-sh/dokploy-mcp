import { createGeneratedDokployRuntime } from '../../generated/dokploy-sdk.js'
import type { GatewayCallResult } from '../gateway/api-gateway.js'
import {
  executeVirtualProcedure,
  isVirtualProcedure,
  validateVirtualProcedureInput,
} from '../overrides/virtual-procedures.js'
import {
  type ApplicationManyInput,
  type ApplicationManyOutput,
  buildHelpers,
  type DatabaseManyInput,
  type DatabaseManyOutput,
  type DatabaseRotatePasswordPreviewInput,
  type DatabaseRotatePasswordPreviewOutput,
  type DeploymentLatestByTypeInput,
  type DeploymentLatestByTypeOutput,
  type ExecuteApplicationOneInput,
  type ExecuteContext,
  type ExecuteDokployProcedureMap,
  type GeneratedDokployRuntime,
  type LibsqlManyInput,
  type LibsqlManyOutput,
  type ProjectInfrastructureOverviewInput,
  type ProjectInfrastructureOverviewOutput,
  type ProjectLogsOverviewInput,
  type ProjectLogsOverviewOutput,
  type ProjectOverviewInput,
  type ProjectOverviewOutput,
  type ServerManyInput,
  type ServerManyOutput,
  type TagBulkAssignPreviewInput,
  type TagBulkAssignPreviewOutput,
  type TailManyInput,
  type TailManyOutput,
} from './execute-context-types.js'

type CallExecutor = (
  procedure: string,
  input?: Record<string, unknown>,
) => Promise<GatewayCallResult>

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
    server: {
      ...runtime.server,
      many: (input: ServerManyInput) =>
        dispatchCall(
          'server.many',
          input as unknown as Record<string, unknown>,
        ) as Promise<ServerManyOutput>,
    },
    logs: {
      tailMany: (input: TailManyInput) =>
        dispatchCall(
          'logs.tailMany',
          input as unknown as Record<string, unknown>,
        ) as Promise<TailManyOutput>,
    },
    libsql: {
      ...runtime.libsql,
      many: (input: LibsqlManyInput) =>
        dispatchCall(
          'libsql.many',
          input as unknown as Record<string, unknown>,
        ) as Promise<LibsqlManyOutput>,
    },
    tag: {
      ...runtime.tag,
      bulkAssignPreview: (input: TagBulkAssignPreviewInput) =>
        dispatchCall(
          'tag.bulkAssignPreview',
          input as unknown as Record<string, unknown>,
        ) as Promise<TagBulkAssignPreviewOutput>,
    },
    database: {
      many: (input: DatabaseManyInput) =>
        dispatchCall(
          'database.many',
          input as unknown as Record<string, unknown>,
        ) as Promise<DatabaseManyOutput>,
      rotatePasswordPreview: (input: DatabaseRotatePasswordPreviewInput) =>
        dispatchCall(
          'database.rotatePasswordPreview',
          input as unknown as Record<string, unknown>,
        ) as Promise<DatabaseRotatePasswordPreviewOutput>,
    },
    deployment: {
      ...runtime.deployment,
      latestByType: (input: DeploymentLatestByTypeInput) =>
        dispatchCall(
          'deployment.latestByType',
          input as unknown as Record<string, unknown>,
        ) as Promise<DeploymentLatestByTypeOutput>,
    },
    project: {
      ...runtime.project,
      overview: (input: ProjectOverviewInput) =>
        dispatchCall(
          'project.overview',
          input as unknown as Record<string, unknown>,
        ) as Promise<ProjectOverviewOutput>,
      logsOverview: (input: ProjectLogsOverviewInput) =>
        dispatchCall(
          'project.logsOverview',
          input as unknown as Record<string, unknown>,
        ) as Promise<ProjectLogsOverviewOutput>,
      infrastructureOverview: (input: ProjectInfrastructureOverviewInput) =>
        dispatchCall(
          'project.infrastructureOverview',
          input as unknown as Record<string, unknown>,
        ) as Promise<ProjectInfrastructureOverviewOutput>,
    },
  }

  return {
    dokploy,
    helpers: buildHelpers(),
    getCalls: tracker.getCalls,
  }
}
