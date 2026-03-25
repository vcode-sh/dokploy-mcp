import { describe, expect, it } from 'vitest'
import { ApiError, buildQueryString, unwrapTrpcResponse } from '../src/api/client.js'

describe('ApiError', () => {
  it('extracts message from body object', () => {
    const err = new ApiError(400, 'Bad Request', { message: 'Invalid input' }, 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (400): Invalid input')
    expect(err.status).toBe(400)
    expect(err.statusText).toBe('Bad Request')
    expect(err.endpoint).toBe('test.endpoint')
    expect(err.name).toBe('ApiError')
  })

  it('falls back to statusText when body has no message', () => {
    const err = new ApiError(500, 'Internal Server Error', null, 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (500): Internal Server Error')
  })

  it('falls back to statusText for non-object body', () => {
    const err = new ApiError(502, 'Bad Gateway', 'raw text', 'test.endpoint')
    expect(err.message).toBe('Dokploy API error (502): Bad Gateway')
  })

  it('handles body object without message property', () => {
    const err = new ApiError(422, 'Unprocessable', { errors: ['field required'] }, 'test.create')
    expect(err.message).toBe('Dokploy API error (422): Unprocessable')
    expect(err.body).toEqual({ errors: ['field required'] })
  })

  it('extracts nested tRPC error messages', () => {
    const err = new ApiError(
      400,
      'Bad Request',
      {
        error: {
          json: {
            message: 'Invalid input: expected object, received undefined',
          },
        },
      },
      'test.one',
    )

    expect(err.message).toBe(
      'Dokploy API error (400): Invalid input: expected object, received undefined',
    )
  })

  it('is instanceof Error', () => {
    const err = new ApiError(404, 'Not Found', null, 'test.one')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('preserves body for downstream inspection', () => {
    const body = { code: 'VALIDATION', fields: { name: 'required' } }
    const err = new ApiError(422, 'Unprocessable', body, 'test.create')
    expect(err.body).toBe(body)
  })
})

describe('buildQueryString', () => {
  it('returns empty string for empty input', () => {
    expect(buildQueryString(undefined)).toBe('')
    expect(buildQueryString({})).toBe('input=%7B%22json%22%3A%7B%7D%7D')
  })

  it('serializes GET params using the tRPC input envelope', () => {
    expect(buildQueryString({ projectId: 'abc123' })).toBe(
      'input=%7B%22json%22%3A%7B%22projectId%22%3A%22abc123%22%7D%7D',
    )
  })

  it('filters nullish values and preserves arrays', () => {
    expect(
      buildQueryString({
        q: 'app',
        limit: 20,
        watchPaths: ['src', 'package.json'],
        owner: null,
      }),
    ).toBe(
      'input=%7B%22json%22%3A%7B%22q%22%3A%22app%22%2C%22limit%22%3A20%2C%22watchPaths%22%3A%5B%22src%22%2C%22package.json%22%5D%7D%7D',
    )
  })
})

describe('unwrapTrpcResponse', () => {
  it('unwraps the standard tRPC response envelope', () => {
    expect(
      unwrapTrpcResponse({
        result: {
          data: {
            json: {
              projectId: 'abc123',
            },
          },
        },
      }),
    ).toEqual({ projectId: 'abc123' })
  })

  it('returns non-tRPC payloads unchanged', () => {
    const payload = [{ projectId: 'abc123' }]
    expect(unwrapTrpcResponse(payload)).toBe(payload)
  })
})
