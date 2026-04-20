import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../src/api/client.js'
import { invokeProcedureWithApi } from '../src/codemode/gateway/api-gateway.js'
import * as procedureOverrides from '../src/codemode/overrides/procedure-overrides.js'

const futureProcedureSchemas = {
  'settings.checkInfrastructureHealth': {
    method: 'GET',
    path: '/settings.checkInfrastructureHealth',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: true,
    },
  },
  'tag.all': {
    method: 'GET',
    path: '/tag.all',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
} as const

beforeEach(() => {
  vi.spyOn(procedureOverrides, 'getEffectiveProcedureSchema').mockImplementation((procedure) => {
    return futureProcedureSchemas[procedure as keyof typeof futureProcedureSchemas]
  })
  vi.spyOn(procedureOverrides, 'mapProcedureInput').mockImplementation((_procedure, input) => input)
  vi.spyOn(procedureOverrides, 'transformProcedureResponse').mockImplementation(
    (_procedure, _input, response) => response,
  )
  vi.spyOn(procedureOverrides, 'validateProcedureInput').mockImplementation(() => [])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('codemode gateway compatibility-aware 404 handling', () => {
  it('surfaces an older-backend hint for newer exact-match procedures', async () => {
    const getBackendVersionInfo = vi.fn().mockResolvedValue({
      state: 'detected',
      version: 'v0.28.8',
    })
    const fakeApi = {
      async get() {
        throw new ApiError(
          404,
          'Not Found',
          { message: 'missing' },
          '/settings.checkInfrastructureHealth',
        )
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(
      invokeProcedureWithApi('settings.checkInfrastructureHealth', {}, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'settings.checkInfrastructureHealth',
      message:
        'Dokploy API error (404): Procedure settings.checkInfrastructureHealth exists in the generated MCP catalog but is not available on connected Dokploy server v0.28.8. It requires Dokploy v0.29.0 or newer. Upgrade Dokploy or avoid this endpoint on older servers.',
    })
    expect(getBackendVersionInfo).toHaveBeenCalledTimes(1)
  })

  it('surfaces an older-backend hint for newer prefix-matched procedures', async () => {
    const getBackendVersionInfo = vi.fn().mockResolvedValue({
      state: 'detected',
      version: 'v0.28.8',
    })
    const fakeApi = {
      async get() {
        throw new ApiError(404, 'Not Found', { message: 'missing' }, '/tag.all')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(invokeProcedureWithApi('tag.all', {}, fakeApi)).rejects.toMatchObject({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'tag.all',
      message: expect.stringContaining(
        'Procedure tag.all exists in the generated MCP catalog but is not available on connected Dokploy server v0.28.8.',
      ),
    })
    expect(getBackendVersionInfo).toHaveBeenCalledTimes(1)
  })

  it('falls back to the original 404 when the backend version is new enough', async () => {
    const getBackendVersionInfo = vi.fn().mockResolvedValue({
      state: 'detected',
      version: 'v0.29.0',
    })
    const fakeApi = {
      async get() {
        throw new ApiError(
          404,
          'Not Found',
          { message: 'resource missing' },
          '/settings.checkInfrastructureHealth',
        )
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(
      invokeProcedureWithApi('settings.checkInfrastructureHealth', {}, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'settings.checkInfrastructureHealth',
      message: 'Dokploy API error (404): resource missing',
    })
    expect(getBackendVersionInfo).toHaveBeenCalledTimes(1)
  })

  it('falls back to the original 404 when the version probe is unavailable', async () => {
    const getBackendVersionInfo = vi.fn().mockResolvedValue({
      state: 'unavailable',
      version: null,
    })
    const fakeApi = {
      async get() {
        throw new ApiError(
          404,
          'Not Found',
          { message: 'resource missing' },
          '/settings.checkInfrastructureHealth',
        )
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
      getBackendVersionInfo,
    }

    await expect(
      invokeProcedureWithApi('settings.checkInfrastructureHealth', {}, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'settings.checkInfrastructureHealth',
      message: 'Dokploy API error (404): resource missing',
    })
    expect(getBackendVersionInfo).toHaveBeenCalledTimes(1)
  })
})
