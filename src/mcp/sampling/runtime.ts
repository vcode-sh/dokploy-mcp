import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { getStringOrNull, isRecord } from '../../codemode/virtual-procedures/shared.js'
import type { McpCapabilityFlags } from '../registration/types.js'

export interface WorkflowPlan {
  summary: string
  riskLevel: 'low' | 'medium' | 'high'
  preflightChecks: string[]
  executionSteps: string[]
  followUpChecks: string[]
  notes: string[]
}

export interface WorkflowPlanInput {
  workflowKind: string
  action: 'preview' | 'apply'
  intent: string
  application: {
    applicationId: string
    name: string | null
    appName: string | null
    applicationStatus: string | null
    projectId: string | null
    environmentId: string | null
    serverId: string | null
    latestDeploymentId?: string | null
  }
  rollout: {
    includeProjectLogs: boolean
    tailLines: number
  }
  approvalUrl?: string
  title?: string
  description?: string
}

export interface WorkflowPlanResult {
  source: 'sampling' | 'fallback'
  plan: WorkflowPlan
  rawText?: string
}

function supportsSampling(server: McpServer, capabilityFlags?: McpCapabilityFlags) {
  return (
    capabilityFlags?.sampling === true &&
    server.server.getClientCapabilities()?.sampling !== undefined
  )
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

function normalizeStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .slice(0, 6)
}

function normalizeRiskLevel(value: unknown): WorkflowPlan['riskLevel'] | null {
  return value === 'low' || value === 'medium' || value === 'high' ? value : null
}

function extractJsonObject(value: string) {
  const trimmed = value.trim()
  const direct = tryParseJsonObject(trimmed)
  if (direct) {
    return direct
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace <= firstBrace) {
    return null
  }

  return tryParseJsonObject(trimmed.slice(firstBrace, lastBrace + 1))
}

function tryParseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function parseSampledPlan(value: string): WorkflowPlan | null {
  const parsed = extractJsonObject(value)
  if (!parsed) {
    return null
  }

  const summary = getStringOrNull(parsed.summary)
  const riskLevel = normalizeRiskLevel(parsed.riskLevel)
  if (!(summary && riskLevel)) {
    return null
  }

  return {
    summary: truncateText(summary, 240),
    riskLevel,
    preflightChecks: normalizeStringList(parsed.preflightChecks, []),
    executionSteps: normalizeStringList(parsed.executionSteps, []),
    followUpChecks: normalizeStringList(parsed.followUpChecks, []),
    notes: normalizeStringList(parsed.notes, []),
  }
}

function computeFallbackRiskLevel(input: WorkflowPlanInput): WorkflowPlan['riskLevel'] {
  const status = input.application.applicationStatus?.toLowerCase()
  if (!status || input.action === 'preview') {
    return 'low'
  }

  if (status.includes('running') || status.includes('healthy') || status.includes('done')) {
    return 'medium'
  }

  return 'high'
}

export function createFallbackWorkflowPlan(input: WorkflowPlanInput): WorkflowPlan {
  const applicationLabel =
    input.application.name ?? input.application.appName ?? input.application.applicationId
  const deployInput = {
    applicationId: input.application.applicationId,
    ...(input.title ? { title: input.title } : {}),
    ...(input.description ? { description: input.description } : {}),
  }

  return {
    summary:
      input.action === 'preview'
        ? `Preview a bounded deploy workflow for ${applicationLabel}.`
        : `Apply a bounded deploy workflow for ${applicationLabel}.`,
    riskLevel: computeFallbackRiskLevel(input),
    preflightChecks: [
      'Confirm the selected application matches the intended project and environment.',
      'Review the latest bounded application summary before mutating anything.',
      `Keep the deployment intent explicit: ${truncateText(input.intent, 140)}`,
    ],
    executionSteps:
      input.action === 'preview'
        ? [
            `Review the planned deploy input: ${JSON.stringify(deployInput)}`,
            'Do not mutate Dokploy state during preview mode.',
          ]
        : [
            `Call application.deploy with ${JSON.stringify(deployInput)}.`,
            'Capture the returned deployment summary and any reusable Dokploy resource links.',
          ],
    followUpChecks: [
      'Inspect the latest deployment summary after the workflow completes.',
      ...(input.rollout.includeProjectLogs
        ? [`Collect a bounded project logs snapshot with tail=${input.rollout.tailLines}.`]
        : []),
    ],
    notes: [
      ...(input.approvalUrl
        ? ['External approval is required before the deploy can proceed.']
        : []),
      input.action === 'preview'
        ? 'Preview mode is the safe non-interactive fallback when user confirmation is missing.'
        : 'Long-running rollout waiting stays out of phase 3 and remains bounded by default.',
    ],
  }
}

function buildPlannerPrompt(input: WorkflowPlanInput) {
  return [
    'Return JSON only with keys:',
    'summary, riskLevel, preflightChecks, executionSteps, followUpChecks, notes',
    '',
    'Rules:',
    '- Keep every array between 1 and 5 short strings.',
    '- Keep summary under 220 characters.',
    '- riskLevel must be one of: low, medium, high.',
    '- Stay bounded to the provided Dokploy context.',
    '- Do not request secrets or third-party auth in-band.',
    '',
    `Workflow kind: ${input.workflowKind}`,
    `Action: ${input.action}`,
    `Intent: ${truncateText(input.intent, 180)}`,
    `Current context: ${JSON.stringify(
      {
        application: input.application,
        rollout: input.rollout,
        ...(input.title ? { title: input.title } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.approvalUrl ? { approvalUrl: input.approvalUrl } : {}),
      },
      null,
      2,
    )}`,
  ].join('\n')
}

export async function createBoundedWorkflowPlan(
  server: McpServer,
  capabilityFlags: McpCapabilityFlags | undefined,
  input: WorkflowPlanInput,
): Promise<WorkflowPlanResult> {
  const fallbackPlan = createFallbackWorkflowPlan(input)
  if (!supportsSampling(server, capabilityFlags)) {
    return {
      source: 'fallback',
      plan: fallbackPlan,
    }
  }

  try {
    const response = await server.server.createMessage({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: buildPlannerPrompt(input),
          },
        },
      ],
      includeContext: 'none',
      maxTokens: 700,
      systemPrompt:
        'You are a cautious Dokploy deployment planner. Return valid JSON only and stay within the provided context.',
    })

    const sampledText = response.content.type === 'text' ? response.content.text : undefined
    if (!sampledText) {
      return {
        source: 'fallback',
        plan: fallbackPlan,
      }
    }

    const sampledPlan = parseSampledPlan(sampledText)
    if (!sampledPlan) {
      return {
        source: 'fallback',
        plan: fallbackPlan,
        rawText: sampledText,
      }
    }

    return {
      source: 'sampling',
      plan: sampledPlan,
      rawText: sampledText,
    }
  } catch {
    return {
      source: 'fallback',
      plan: fallbackPlan,
    }
  }
}
