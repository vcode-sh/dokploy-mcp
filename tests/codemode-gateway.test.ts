import { describe, expect, it } from 'vitest'

import { ApiError } from '../src/api/client.js'
import { invokeProcedure, invokeProcedureWithApi } from '../src/codemode/gateway/api-gateway.js'
import {
  buildTrpcPostBody,
  buildTrpcQueryString,
} from '../src/codemode/gateway/request-normalizer.js'

describe('codemode gateway request normalization', () => {
  it('serializes GET params using tRPC envelope', () => {
    expect(buildTrpcQueryString({ projectId: 'abc123' })).toBe(
      'input=%7B%22json%22%3A%7B%22projectId%22%3A%22abc123%22%7D%7D',
    )
  })

  it('serializes empty GET params to empty tRPC input object', () => {
    expect(buildTrpcQueryString({})).toBe('input=%7B%22json%22%3A%7B%7D%7D')
  })

  it('serializes POST body using tRPC envelope', () => {
    expect(buildTrpcPostBody({ projectId: 'abc123' })).toBe('{"json":{"projectId":"abc123"}}')
  })
})

describe('codemode gateway validation', () => {
  it('rejects unknown procedures', async () => {
    await expect(invokeProcedure('unknown.procedure')).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'unknown.procedure',
    })
  })

  it('rejects missing required fields for known procedures', async () => {
    await expect(invokeProcedure('project.one', {})).rejects.toMatchObject({
      type: 'validation_error',
      procedure: 'project.one',
    })
  })

  it('retries retryable GET failures through the gateway', async () => {
    let attempts = 0
    const fakeApi = {
      async get() {
        attempts += 1
        if (attempts === 1) {
          throw new ApiError(503, 'Service Unavailable', { message: 'try again' }, '/project.all')
        }
        return []
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('project.all', {}, fakeApi)
    expect(result.data).toEqual([])
    expect(attempts).toBe(2)
  })

  it('maps Dokploy API errors to compact gateway errors', async () => {
    const fakeApi = {
      async get() {
        throw new ApiError(404, 'Not Found', { message: 'missing' }, '/project.one')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 404,
      procedure: 'project.one',
      message: 'Dokploy API error (404): missing',
    })
  })

  it('maps auth errors to compact gateway errors', async () => {
    const fakeApi = {
      async get() {
        throw new ApiError(403, 'Forbidden', { message: 'denied' }, '/project.one')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'dokploy_error',
      status: 403,
      procedure: 'project.one',
      message: 'Dokploy API error (403): denied',
    })
  })

  it('maps unknown runtime errors to sandbox_error payloads', async () => {
    const fakeApi = {
      async get() {
        throw new Error('boom')
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    await expect(
      invokeProcedureWithApi('project.one', { projectId: 'p1' }, fakeApi),
    ).rejects.toEqual({
      ok: false,
      type: 'sandbox_error',
      status: undefined,
      procedure: 'project.one',
      message: 'boom',
    })
  })

  it('returns trace metadata for successful gateway calls', async () => {
    const fakeApi = {
      async get() {
        return [{ projectId: 'p1' }]
      },
      async post() {
        throw new Error('Unexpected POST call')
      },
    }

    const result = await invokeProcedureWithApi('project.all', {}, fakeApi)
    expect(result.trace.procedure).toBe('project.all')
    expect(result.trace.method).toBe('GET')
    expect(result.trace.durationMs).toBeGreaterThanOrEqual(0)
  })
})
