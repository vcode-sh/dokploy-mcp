import { randomUUID } from 'node:crypto'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { safeFormElicitation, safeUrlElicitation } from '../../mcp/elicitation/runtime.js'
import {
  buildApplicationQuerySchema,
  buildApplicationSelectionSchema,
  buildDeploymentIntentSchema,
  buildPreviewOrApplySchema,
  buildRolloutOptionsSchema,
  type IdentifierCandidate,
} from '../../mcp/elicitation/schemas.js'
import type { McpCapabilityFlags } from '../../mcp/registration/types.js'
import { listResourceLinks } from '../../mcp/resources/resource-links.js'
import {
  createResourceExecutor,
  type ResourceExecutor,
  readCodeModeResource,
} from '../../mcp/resources/runtime.js'
import { buildDokployResourceUri, extractItems, getOptionalId } from '../../mcp/resources/shared.js'
import { createBoundedWorkflowPlan } from '../../mcp/sampling/runtime.js'
import { createCallTracker } from '../context/execute-context-runtime.js'
import { invokeProcedure } from '../gateway/api-gateway.js'
import { resolveSandboxLimits } from '../sandbox/limits.js'
import { getStringOrNull, isRecord } from '../virtual-procedures/shared.js'

export interface DeployApplicationWorkflowInput {
  kind: 'deploy-application'
  applicationId?: string
  applicationQuery?: string
  projectId?: string
  environmentId?: string
  intent?: string
  action?: 'preview' | 'apply'
  rollout?: {
    includeProjectLogs?: boolean
    tailLines?: number
    waitForRollout?: boolean
    pollIntervalMs?: number
    maxPolls?: number
  }
  title?: string
  description?: string
  approvalUrl?: string
}

interface WorkflowRunnerOptions {
  server: McpServer
  capabilityFlags?: McpCapabilityFlags
  signal?: AbortSignal
}

interface ApplicationCandidate {
  applicationId: string
  title: string
}

interface ApplicationPreview {
  applicationId: string
  name: string | null
  appName: string | null
  applicationStatus: string | null
  projectId: string | null
  environmentId: string | null
  serverId: string | null
  latestDeploymentId: string | null
}

interface RolloutOptions {
  includeProjectLogs: boolean
  tailLines: number
  waitForRollout: boolean
  pollIntervalMs: number
  maxPolls: number
}

type WorkflowActionResolution =
  | {
      status: 'resolved'
      action: 'preview' | 'apply'
    }
  | {
      status: 'cancelled'
      message: string
    }

interface PreparedDeployApplicationTask {
  input: DeployApplicationWorkflowInput
  executor: ResourceExecutor
  application: ApplicationPreview
  resolved: ReturnType<typeof buildResolvedInput>
  rollout: RolloutOptions
  planResult: Awaited<ReturnType<typeof createBoundedWorkflowPlan>>
}

type DeployApplicationPreparation =
  | {
      status: 'completed'
      getCalls: () => unknown[]
      result: Record<string, unknown>
    }
  | ({
      status: 'ready-to-apply'
      getCalls: () => unknown[]
    } & PreparedDeployApplicationTask)

const DEFAULT_ROLLOUT_POLL_INTERVAL_MS = 1_500
const MAX_ROLLOUT_POLL_INTERVAL_MS = 10_000
const DEFAULT_ROLLOUT_MAX_POLLS = 20
const MAX_ROLLOUT_MAX_POLLS = 120

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function normalizeString(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function clampPollIntervalMs(value: number | undefined, fallback: number) {
  if (!(typeof value === 'number' && Number.isInteger(value) && value > 0)) {
    return fallback
  }

  return Math.min(value, MAX_ROLLOUT_POLL_INTERVAL_MS)
}

function clampMaxPolls(value: number | undefined, fallback: number) {
  if (!(typeof value === 'number' && Number.isInteger(value) && value > 0)) {
    return fallback
  }

  return Math.min(value, MAX_ROLLOUT_MAX_POLLS)
}

function createAbortError() {
  const error = new Error('Workflow execution was aborted.')
  error.name = 'AbortError'
  return error
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw createAbortError()
  }
}

async function sleepWithSignal(milliseconds: number, signal?: AbortSignal) {
  throwIfAborted(signal)

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      cleanup()
      resolve()
    }, milliseconds)

    const onAbort = () => {
      cleanup()
      reject(createAbortError())
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function createWorkflowExecutor() {
  const tracker = createCallTracker(invokeProcedure, resolveSandboxLimits().maxCalls)
  return {
    executor: createResourceExecutor((procedure, input) => tracker.call(procedure, input)),
    getCalls: tracker.getCalls,
  }
}

function buildApplicationCandidateTitle(value: Record<string, unknown>, applicationId: string) {
  const name = getStringOrNull(value.name) ?? getStringOrNull(value.appName) ?? applicationId
  const description = getStringOrNull(value.description)
  const title = description
    ? `${name} (${applicationId}) - ${description}`
    : `${name} (${applicationId})`
  return truncateText(title, 120)
}

function toApplicationCandidates(value: unknown): ApplicationCandidate[] {
  return extractItems(value).flatMap((entry) => {
    if (!isRecord(entry)) {
      return []
    }

    const applicationId = getOptionalId(entry, 'applicationId')
    if (!applicationId) {
      return []
    }

    return [
      {
        applicationId,
        title: buildApplicationCandidateTitle(entry, applicationId),
      },
    ]
  })
}

async function readJsonResource(
  executor: ResourceExecutor,
  uri: string,
  definitionName: string,
  variables: Record<string, string>,
) {
  const result = await readCodeModeResource(uri, variables, definitionName, executor)
  const document = result.contents[0]

  if (!(document && 'text' in document && typeof document.text === 'string')) {
    throw new Error(`Resource ${definitionName} did not return JSON text`)
  }

  return JSON.parse(document.text)
}

function compactApplicationPreview(value: unknown): ApplicationPreview {
  if (!isRecord(value)) {
    throw new Error('Application summary payload is not an object')
  }

  const latestDeployment = isRecord(value.latestDeployment) ? value.latestDeployment : null
  return {
    applicationId: getStringOrNull(value.applicationId) ?? 'unknown',
    name: getStringOrNull(value.name),
    appName: getStringOrNull(value.appName),
    applicationStatus: getStringOrNull(value.applicationStatus),
    projectId: getStringOrNull(value.projectId),
    environmentId: getStringOrNull(value.environmentId),
    serverId: getStringOrNull(value.serverId),
    latestDeploymentId: latestDeployment ? getStringOrNull(latestDeployment.deploymentId) : null,
  }
}

function compactLogsPreview(value: unknown) {
  if (!isRecord(value)) {
    return undefined
  }

  const items = extractItems(value.items).slice(0, 6)
  const hasRenderableItems = items.some(
    (item) => isRecord(item) && Object.hasOwn(item, 'result') && item.result !== undefined,
  )
  if (!hasRenderableItems) {
    return undefined
  }

  return {
    projectId: getStringOrNull(value.projectId),
    projectName: getStringOrNull(value.projectName),
    total: value.total,
    sources: extractItems(value.sources).slice(0, 6),
    items,
  }
}

function defaultRolloutOptions(
  action: 'preview' | 'apply',
  input: DeployApplicationWorkflowInput['rollout'],
): RolloutOptions {
  return {
    includeProjectLogs: input?.includeProjectLogs ?? action === 'apply',
    tailLines: input?.tailLines ?? 40,
    waitForRollout: input?.waitForRollout ?? false,
    pollIntervalMs: clampPollIntervalMs(input?.pollIntervalMs, DEFAULT_ROLLOUT_POLL_INTERVAL_MS),
    maxPolls: clampMaxPolls(input?.maxPolls, DEFAULT_ROLLOUT_MAX_POLLS),
  }
}

function normalizeRolloutOptions(
  value: Record<string, string | number | boolean | string[]>,
  fallback: RolloutOptions,
): RolloutOptions {
  return {
    includeProjectLogs:
      typeof value.includeProjectLogs === 'boolean'
        ? value.includeProjectLogs
        : fallback.includeProjectLogs,
    tailLines:
      typeof value.tailLines === 'number' &&
      Number.isInteger(value.tailLines) &&
      value.tailLines >= 0 &&
      value.tailLines <= 120
        ? value.tailLines
        : fallback.tailLines,
    waitForRollout:
      typeof value.waitForRollout === 'boolean' ? value.waitForRollout : fallback.waitForRollout,
    pollIntervalMs: clampPollIntervalMs(
      typeof value.pollIntervalMs === 'number' ? value.pollIntervalMs : undefined,
      fallback.pollIntervalMs,
    ),
    maxPolls: clampMaxPolls(
      typeof value.maxPolls === 'number' ? value.maxPolls : undefined,
      fallback.maxPolls,
    ),
  }
}

async function resolveApplicationId(
  input: DeployApplicationWorkflowInput,
  executor: ResourceExecutor,
  options: WorkflowRunnerOptions,
) {
  const providedApplicationId = normalizeString(input.applicationId)
  if (providedApplicationId) {
    return {
      status: 'resolved' as const,
      applicationId: providedApplicationId,
      candidates: [] as ApplicationCandidate[],
    }
  }

  let applicationQuery = normalizeString(input.applicationQuery)
  if (!applicationQuery) {
    const queryResult = await safeFormElicitation<{ applicationQuery: string }>(
      options.server,
      options.capabilityFlags,
      {
        message:
          'This deploy workflow needs an application target. Provide a Dokploy application name or ID.',
        requestedSchema: buildApplicationQuerySchema(),
      },
    )

    if (queryResult.status === 'accepted') {
      applicationQuery = normalizeString(queryResult.content.applicationQuery)
    }

    if (!applicationQuery) {
      return {
        status: 'needs-input' as const,
        message:
          'Provide workflow.applicationId or workflow.applicationQuery, or enable form elicitation to resolve the target interactively.',
        candidates: [] as ApplicationCandidate[],
      }
    }
  }

  try {
    const searchResults = await executor('application.search', {
      limit: 8,
      q: applicationQuery,
      ...(normalizeString(input.projectId) ? { projectId: normalizeString(input.projectId) } : {}),
      ...(normalizeString(input.environmentId)
        ? { environmentId: normalizeString(input.environmentId) }
        : {}),
    })

    const candidates = toApplicationCandidates(searchResults)
    if (candidates.length === 0) {
      return {
        status: 'needs-input' as const,
        message: `No Dokploy applications matched ${JSON.stringify(applicationQuery)}.`,
        candidates,
      }
    }

    if (candidates.length === 1) {
      return {
        status: 'resolved' as const,
        applicationId: candidates[0]!.applicationId,
        candidates,
      }
    }

    const selectionSchemaCandidates: IdentifierCandidate[] = candidates.map((candidate) => ({
      value: candidate.applicationId,
      title: candidate.title,
    }))
    const selectionResult = await safeFormElicitation<{ applicationId: string }>(
      options.server,
      options.capabilityFlags,
      {
        message:
          'Multiple Dokploy applications matched. Choose the exact application to use for this deployment.',
        requestedSchema: buildApplicationSelectionSchema(selectionSchemaCandidates),
      },
    )

    if (selectionResult.status === 'accepted') {
      return {
        status: 'resolved' as const,
        applicationId: selectionResult.content.applicationId,
        candidates,
      }
    }

    return {
      status: 'needs-input' as const,
      message:
        'Multiple Dokploy applications matched. Rerun with workflow.applicationId or use form elicitation to choose a target.',
      candidates,
    }
  } catch (error) {
    return {
      status: 'needs-input' as const,
      message: `The server could not search for applications automatically: ${
        error instanceof Error ? error.message : String(error)
      }`,
      candidates: [] as ApplicationCandidate[],
    }
  }
}

async function resolveDeploymentIntent(
  input: DeployApplicationWorkflowInput,
  options: WorkflowRunnerOptions,
  application: ApplicationPreview,
) {
  const providedIntent = normalizeString(input.intent)
  if (providedIntent) {
    return providedIntent
  }

  const applicationLabel = application.name ?? application.appName ?? application.applicationId
  const defaultIntent = `Deploy ${applicationLabel} safely.`
  const intentResult = await safeFormElicitation<{ intent: string }>(
    options.server,
    options.capabilityFlags,
    {
      message: 'What is the deployment trying to accomplish?',
      requestedSchema: buildDeploymentIntentSchema(defaultIntent),
    },
  )

  if (intentResult.status === 'accepted') {
    return normalizeString(intentResult.content.intent) ?? defaultIntent
  }

  return defaultIntent
}

async function resolveWorkflowAction(
  input: DeployApplicationWorkflowInput,
  options: WorkflowRunnerOptions,
): Promise<WorkflowActionResolution> {
  if (input.action) {
    return {
      status: 'resolved' as const,
      action: input.action,
    }
  }

  const actionResult = await safeFormElicitation<{ action: 'preview' | 'apply' }>(
    options.server,
    options.capabilityFlags,
    {
      message: 'Choose whether to preview the deployment plan or apply it now.',
      requestedSchema: buildPreviewOrApplySchema(),
    },
  )

  if (actionResult.status === 'accepted') {
    return {
      status: 'resolved' as const,
      action: actionResult.content.action === 'apply' ? 'apply' : 'preview',
    }
  }

  if (actionResult.status === 'declined' || actionResult.status === 'cancelled') {
    return {
      status: 'cancelled' as const,
      message: 'The deploy workflow was cancelled before an execution mode was chosen.',
    }
  }

  return {
    status: 'resolved' as const,
    action: 'preview' as const,
  }
}

async function resolveRollout(
  input: DeployApplicationWorkflowInput,
  action: 'preview' | 'apply',
  options: WorkflowRunnerOptions,
) {
  const fallback = defaultRolloutOptions(action, input.rollout)
  if (action !== 'apply') {
    return fallback
  }

  if (
    input.rollout?.includeProjectLogs !== undefined &&
    input.rollout.tailLines !== undefined &&
    Number.isInteger(input.rollout.tailLines)
  ) {
    return fallback
  }

  const rolloutResult = await safeFormElicitation<{
    includeProjectLogs: boolean
    tailLines: number
  }>(options.server, options.capabilityFlags, {
    message: 'Choose the bounded post-deploy rollout checks to collect automatically.',
    requestedSchema: buildRolloutOptionsSchema(fallback),
  })

  if (rolloutResult.status === 'accepted') {
    return normalizeRolloutOptions(rolloutResult.content, fallback)
  }

  return fallback
}

async function loadApplicationPreview(executor: ResourceExecutor, applicationId: string) {
  const payload = await readJsonResource(
    executor,
    buildDokployResourceUri('application', applicationId, 'summary'),
    'application-summary',
    {
      applicationId,
    },
  )
  return compactApplicationPreview(payload)
}

async function loadProjectLogsPreview(
  executor: ResourceExecutor,
  projectId: string,
  rollout: RolloutOptions,
) {
  try {
    const logs = await executor('project.logsOverview', {
      projectId,
      includeDatabases: false,
      maxApplications: 5,
      tail: rollout.tailLines,
    })

    return compactLogsPreview(logs)
  } catch {
    return undefined
  }
}

function getDeploymentId(value: unknown) {
  return isRecord(value) ? getStringOrNull(value.deploymentId) : null
}

function getDeploymentStatus(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  return (
    getStringOrNull(value.status) ??
    getStringOrNull(value.deploymentStatus) ??
    getStringOrNull(value.applicationStatus)
  )
}

function isTerminalDeploymentStatus(status: string | null) {
  if (!status) {
    return false
  }

  const normalized = status.trim().toLowerCase()
  return [
    'cancelled',
    'canceled',
    'completed',
    'done',
    'error',
    'failed',
    'killed',
    'success',
  ].some((terminal) => normalized.includes(terminal))
}

async function waitForDeploymentRollout(options: {
  executor: ResourceExecutor
  applicationId: string
  deploymentId?: string | null
  rollout: RolloutOptions
  signal?: AbortSignal
}) {
  let latestDeployment: unknown = null

  for (let attempt = 1; attempt <= options.rollout.maxPolls; attempt += 1) {
    throwIfAborted(options.signal)

    const latestByType = await options.executor('deployment.latestByType', {
      id: options.applicationId,
      type: 'application',
    })
    const latest =
      isRecord(latestByType) && 'latestDeployment' in latestByType
        ? latestByType.latestDeployment
        : null
    latestDeployment = latest

    const observedDeploymentId = getDeploymentId(latest)
    const observedStatus = getDeploymentStatus(latest)
    const targetSeen = options.deploymentId
      ? observedDeploymentId === options.deploymentId
      : latest !== null

    if (targetSeen && isTerminalDeploymentStatus(observedStatus)) {
      return {
        status: 'completed' as const,
        attempts: attempt,
        latestDeployment,
      }
    }

    if (attempt < options.rollout.maxPolls) {
      await sleepWithSignal(options.rollout.pollIntervalMs, options.signal)
    }
  }

  return {
    status: 'timeout' as const,
    attempts: options.rollout.maxPolls,
    latestDeployment,
  }
}

function buildNeedsInputResult(message: string, candidates: ApplicationCandidate[]) {
  return {
    mode: 'workflow' as const,
    workflow: 'deploy-application' as const,
    outcome: 'needs-input' as const,
    message,
    candidates: candidates.map((candidate) => ({
      applicationId: candidate.applicationId,
      title: candidate.title,
    })),
    guidance: [
      'Use workflow.applicationId when you already know the exact Dokploy target.',
      'Otherwise provide workflow.applicationQuery or use the search tool to discover the target first.',
    ],
  }
}

function buildCancelledResult(message: string) {
  return {
    mode: 'workflow' as const,
    workflow: 'deploy-application' as const,
    outcome: 'cancelled' as const,
    message,
  }
}

function finalizeWorkflowResponse(getCalls: () => unknown[], result: unknown) {
  return {
    result,
    calls: getCalls(),
    resourceLinks: listResourceLinks(result),
  }
}

function buildResolvedInput(
  input: DeployApplicationWorkflowInput,
  application: ApplicationPreview,
  intent: string,
  action: 'preview' | 'apply',
  rollout: RolloutOptions,
) {
  return {
    applicationId: application.applicationId,
    intent,
    action,
    rollout,
    ...(normalizeString(input.projectId) ? { projectId: normalizeString(input.projectId) } : {}),
    ...(normalizeString(input.environmentId)
      ? { environmentId: normalizeString(input.environmentId) }
      : {}),
    ...(normalizeString(input.title) ? { title: normalizeString(input.title) } : {}),
    ...(normalizeString(input.description)
      ? { description: normalizeString(input.description) }
      : {}),
    ...(normalizeString(input.approvalUrl)
      ? { approvalUrl: normalizeString(input.approvalUrl) }
      : {}),
  }
}

function buildPreviewResult(options: {
  resolved: ReturnType<typeof buildResolvedInput>
  planResult: Awaited<ReturnType<typeof createBoundedWorkflowPlan>>
  application: ApplicationPreview
}) {
  return {
    mode: 'workflow' as const,
    workflow: 'deploy-application' as const,
    outcome: 'preview' as const,
    resolved: options.resolved,
    planSource: options.planResult.source,
    plan: options.planResult.plan,
    application: options.application,
    guidance: 'Rerun this workflow with action="apply" when the target and plan look correct.',
  }
}

function buildApprovalRequiredResult(options: {
  resolved: ReturnType<typeof buildResolvedInput>
  planResult: Awaited<ReturnType<typeof createBoundedWorkflowPlan>>
  application: ApplicationPreview
  approvalUrl: string
  elicitationId: string
  approvalResult: Awaited<ReturnType<typeof safeUrlElicitation>>
}) {
  return {
    mode: 'workflow' as const,
    workflow: 'deploy-application' as const,
    outcome: 'approval-required' as const,
    resolved: options.resolved,
    planSource: options.planResult.source,
    plan: options.planResult.plan,
    application: options.application,
    approval: {
      status: options.approvalResult.status,
      approvalUrl: options.approvalUrl,
      elicitationId: options.elicitationId,
      ...(options.approvalResult.status === 'error' && options.approvalResult.error
        ? { error: options.approvalResult.error }
        : {}),
    },
    guidance:
      options.approvalResult.status === 'accepted'
        ? 'Complete the external approval flow, then rerun the deploy workflow without approvalUrl to continue.'
        : 'External approval was not completed. Keep the workflow in preview mode until approval is available.',
  }
}

async function runAppliedDeployment(options: {
  input: DeployApplicationWorkflowInput
  executor: ResourceExecutor
  application: ApplicationPreview
  resolved: ReturnType<typeof buildResolvedInput>
  rollout: RolloutOptions
  planResult: Awaited<ReturnType<typeof createBoundedWorkflowPlan>>
  signal?: AbortSignal
}) {
  throwIfAborted(options.signal)

  const deployment = await options.executor('application.deploy', {
    applicationId: options.application.applicationId,
    ...(normalizeString(options.input.title)
      ? { title: normalizeString(options.input.title) }
      : {}),
    ...(normalizeString(options.input.description)
      ? { description: normalizeString(options.input.description) }
      : {}),
  })
  const rolloutStatus = options.rollout.waitForRollout
    ? await waitForDeploymentRollout({
        executor: options.executor,
        applicationId: options.application.applicationId,
        deploymentId: getDeploymentId(deployment),
        rollout: options.rollout,
        signal: options.signal,
      })
    : undefined
  const logsPreview =
    options.rollout.includeProjectLogs && options.application.projectId
      ? await loadProjectLogsPreview(
          options.executor,
          options.application.projectId,
          options.rollout,
        )
      : undefined

  return {
    mode: 'workflow' as const,
    workflow: 'deploy-application' as const,
    outcome: 'applied' as const,
    resolved: options.resolved,
    planSource: options.planResult.source,
    plan: options.planResult.plan,
    application: options.application,
    deployment,
    ...(rolloutStatus ? { rolloutStatus } : {}),
    ...(logsPreview ? { logsPreview } : {}),
    guidance:
      'Inspect the returned deployment data and reusable Dokploy resource links for follow-up checks.',
  }
}

export async function prepareDeployApplicationWorkflow(
  input: DeployApplicationWorkflowInput,
  options: WorkflowRunnerOptions,
): Promise<DeployApplicationPreparation> {
  const { executor, getCalls } = createWorkflowExecutor()
  throwIfAborted(options.signal)

  const applicationResolution = await resolveApplicationId(input, executor, options)
  if (applicationResolution.status === 'needs-input') {
    return {
      status: 'completed',
      getCalls,
      result: buildNeedsInputResult(
        applicationResolution.message,
        applicationResolution.candidates,
      ),
    }
  }

  let application: ApplicationPreview
  try {
    application = await loadApplicationPreview(executor, applicationResolution.applicationId)
  } catch (error) {
    return {
      status: 'completed',
      getCalls,
      result: buildNeedsInputResult(
        `The applicationId ${JSON.stringify(
          applicationResolution.applicationId,
        )} could not be resolved into bounded deploy context: ${
          error instanceof Error ? error.message : String(error)
        }`,
        applicationResolution.candidates,
      ),
    }
  }

  throwIfAborted(options.signal)
  const intent = await resolveDeploymentIntent(input, options, application)
  const actionResolution = await resolveWorkflowAction(input, options)
  if (actionResolution.status === 'cancelled') {
    return {
      status: 'completed',
      getCalls,
      result: buildCancelledResult(actionResolution.message),
    }
  }

  const rollout = await resolveRollout(input, actionResolution.action, options)
  const resolved = buildResolvedInput(input, application, intent, actionResolution.action, rollout)
  const planResult = await createBoundedWorkflowPlan(options.server, options.capabilityFlags, {
    workflowKind: input.kind,
    action: actionResolution.action,
    intent,
    application,
    rollout,
    approvalUrl: normalizeString(input.approvalUrl),
    title: normalizeString(input.title),
    description: normalizeString(input.description),
  })

  if (actionResolution.action === 'preview') {
    return {
      status: 'completed',
      getCalls,
      result: buildPreviewResult({
        resolved,
        planResult,
        application,
      }),
    }
  }

  const approvalUrl = normalizeString(input.approvalUrl)
  if (approvalUrl) {
    const elicitationId = randomUUID()
    const approvalResult = await safeUrlElicitation(options.server, options.capabilityFlags, {
      elicitationId,
      message:
        'This deployment requires an out-of-band approval step. Open the URL to complete the sensitive approval flow.',
      url: approvalUrl,
    })

    return {
      status: 'completed',
      getCalls,
      result: buildApprovalRequiredResult({
        resolved,
        planResult,
        application,
        approvalUrl,
        elicitationId,
        approvalResult,
      }),
    }
  }

  return {
    status: 'ready-to-apply',
    getCalls,
    input,
    executor,
    application,
    resolved,
    rollout,
    planResult,
  }
}

export async function runPreparedDeployApplicationTask(
  prepared: PreparedDeployApplicationTask,
  signal?: AbortSignal,
) {
  return await runAppliedDeployment({
    ...prepared,
    signal,
  })
}

export async function runDeployApplicationWorkflow(
  input: DeployApplicationWorkflowInput,
  options: WorkflowRunnerOptions,
) {
  const prepared = await prepareDeployApplicationWorkflow(input, options)
  if (prepared.status === 'completed') {
    return finalizeWorkflowResponse(prepared.getCalls, prepared.result)
  }

  return finalizeWorkflowResponse(
    prepared.getCalls,
    await runPreparedDeployApplicationTask(prepared, options.signal),
  )
}
