import { describe, expect, it } from 'vitest'

import {
  buildApplicationQuerySchema,
  buildApplicationSelectionSchema,
  buildDeploymentIntentSchema,
  buildPreviewOrApplySchema,
  buildRolloutOptionsSchema,
} from '../src/mcp/elicitation/schemas.js'

describe('phase 3 elicitation schemas', () => {
  it('builds an application query schema with and without a default query', () => {
    expect(buildApplicationQuerySchema()).toMatchObject({
      required: ['applicationQuery'],
      properties: {
        applicationQuery: {
          minLength: 1,
          maxLength: 120,
        },
      },
    })
    expect(buildApplicationQuerySchema('front')).toMatchObject({
      properties: {
        applicationQuery: {
          default: 'front',
        },
      },
    })
  })

  it('builds an application selection schema with optional default values', () => {
    expect(
      buildApplicationSelectionSchema([
        { value: 'app-1', title: 'Frontend (app-1)' },
        { value: 'app-2', title: 'Frontend Canary (app-2)' },
      ]),
    ).toMatchObject({
      required: ['applicationId'],
      properties: {
        applicationId: {
          oneOf: [
            { const: 'app-1', title: 'Frontend (app-1)' },
            { const: 'app-2', title: 'Frontend Canary (app-2)' },
          ],
        },
      },
    })
    expect(
      buildApplicationSelectionSchema([{ value: 'app-1', title: 'Frontend (app-1)' }], 'app-1'),
    ).toMatchObject({
      properties: {
        applicationId: {
          default: 'app-1',
        },
      },
    })
  })

  it('builds deployment intent and preview/apply schemas with deterministic defaults', () => {
    expect(buildDeploymentIntentSchema()).toMatchObject({
      required: ['intent'],
      properties: {
        intent: {
          minLength: 3,
          maxLength: 160,
        },
      },
    })
    expect(buildDeploymentIntentSchema('Ship a hotfix')).toMatchObject({
      properties: {
        intent: {
          default: 'Ship a hotfix',
        },
      },
    })
    expect(buildPreviewOrApplySchema()).toMatchObject({
      properties: {
        action: {
          default: 'preview',
        },
      },
    })
    expect(buildPreviewOrApplySchema('apply')).toMatchObject({
      properties: {
        action: {
          default: 'apply',
        },
      },
    })
  })

  it('builds rollout schemas with both implicit and explicit defaults', () => {
    expect(buildRolloutOptionsSchema()).toMatchObject({
      properties: {
        includeProjectLogs: {
          default: true,
        },
        tailLines: {
          default: 40,
        },
      },
    })
    expect(
      buildRolloutOptionsSchema({
        includeProjectLogs: false,
        tailLines: 12,
      }),
    ).toMatchObject({
      properties: {
        includeProjectLogs: {
          default: false,
        },
        tailLines: {
          default: 12,
        },
      },
    })
  })
})
