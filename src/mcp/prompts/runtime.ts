import {
  ErrorCode,
  type GetPromptResult,
  McpError,
  type PromptMessage,
} from '@modelcontextprotocol/sdk/types.js'
import { getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'
import { type DatabaseKind, supportsPasswordType } from '../completions/runtime.js'
import type { ResourceExecutor } from '../resources/runtime.js'
import { createResourceExecutor, readCodeModeResource } from '../resources/runtime.js'
import { buildDokployResourceUri } from '../resources/shared.js'

export interface DeployApplicationPromptArgs {
  applicationId: string
  title?: string
  description?: string
}

export interface DiagnoseDeploymentPromptArgs {
  applicationId: string
}

export interface ReviewProjectInfrastructurePromptArgs {
  projectId: string
  includeServerSecurity?: boolean
}

export interface RotateDatabasePasswordPreviewPromptArgs {
  kind: DatabaseKind
  databaseId: string
  passwordType?: 'user' | 'root'
}

export interface TriageProjectLogsPromptArgs {
  projectId: string
  environmentId?: string
  includeDatabases?: boolean
  search?: string
  tail?: number
}

interface ParsedJsonResource {
  payload: unknown
  uri: string
}

interface ResourceLinkDefinition {
  uri: string
  name: string
  title: string
  description?: string
}

const DEFAULT_LOG_TAIL = 40

export function createPromptExecutor(baseExecutor?: ResourceExecutor) {
  return createResourceExecutor(baseExecutor)
}

function textMessage(role: PromptMessage['role'], text: string): PromptMessage {
  return {
    role,
    content: {
      type: 'text',
      text,
    },
  }
}

function resourceLinkMessage(
  role: PromptMessage['role'],
  resource: ResourceLinkDefinition,
): PromptMessage {
  return {
    role,
    content: {
      type: 'resource_link',
      uri: resource.uri,
      name: resource.name,
      title: resource.title,
      ...(resource.description ? { description: resource.description } : {}),
    },
  }
}

function createExecuteSnippet(procedure: string, input: Record<string, unknown>) {
  const [moduleName, actionName] = procedure.split('.')
  if (!(moduleName && actionName)) {
    return `return await dokploy.call(${JSON.stringify(procedure)}, ${JSON.stringify(input, null, 2)})`
  }

  return `return await dokploy.${moduleName}.${actionName}(${JSON.stringify(input, null, 2)})`
}

function formatPromptJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function isPromptMissingTarget(error: unknown) {
  if (error instanceof McpError) {
    return error.code === ErrorCode.InvalidParams || /not found|missing/i.test(error.message)
  }

  return error instanceof Error && /not found|missing/i.test(error.message)
}

function formatPromptError(error: unknown) {
  if (error instanceof McpError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Unknown prompt rendering error'
}

function compactArray(value: unknown, limit = 3) {
  return Array.isArray(value) ? value.slice(0, limit) : []
}

function getRelatedResourceUri(payload: unknown, key: string) {
  if (!(isRecord(payload) && isRecord(payload.relatedResources))) {
    return undefined
  }

  const value = getStringOrNull(payload.relatedResources[key])
  return value ?? undefined
}

async function readJsonResource(
  uri: string,
  variables: Record<string, string | string[]>,
  definitionName: string,
  executor: ResourceExecutor,
): Promise<ParsedJsonResource> {
  const result = await readCodeModeResource(uri, variables, definitionName, executor)
  const document = result.contents[0]

  if (!(document && 'text' in document && typeof document.text === 'string')) {
    throw new Error(`Resource ${uri} did not return JSON text`)
  }

  return {
    uri,
    payload: JSON.parse(document.text),
  }
}

function buildApplicationSummaryPreview(payload: unknown) {
  if (!isRecord(payload)) {
    return { value: payload }
  }

  const latestDeployment = isRecord(payload.latestDeployment)
    ? {
        deploymentId: getStringOrNull(payload.latestDeployment.deploymentId),
        status: getStringOrNull(payload.latestDeployment.status),
        createdAt: getStringOrNull(payload.latestDeployment.createdAt),
        updatedAt: getStringOrNull(payload.latestDeployment.updatedAt),
      }
    : null

  return {
    applicationId: getStringOrNull(payload.applicationId),
    name: getStringOrNull(payload.name) ?? getStringOrNull(payload.appName),
    applicationStatus: getStringOrNull(payload.applicationStatus),
    projectId: getStringOrNull(payload.projectId),
    environmentId: getStringOrNull(payload.environmentId),
    serverId: getStringOrNull(payload.serverId),
    latestDeployment,
  }
}

function buildInfrastructurePreview(payload: unknown) {
  if (!isRecord(payload)) {
    return { value: payload }
  }

  return {
    projectId: getStringOrNull(payload.projectId),
    name: getStringOrNull(payload.name),
    description: getStringOrNull(payload.description),
    totals: payload.totals,
    environments: compactArray(payload.environments).map((environment) =>
      isRecord(environment)
        ? {
            environmentId: getStringOrNull(environment.environmentId),
            name: getStringOrNull(environment.name),
            applications: environment.applications,
            compose: environment.compose,
            databases: environment.databases,
            serverIds: compactArray(environment.serverIds, 8),
          }
        : environment,
    ),
    servers: compactArray(payload.servers).map((server) =>
      isRecord(server)
        ? {
            serverId: getStringOrNull(server.serverId),
            name: getStringOrNull(server.name),
            serverStatus: getStringOrNull(server.serverStatus),
            serverType: getStringOrNull(server.serverType),
            ipAddress: getStringOrNull(server.ipAddress),
            security: server.security,
          }
        : server,
    ),
  }
}

function buildLogsPreview(payload: unknown) {
  if (!isRecord(payload)) {
    return { value: payload }
  }

  return {
    projectId: getStringOrNull(payload.projectId),
    projectName: getStringOrNull(payload.projectName),
    total: payload.total,
    sources: compactArray(payload.sources, 6),
    items: compactArray(payload.items, 6),
  }
}

function buildPasswordRotationPreview(payload: unknown) {
  if (!isRecord(payload)) {
    return { value: payload }
  }

  return {
    kind: getStringOrNull(payload.kind),
    resourceId: getStringOrNull(payload.resourceId),
    name: getStringOrNull(payload.name),
    appName: getStringOrNull(payload.appName),
    projectId: getStringOrNull(payload.projectId),
    environmentId: getStringOrNull(payload.environmentId),
    previewOperation: redactSensitiveFields(payload.previewOperation),
  }
}

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveFields(entry))
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /password/i.test(key) ? '<REDACTED>' : redactSensitiveFields(entry),
    ]),
  )
}

function buildPromptFailureResult(options: {
  description: string
  error: unknown
  fallbackTask: string
  missingTargetTask: string
}) {
  const primaryMessage = isPromptMissingTarget(options.error)
    ? options.missingTargetTask
    : `The server could not render bounded prompt context automatically: ${formatPromptError(options.error)}`

  return {
    description: options.description,
    messages: [textMessage('assistant', primaryMessage), textMessage('user', options.fallbackTask)],
  } satisfies GetPromptResult
}

export async function renderDeployApplicationPrompt(
  args: DeployApplicationPromptArgs,
  executor: ResourceExecutor = createPromptExecutor(),
): Promise<GetPromptResult> {
  const applicationSummaryUri = buildDokployResourceUri(
    'application',
    args.applicationId,
    'summary',
  )

  try {
    const summary = await readJsonResource(
      applicationSummaryUri,
      { applicationId: args.applicationId },
      'application-summary',
      executor,
    )
    const applicationPreview = buildApplicationSummaryPreview(summary.payload)
    const deploymentSummaryUri = getRelatedResourceUri(summary.payload, 'deploymentSummary')
    const deployInput = {
      applicationId: args.applicationId,
      ...(args.title ? { title: args.title } : {}),
      ...(args.description ? { description: args.description } : {}),
    }

    return {
      description: 'Guide a safe deploy workflow for a Dokploy application.',
      messages: [
        textMessage(
          'assistant',
          [
            `Resolved bounded application context for ${args.applicationId}.`,
            `Current summary:\n${formatPromptJson(applicationPreview)}`,
            'Review the current state and explain any risk signals before mutating anything.',
          ].join('\n\n'),
        ),
        resourceLinkMessage('assistant', {
          uri: applicationSummaryUri,
          name: 'application-summary',
          title: 'Application Summary',
          description: 'Reusable bounded application context for this workflow.',
        }),
        ...(deploymentSummaryUri
          ? [
              resourceLinkMessage('assistant', {
                uri: deploymentSummaryUri,
                name: 'deployment-summary',
                title: 'Deployment Summary',
                description: 'Latest deployment summary linked from the application context.',
              }),
            ]
          : []),
        textMessage(
          'user',
          [
            `Deploy Dokploy application ${args.applicationId}.`,
            'First summarize the current state and any deployment risk. If the latest deployment looks unhealthy, call that out before proceeding.',
            'If `execute` is available, use:',
            createExecuteSnippet('application.deploy', deployInput),
            'If only raw procedures are available, call `application.deploy` with the same input.',
            'Return the deployment result and any follow-up `dokploy://...` resource links.',
          ].join('\n\n'),
        ),
      ],
    }
  } catch (error) {
    return buildPromptFailureResult({
      description: 'Guide a safe deploy workflow for a Dokploy application.',
      error,
      missingTargetTask: [
        `The applicationId ${JSON.stringify(args.applicationId)} could not be resolved into a bounded application summary.`,
        'Treat it as missing or stale until you confirm the right target.',
      ].join('\n\n'),
      fallbackTask: [
        'Resolve the correct applicationId first.',
        'Use prompt argument completion if available, or inspect `application.search` / the `search` tool before attempting a deploy.',
        'Once the correct ID is confirmed, rerun this prompt and only then call `application.deploy`.',
      ].join('\n\n'),
    })
  }
}

export async function renderDiagnoseDeploymentPrompt(
  args: DiagnoseDeploymentPromptArgs,
  executor: ResourceExecutor = createPromptExecutor(),
): Promise<GetPromptResult> {
  const applicationSummaryUri = buildDokployResourceUri(
    'application',
    args.applicationId,
    'summary',
  )

  try {
    const summary = await readJsonResource(
      applicationSummaryUri,
      { applicationId: args.applicationId },
      'application-summary',
      executor,
    )
    const applicationPreview = buildApplicationSummaryPreview(summary.payload)
    const deploymentSummaryUri = getRelatedResourceUri(summary.payload, 'deploymentSummary')
    const projectId = isRecord(applicationPreview)
      ? getStringOrNull(applicationPreview.projectId)
      : undefined
    const projectLogsUri = projectId
      ? buildDokployResourceUri('project', projectId, 'logs-overview')
      : undefined

    return {
      description: 'Guide a read-only deployment diagnosis workflow for one application.',
      messages: [
        textMessage(
          'assistant',
          [
            `Resolved bounded context for deployment diagnosis of ${args.applicationId}.`,
            `Current application snapshot:\n${formatPromptJson(applicationPreview)}`,
            'Keep this workflow read-only unless the user explicitly asks for a fix.',
          ].join('\n\n'),
        ),
        resourceLinkMessage('assistant', {
          uri: applicationSummaryUri,
          name: 'application-summary',
          title: 'Application Summary',
          description: 'Reusable bounded application context for diagnosis.',
        }),
        ...(deploymentSummaryUri
          ? [
              resourceLinkMessage('assistant', {
                uri: deploymentSummaryUri,
                name: 'deployment-summary',
                title: 'Deployment Summary',
                description: 'Latest deployment summary linked from the application context.',
              }),
            ]
          : []),
        ...(projectLogsUri
          ? [
              resourceLinkMessage('assistant', {
                uri: projectLogsUri,
                name: 'project-logs-overview',
                title: 'Project Logs Overview',
                description: 'Bounded cross-project logs context that can help with diagnosis.',
              }),
            ]
          : []),
        textMessage(
          'user',
          [
            `Diagnose the latest deployment issues for application ${args.applicationId}.`,
            'Start from the bounded context above, then inspect recent logs and deployment history before drawing conclusions.',
            'Useful raw procedures are `application.one`, `deployment.allByType`, and `application.readLogs`.',
            'If `execute` is available, compose those reads into one read-only workflow and end with the most likely cause, impact, and next safe action.',
          ].join('\n\n'),
        ),
      ],
    }
  } catch (error) {
    return buildPromptFailureResult({
      description: 'Guide a read-only deployment diagnosis workflow for one application.',
      error,
      missingTargetTask: [
        `The applicationId ${JSON.stringify(args.applicationId)} could not be resolved for diagnosis.`,
        'Treat it as missing or stale until the correct target is confirmed.',
      ].join('\n\n'),
      fallbackTask: [
        'Resolve the correct applicationId first.',
        'Use completion if available, or inspect `application.search` / the `search` tool and then rerun this prompt.',
        'Do not mutate anything while the target identity is still uncertain.',
      ].join('\n\n'),
    })
  }
}

export async function renderReviewProjectInfrastructurePrompt(
  args: ReviewProjectInfrastructurePromptArgs,
  executor: ResourceExecutor = createPromptExecutor(),
): Promise<GetPromptResult> {
  const projectOverviewUri = buildDokployResourceUri('project', args.projectId, 'overview')
  const projectInfrastructureUri = buildDokployResourceUri(
    'project',
    args.projectId,
    'infrastructure',
  )

  try {
    const infrastructure = await executor('project.infrastructureOverview', {
      projectId: args.projectId,
      includeServerSecurity: args.includeServerSecurity === true,
    })
    const infrastructurePreview = buildInfrastructurePreview(infrastructure)

    return {
      description: 'Guide a bounded project infrastructure review workflow.',
      messages: [
        textMessage(
          'assistant',
          [
            `Resolved bounded infrastructure context for project ${args.projectId}.`,
            `Current infrastructure snapshot:\n${formatPromptJson(infrastructurePreview)}`,
            'Focus on unhealthy environments, skewed counts, missing servers, and risky server security settings when present.',
          ].join('\n\n'),
        ),
        resourceLinkMessage('assistant', {
          uri: projectInfrastructureUri,
          name: 'project-infrastructure',
          title: 'Project Infrastructure',
          description: 'Reusable bounded infrastructure summary for this project.',
        }),
        resourceLinkMessage('assistant', {
          uri: projectOverviewUri,
          name: 'project-overview',
          title: 'Project Overview',
          description: 'Reusable high-level project context for follow-up inspection.',
        }),
        textMessage(
          'user',
          [
            `Review the infrastructure posture of project ${args.projectId}.`,
            'Use the bounded summary above as the starting point, then inspect only the suspicious environments or servers in more detail.',
            'Useful raw procedures are `project.one`, `environment.byProjectId`, `environment.one`, and `server.one`.',
            'Return a concise review covering health signals, likely bottlenecks, and safe next steps without changing anything.',
          ].join('\n\n'),
        ),
      ],
    }
  } catch (error) {
    return buildPromptFailureResult({
      description: 'Guide a bounded project infrastructure review workflow.',
      error,
      missingTargetTask: [
        `The projectId ${JSON.stringify(args.projectId)} could not be resolved into an infrastructure summary.`,
        'Treat it as missing or stale until the project identity is confirmed.',
      ].join('\n\n'),
      fallbackTask: [
        'Resolve the correct projectId first.',
        'Use prompt completion if available, or inspect `project.search` / the `search` tool, then rerun this prompt.',
        'Only perform follow-up inspection once the project target is confirmed.',
      ].join('\n\n'),
    })
  }
}

function buildRotatePasswordPreviewInput(args: RotateDatabasePasswordPreviewPromptArgs) {
  return {
    kind: args.kind,
    ...(args.kind === 'mariadb' ? { mariadbId: args.databaseId } : {}),
    ...(args.kind === 'mongo' ? { mongoId: args.databaseId } : {}),
    ...(args.kind === 'mysql' ? { mysqlId: args.databaseId } : {}),
    ...(args.kind === 'postgres' ? { postgresId: args.databaseId } : {}),
    ...(args.kind === 'redis' ? { redisId: args.databaseId } : {}),
    ...(args.passwordType && supportsPasswordType(args.kind) ? { type: args.passwordType } : {}),
  }
}

function buildUnsupportedPasswordTypeResult(
  args: RotateDatabasePasswordPreviewPromptArgs,
): GetPromptResult | undefined {
  if (!(args.passwordType && !supportsPasswordType(args.kind))) {
    return undefined
  }

  return {
    description:
      'Preview a safe Dokploy database password rotation workflow without mutating anything.',
    messages: [
      textMessage(
        'assistant',
        [
          `The passwordType ${JSON.stringify(args.passwordType)} is not supported for ${args.kind} databases.`,
          'Only `mariadb` and `mysql` support the optional `passwordType` argument in this workflow.',
        ].join('\n\n'),
      ),
      textMessage(
        'user',
        [
          'Confirm the database kind and target ID first.',
          `Rerun this prompt without \`passwordType\` for ${args.kind}, or switch the kind to \`mariadb\` / \`mysql\` if that was the intent.`,
          'Do not attempt a password change until the target identity and password semantics are confirmed.',
        ].join('\n\n'),
      ),
    ],
  }
}

export async function renderRotateDatabasePasswordPreviewPrompt(
  args: RotateDatabasePasswordPreviewPromptArgs,
  executor: ResourceExecutor = createPromptExecutor(),
): Promise<GetPromptResult> {
  const unsupportedPasswordTypeResult = buildUnsupportedPasswordTypeResult(args)
  if (unsupportedPasswordTypeResult) {
    return unsupportedPasswordTypeResult
  }

  const previewInput = buildRotatePasswordPreviewInput(args)

  try {
    const preview = await executor('database.rotatePasswordPreview', previewInput)
    const previewSummary = buildPasswordRotationPreview(preview)
    const operation =
      isRecord(preview) && isRecord(preview.previewOperation) ? preview.previewOperation : null
    const rawProcedure =
      operation && isNonEmptyString(operation.procedure)
        ? operation.procedure
        : `${args.kind}.changePassword`
    const executeInput = {
      ...(isRecord(operation) && isRecord(operation.inputTemplate)
        ? operation.inputTemplate
        : previewInput),
      password: '<REDACTED>',
    }

    return {
      description:
        'Preview a safe Dokploy database password rotation workflow without mutating anything.',
      messages: [
        textMessage(
          'assistant',
          [
            `Resolved bounded password-rotation preview for ${args.kind} database ${args.databaseId}.`,
            `Preview summary:\n${formatPromptJson(previewSummary)}`,
            'The preview intentionally excludes any password value. Do not invent or echo a secret in this workflow.',
          ].join('\n\n'),
        ),
        textMessage(
          'user',
          [
            `Prepare a password-rotation plan for ${args.kind} database ${args.databaseId} without executing it yet.`,
            'Explain the exact Dokploy mutation that would be required, confirm the target identity, and wait for an explicit apply step before changing anything.',
            'If `execute` is available, the eventual mutation would look like:',
            createExecuteSnippet(rawProcedure, executeInput),
            `If only raw procedures are available, call \`${rawProcedure}\` with the same fields and a real password supplied out of band.`,
            'Never print or persist the actual password in the response.',
          ].join('\n\n'),
        ),
      ],
    }
  } catch (error) {
    return buildPromptFailureResult({
      description:
        'Preview a safe Dokploy database password rotation workflow without mutating anything.',
      error,
      missingTargetTask: [
        `The ${args.kind} database target ${JSON.stringify(args.databaseId)} could not be resolved for a password-rotation preview.`,
        'Treat it as missing or stale until the correct database ID is confirmed.',
      ].join('\n\n'),
      fallbackTask: [
        'Resolve the correct database target first.',
        'Use prompt completion for `kind` and `databaseId` if available, or inspect the corresponding `*.search` procedure before rerunning this prompt.',
        'Do not attempt a password change until the target identity is confirmed.',
      ].join('\n\n'),
    })
  }
}

export async function renderTriageProjectLogsPrompt(
  args: TriageProjectLogsPromptArgs,
  executor: ResourceExecutor = createPromptExecutor(),
): Promise<GetPromptResult> {
  const projectOverviewUri = buildDokployResourceUri('project', args.projectId, 'overview')
  const projectLogsUri = buildDokployResourceUri('project', args.projectId, 'logs-overview')
  const tail = args.tail ?? DEFAULT_LOG_TAIL

  try {
    const logsOverview = await executor('project.logsOverview', {
      projectId: args.projectId,
      ...(args.environmentId ? { environmentIds: [args.environmentId] } : {}),
      ...(args.search ? { search: args.search } : {}),
      tail,
      includeDatabases: args.includeDatabases === true,
      maxApplications: 5,
      maxDatabases: 5,
    })
    const logsPreview = buildLogsPreview(logsOverview)

    return {
      description: 'Guide a bounded read-only project logs triage workflow.',
      messages: [
        textMessage(
          'assistant',
          [
            `Resolved bounded logs context for project ${args.projectId}.`,
            `Current logs snapshot:\n${formatPromptJson(logsPreview)}`,
            'Use it to decide which application or database logs deserve deeper inspection next.',
          ].join('\n\n'),
        ),
        resourceLinkMessage('assistant', {
          uri: projectLogsUri,
          name: 'project-logs-overview',
          title: 'Project Logs Overview',
          description: 'Reusable bounded logs overview for this project.',
        }),
        resourceLinkMessage('assistant', {
          uri: projectOverviewUri,
          name: 'project-overview',
          title: 'Project Overview',
          description: 'Reusable project context for mapping log sources back to environments.',
        }),
        textMessage(
          'user',
          [
            `Triage recent logs for project ${args.projectId}.`,
            'Start from the bounded snapshot above, identify the most suspicious sources, and only then read deeper logs for those sources.',
            'Useful raw procedures include `project.one`, `environment.byProjectId`, `application.readLogs`, and the relevant database `*.readLogs` procedures.',
            'Keep the workflow read-only and end with the likely issue, affected resources, and next safe investigative step.',
          ].join('\n\n'),
        ),
      ],
    }
  } catch (error) {
    return buildPromptFailureResult({
      description: 'Guide a bounded read-only project logs triage workflow.',
      error,
      missingTargetTask: [
        `The projectId ${JSON.stringify(args.projectId)} could not be resolved for bounded log triage.`,
        'Treat it as missing or stale until the project identity is confirmed.',
      ].join('\n\n'),
      fallbackTask: [
        'Resolve the correct projectId first.',
        'Use prompt completion if available, or inspect `project.search` / the `search` tool and rerun this prompt.',
        'Only then continue with read-only log inspection.',
      ].join('\n\n'),
    })
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
