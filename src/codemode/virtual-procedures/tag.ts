import {
  getArray,
  getProjectTagIds,
  getStringOrNull,
  getTagId,
  isRecord,
  validateStringList,
} from './shared.js'
import type { VirtualProcedureContext, VirtualProcedureDefinition } from './types.js'

function createTagBulkAssignPreviewInputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: {
        type: 'string',
        minLength: 1,
      },
      tagIds: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    },
    required: ['projectId', 'tagIds'],
    additionalProperties: false,
  }
}

function createTagBulkAssignPreviewOutputSchema() {
  return {
    type: 'object',
    properties: {
      projectId: { type: 'string' },
      projectName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      requestedTagIds: { type: 'array', items: { type: 'string' } },
      currentTagIds: { type: 'array', items: { type: 'string' } },
      resolvedTags: { type: 'array', items: { type: 'object', additionalProperties: true } },
      missingTagIds: { type: 'array', items: { type: 'string' } },
      unchangedTagIds: { type: 'array', items: { type: 'string' } },
      toAddTagIds: { type: 'array', items: { type: 'string' } },
      previewOperation: {
        type: 'object',
        additionalProperties: false,
        required: ['procedure', 'input'],
        properties: {
          procedure: { type: 'string' },
          input: {
            type: 'object',
            additionalProperties: false,
            required: ['projectId', 'tagIds'],
            properties: {
              projectId: { type: 'string' },
              tagIds: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    required: [
      'projectId',
      'projectName',
      'requestedTagIds',
      'currentTagIds',
      'resolvedTags',
      'missingTagIds',
      'unchangedTagIds',
      'toAddTagIds',
      'previewOperation',
    ],
    additionalProperties: false,
  }
}

function validateTagBulkAssignPreviewInput(input: Record<string, unknown>) {
  const errors: string[] = []

  if (typeof input.projectId !== 'string' || input.projectId.trim().length === 0) {
    errors.push('projectId must be a non-empty string')
  }

  errors.push(...validateStringList(input.tagIds, 'tagIds'))

  return errors
}

async function executeTagBulkAssignPreview(
  input: Record<string, unknown>,
  context: VirtualProcedureContext,
) {
  const projectId = String(input.projectId)
  const requestedTagIds = ((input.tagIds as string[] | undefined) ?? []).map((tagId) =>
    tagId.trim(),
  )
  const project = await context.call('project.one', { projectId })
  const currentTagIds = getProjectTagIds(project)
  const allTags = getArray(await context.call('tag.all', {}))
  const tagsById = new Map<string, Record<string, unknown>>()

  for (const tag of allTags) {
    const tagId = getTagId(tag)
    if (tagId && isRecord(tag)) {
      tagsById.set(tagId, tag)
    }
  }

  const resolvedTags = requestedTagIds
    .map((tagId) => tagsById.get(tagId))
    .filter((tag): tag is Record<string, unknown> => Boolean(tag))
  const missingTagIds = requestedTagIds.filter((tagId) => !tagsById.has(tagId))
  const unchangedTagIds = requestedTagIds.filter((tagId) => currentTagIds.includes(tagId))
  const toAddTagIds = requestedTagIds.filter(
    (tagId) => tagsById.has(tagId) && !currentTagIds.includes(tagId),
  )

  return {
    projectId,
    projectName: isRecord(project) ? getStringOrNull(project.name) : null,
    requestedTagIds,
    currentTagIds,
    resolvedTags,
    missingTagIds,
    unchangedTagIds,
    toAddTagIds,
    previewOperation: {
      procedure: 'tag.bulkAssign',
      input: {
        projectId,
        tagIds: requestedTagIds,
      },
    },
  }
}

export const tagProcedureDefinitions: Record<string, VirtualProcedureDefinition> = {
  'tag.bulkAssignPreview': {
    endpoint: {
      procedure: 'tag.bulkAssignPreview',
      method: 'GET',
      path: '/virtual/tag.bulkAssignPreview',
      tag: 'tag',
      summary: 'Preview a bulk tag assignment before mutating a project',
      description:
        'MCP-only virtual helper that resolves requested tagIds, compares them with the project current tags, and returns a non-mutating preview for tag.bulkAssign.',
      inputKind: 'body',
      requiredInputs: ['projectId', 'tagIds'],
      optionalInputs: [],
      response: {
        type: 'object',
        keys: [
          'projectId',
          'projectName',
          'requestedTagIds',
          'currentTagIds',
          'resolvedTags',
          'missingTagIds',
          'unchangedTagIds',
          'toAddTagIds',
          'previewOperation',
        ],
      },
      virtual: true,
    },
    schema: {
      method: 'GET',
      path: '/virtual/tag.bulkAssignPreview',
      tag: 'tag',
      inputKind: 'body',
      inputSchema: createTagBulkAssignPreviewInputSchema(),
      outputSchema: createTagBulkAssignPreviewOutputSchema(),
      virtual: true,
    },
    validateInput: validateTagBulkAssignPreviewInput,
    execute: executeTagBulkAssignPreview,
  },
}
