import { once } from 'node:events'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import net from 'node:net'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { remoteDokployHeaders } from '../src/http/security.js'
import {
  createHttpServer,
  resolveHttpEnabledTags,
  resolveHttpServerMode,
  type StartedHttpServer,
  startHttpServer,
} from '../src/http-server.js'

const startedServers: StartedHttpServer[] = []
const ORIGINAL_ENV = { ...process.env }
const defaultRemoteDokployUrl = 'https://panel.example.com'
const defaultRemoteDokployApiKey = 'test-api-key'
const codeModeToolNames = ['search', 'execute', 'list_profiles']

beforeEach(() => {
  vi.stubEnv('DOKPLOY_MCP_SANDBOX_RUNTIME', 'subprocess')
  vi.stubEnv('DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT', '32')
})

afterEach(async () => {
  while (startedServers.length > 0) {
    const handle = startedServers.pop()
    await handle?.close()
  }

  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function waitFor(milliseconds: number) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function settleWithin<T>(promise: Promise<T>, label: string, timeoutMs = 2_000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

function normalizeHeaders(headers?: HeadersInit) {
  if (!headers) {
    return {}
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries())
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }

  return { ...headers }
}

function createRemoteRequestHeaders(overrides: Record<string, string> = {}) {
  return {
    [remoteDokployHeaders.url.name]: defaultRemoteDokployUrl,
    [remoteDokployHeaders.apiKey.name]: defaultRemoteDokployApiKey,
    ...overrides,
  }
}

function createRemoteHeaderLines(overrides: Record<string, string> = {}) {
  return Object.entries(createRemoteRequestHeaders(overrides)).map(
    ([name, value]) => `${name}: ${value}`,
  )
}

function createJsonTextResponse(data: unknown, status = 200, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    async text() {
      return JSON.stringify(data)
    },
  }
}

function withRemoteRequestInit(
  options?: ConstructorParameters<typeof StreamableHTTPClientTransport>[1],
  headerOverrides: Record<string, string> = {},
): ConstructorParameters<typeof StreamableHTTPClientTransport>[1] {
  return {
    ...options,
    requestInit: {
      ...options?.requestInit,
      headers: {
        ...createRemoteRequestHeaders(),
        ...normalizeHeaders(options?.requestInit?.headers),
        ...headerOverrides,
      },
    },
  }
}

function buildSleepExecuteCode(milliseconds: number, label: string) {
  return [
    `await helpers.sleep(${milliseconds})`,
    `return { label: ${JSON.stringify(label)}, slept: ${milliseconds} }`,
  ].join('\n')
}

async function startTestHttpServer(options: Parameters<typeof startHttpServer>[0]) {
  const handle = await startHttpServer({
    host: '127.0.0.1',
    port: 0,
    ...options,
  })
  startedServers.push(handle)
  return handle
}

async function startCreatedTestHttpServer(options: Parameters<typeof createHttpServer>[0]) {
  const server = createHttpServer({
    host: '127.0.0.1',
    port: 0,
    ...options,
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options?.port ?? 0, options?.host ?? '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected HTTP server to have a TCP address')
  }

  const addressInfo = address as AddressInfo
  const host = addressInfo.address === '::' ? '127.0.0.1' : addressInfo.address
  const baseUrl = `http://${host}:${addressInfo.port}`
  const handle: StartedHttpServer = {
    server,
    url: baseUrl,
    mcpUrl: `${baseUrl}${options?.mcpPath ?? '/mcp'}`,
    healthUrl: `${baseUrl}${options?.healthPath ?? '/health'}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
  }

  startedServers.push(handle)
  return handle
}

async function closeNodeServer(server: ReturnType<typeof createHttpServer>) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function withHttpClient(handle: StartedHttpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(
    new URL(handle.mcpUrl),
    withRemoteRequestInit(),
  )

  await client.connect(transport)

  try {
    await run(client)
  } finally {
    await Promise.allSettled([client.close(), transport.close()])
  }
}

async function withHttpClientTransport(
  handle: StartedHttpServer,
  run: (client: Client, transport: StreamableHTTPClientTransport) => Promise<void>,
) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(
    new URL(handle.mcpUrl),
    withRemoteRequestInit(),
  )

  await client.connect(transport)

  try {
    await run(client, transport)
  } finally {
    await Promise.allSettled([client.close(), transport.close()])
  }
}

async function createConnectedHttpClient(
  handle: StartedHttpServer,
  options?: ConstructorParameters<typeof StreamableHTTPClientTransport>[1],
) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(
    new URL(handle.mcpUrl),
    withRemoteRequestInit(options),
  )
  await client.connect(transport)
  return { client, transport }
}

async function createConnectedHttpClientWithoutRemoteHeaders(
  handle: StartedHttpServer,
  options?: ConstructorParameters<typeof StreamableHTTPClientTransport>[1],
) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl), options)
  await client.connect(transport)
  return { client, transport }
}

async function closeHttpClient(client: {
  client: Client
  transport: StreamableHTTPClientTransport
}) {
  await Promise.allSettled([
    Promise.resolve()
      .then(() => client.client.close())
      .catch(() => undefined),
    Promise.resolve()
      .then(() => client.transport.close())
      .catch(() => undefined),
  ])
}

async function expectSessionNotFound(handle: StartedHttpServer, sessionId: string) {
  const response = await fetch(handle.mcpUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'mcp-session-id': sessionId,
      'mcp-protocol-version': '2025-03-26',
      ...createRemoteRequestHeaders(),
    },
  })
  const payload = (await response.json()) as Record<string, unknown>

  expect(response.status).toBe(404)
  expect(payload).toMatchObject({
    error: {
      code: -32001,
      message: 'Session not found',
    },
  })
}

function expectConnectionClosedToolError(result: {
  isError?: boolean
  content?: { type: string; text: string }[]
}) {
  expect(result.isError).toBe(true)
  expect(result.content).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Connection closed'),
      }),
    ]),
  )
}

function expectConnectionClosedSdkError(error: unknown) {
  expect(error).toBeInstanceOf(Error)
  const typed = error as Error & { cause?: { message?: string; code?: string } }
  const combinedMessage = [typed.message, typed.cause?.message, typed.cause?.code]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')

  expect(combinedMessage).toMatch(/Connection closed|fetch failed|ECONNRESET/)
}

function captureToolCall<T>(promise: Promise<T>) {
  return promise
    .then((result) => ({ kind: 'result' as const, result }))
    .catch((error: unknown) => ({ kind: 'error' as const, error }))
}

async function deleteSession(handle: StartedHttpServer, sessionId: string) {
  try {
    const response = await fetch(handle.mcpUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-session-id': sessionId,
        'mcp-protocol-version': '2025-03-26',
        ...createRemoteRequestHeaders(),
      },
    })

    const text = await response.text()
    const payload = text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : {}

    return { kind: 'response' as const, response, payload }
  } catch (error) {
    return { kind: 'network-error' as const, error }
  }
}

async function createReconnectHttpClient(handle: StartedHttpServer, sessionId: string) {
  const transport = new StreamableHTTPClientTransport(
    new URL(handle.mcpUrl),
    withRemoteRequestInit({
      sessionId,
    }),
  )
  transport.setProtocolVersion('2025-03-26')

  const client = new Client({
    name: 'http-transport-client-reconnect',
    version: '1.0.0',
  })

  await client.connect(transport)
  return { client, transport }
}

async function sendAbortedPartialPost(handle: StartedHttpServer) {
  const url = new URL(handle.mcpUrl)
  const request = http.request({
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      ...createRemoteRequestHeaders(),
    },
  })
  const requestSettled = new Promise<'close' | 'error'>((resolve) => {
    request.once('close', () => resolve('close'))
    request.once('error', () => resolve('error'))
  })

  request.write('{"jsonrpc":"2.0"')
  await waitFor(10)
  request.destroy()

  return await settleWithin(requestSettled, 'aborted partial request cleanup')
}

async function sendTruncatedContentLengthPost(handle: StartedHttpServer) {
  const url = new URL(handle.mcpUrl)
  const port = Number(url.port)
  const socket = net.createConnection({
    host: url.hostname,
    port,
  })
  const socketSettled = new Promise<'close' | 'error' | 'data'>((resolve) => {
    socket.once('data', () => {
      socket.destroy()
      resolve('data')
    })
    socket.once('error', () => resolve('error'))
    socket.once('close', () => resolve('close'))
  })

  await once(socket, 'connect')

  const body = '{"jsonrpc":"2.0",'
  const declaredLength = Buffer.byteLength(body, 'utf8') + 64
  socket.write(
    [
      `POST ${url.pathname} HTTP/1.1`,
      `Host: ${url.hostname}:${port}`,
      'Accept: application/json, text/event-stream',
      'Content-Type: application/json',
      `Content-Length: ${declaredLength}`,
      ...createRemoteHeaderLines(),
      'Connection: close',
      '',
      body,
    ].join('\r\n'),
  )

  await waitFor(10)
  socket.end()

  return await settleWithin(socketSettled, 'truncated content-length request cleanup')
}

async function sendMalformedParserLevelRequest(handle: StartedHttpServer) {
  const url = new URL(handle.mcpUrl)
  const port = Number(url.port)
  const socket = net.createConnection({
    host: url.hostname,
    port,
  })
  let rawResponse = ''

  const socketSettled = new Promise<string>((resolve, reject) => {
    let settled = false

    const finish = () => {
      if (settled) {
        return
      }

      settled = true
      resolve(rawResponse)
    }

    socket.on('data', (chunk: Buffer | string) => {
      rawResponse += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
    })
    socket.once('end', finish)
    socket.once('close', finish)
    socket.once('error', reject)
  })

  await once(socket, 'connect')

  socket.end(
    [
      `GET ${url.pathname} HTTP/1.1`,
      `Host: ${url.hostname}:${port}`,
      'Bad Header: value',
      '',
      '',
    ].join('\r\n'),
  )

  return await settleWithin(socketSettled, 'parser-level malformed request cleanup')
}

async function openSessionEventStream(handle: StartedHttpServer, sessionId: string) {
  const url = new URL(handle.mcpUrl)
  const request = http.request({
    host: url.hostname,
    port: url.port,
    path: url.pathname,
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'mcp-session-id': sessionId,
      'mcp-protocol-version': '2025-03-26',
      ...createRemoteRequestHeaders(),
    },
  })

  request.end()
  const [response] = (await once(request, 'response')) as [http.IncomingMessage]
  const settled = Promise.race([
    once(response, 'aborted').then(() => 'aborted' as const),
    once(response, 'close').then(() => 'close' as const),
    once(response, 'end').then(() => 'end' as const),
  ])

  response.resume()

  return { request, response, settled }
}

describe('http server transport', () => {
  it('exposes helper parsers for HTTP mode configuration', () => {
    expect(resolveHttpServerMode('raw')).toBe('raw')
    expect(resolveHttpServerMode('invalid')).toBeUndefined()
    expect(resolveHttpEnabledTags('project, application , project')).toEqual([
      'project',
      'application',
    ])
  })

  it('exposes a health endpoint and keeps default HTTP mode on codemode', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const response = await fetch(handle.healthUrl)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      transport: 'http',
      mode: 'codemode',
      capabilityFlags: [],
      mcpPath: '/mcp',
      healthPath: '/health',
      remoteAuth: {
        allowConfigFallback: false,
        allowedOrigins: [],
        headers: [
          {
            name: 'X-Dokploy-Url',
            isRequired: true,
            isSecret: false,
          },
          {
            name: 'X-Dokploy-Api-Key',
            isRequired: true,
            isSecret: true,
          },
        ],
      },
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()

      expect(tools.map((tool) => tool.name)).toEqual(codeModeToolNames)

      const result = await client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
      expect(result.structuredContent).toMatchObject({
        result: expect.any(Number),
        logs: [],
      })
    })
  })

  it('threads resource capability flags through HTTP options without changing the codemode tools', async () => {
    const handle = await startTestHttpServer({
      mode: 'codemode',
      capabilityFlags: {
        resources: true,
      },
    })
    const response = await fetch(handle.healthUrl)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      capabilityFlags: ['resources'],
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()
      const { resourceTemplates } = await client.listResourceTemplates()

      expect(tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(
        Object.keys((client.getServerCapabilities() ?? {}) as Record<string, unknown>).sort(),
      ).toEqual(['resources', 'tools'])
      expect(resourceTemplates.map((entry) => entry.uriTemplate).sort()).toEqual([
        'dokploy://application/{applicationId}/summary',
        'dokploy://deployment/{deploymentId}/summary',
        'dokploy://project/{projectId}/infrastructure',
        'dokploy://project/{projectId}/logs-overview',
        'dokploy://project/{projectId}/overview',
        'dokploy://server/{serverId}/summary',
      ])
      await expect(client.listPrompts()).rejects.toThrow()
    })
  })

  it('supports execute tasks over HTTP when the phase 4 capability is enabled', async () => {
    const handle = await startTestHttpServer({
      mode: 'codemode',
      capabilityFlags: {
        tasks: true,
      },
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()
      const messages = []

      expect(tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(
        Object.keys((client.getServerCapabilities() ?? {}) as Record<string, unknown>).sort(),
      ).toEqual(['tasks', 'tools'])

      for await (const message of client.experimental.tasks.callToolStream(
        {
          name: 'execute',
          arguments: {
            code: 'await helpers.sleep(25); return { ok: true, via: "http-task" }',
          },
        },
        CallToolResultSchema,
        {
          task: {},
        },
      )) {
        messages.push(message)
      }

      expect(messages.some((message) => message.type === 'taskCreated')).toBe(true)
      expect(messages.find((message) => message.type === 'result')).toMatchObject({
        type: 'result',
        result: {
          structuredContent: {
            result: {
              ok: true,
              via: 'http-task',
            },
          },
        },
      })
    })
  })

  it('threads prompt and completion capability flags through HTTP options', async () => {
    const handle = await startTestHttpServer({
      mode: 'hybrid',
      enabledTags: ['project'],
      capabilityFlags: {
        prompts: true,
        completions: true,
      },
    })
    const response = await fetch(handle.healthUrl)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      ok: true,
      capabilityFlags: ['completions', 'prompts'],
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()
      const { prompts } = await client.listPrompts()

      expect(tools.map((tool) => tool.name)).toContain('project.one')
      expect(
        Object.keys((client.getServerCapabilities() ?? {}) as Record<string, unknown>).sort(),
      ).toEqual(['completions', 'prompts', 'tools'])
      expect(prompts.map((entry) => entry.name).sort()).toEqual([
        'deploy-application',
        'diagnose-deployment',
        'review-project-infrastructure',
        'rotate-database-password-preview',
        'triage-project-logs',
      ])
      await expect(client.listResourceTemplates()).rejects.toThrow()
    })
  })

  it('allows managed close before the HTTP server starts listening', async () => {
    const server = createHttpServer({
      host: '127.0.0.1',
      port: 0,
    })

    await expect(
      settleWithin(closeNodeServer(server), 'close before listen'),
    ).resolves.toBeUndefined()
  })

  it('creates a reusable MCP session for HTTP clients', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    await withHttpClientTransport(handle, async (client, transport) => {
      expect(transport.sessionId).toEqual(expect.any(String))

      const firstSessionId = transport.sessionId
      const firstTools = await client.listTools()
      const secondTools = await client.listTools()

      expect(firstTools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(secondTools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(transport.sessionId).toBe(firstSessionId)
    })
  })

  it('supports HEAD health checks and rejects unsupported health methods', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const headResponse = await fetch(handle.healthUrl, { method: 'HEAD' })
    const postResponse = await fetch(handle.healthUrl, { method: 'POST' })
    const postPayload = (await postResponse.json()) as Record<string, unknown>

    expect(headResponse.status).toBe(200)
    expect(await headResponse.text()).toBe('')
    expect(postResponse.status).toBe(405)
    expect(postPayload).toEqual({ ok: false, error: 'Method not allowed' })
  })

  it('returns 404 for unknown routes', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(`${handle.url}/missing`)
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(404)
    expect(payload).toEqual({ ok: false, error: 'Not found' })
  })

  it('rejects MCP requests without the declared remote auth headers', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          clientInfo: {
            name: 'unauthorized-client',
            version: '1.0.0',
          },
          protocolVersion: '2025-03-26',
          capabilities: {},
        },
      }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(401)
    expect(payload).toMatchObject({
      error: {
        code: -32003,
        message: expect.stringContaining('X-Dokploy-Url'),
      },
    })
  })

  it('rejects partial remote auth headers with a controlled 400', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        [remoteDokployHeaders.apiKey.name]: defaultRemoteDokployApiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          clientInfo: {
            name: 'partial-auth-client',
            version: '1.0.0',
          },
          protocolVersion: '2025-03-26',
          capabilities: {},
        },
      }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32000,
        message: expect.stringContaining('must be provided together'),
      },
    })
  })

  it('rejects disallowed browser origins and supports explicit preflight allowlists', async () => {
    const handle = await startTestHttpServer({
      mode: 'codemode',
      allowedOrigins: ['https://cursor.example.com'],
    })

    const forbidden = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        Origin: 'https://evil.example.com',
        ...createRemoteRequestHeaders(),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          clientInfo: {
            name: 'origin-client',
            version: '1.0.0',
          },
          protocolVersion: '2025-03-26',
          capabilities: {},
        },
      }),
    })
    const forbiddenPayload = (await forbidden.json()) as Record<string, unknown>

    expect(forbidden.status).toBe(403)
    expect(forbiddenPayload).toMatchObject({
      error: {
        code: -32004,
        message: expect.stringContaining('not allowed'),
      },
    })

    const preflight = await fetch(handle.mcpUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://cursor.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': [
          remoteDokployHeaders.url.name,
          remoteDokployHeaders.apiKey.name,
          'Content-Type',
        ].join(', '),
      },
    })

    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('https://cursor.example.com')
    expect(preflight.headers.get('access-control-allow-methods')).toContain('POST')
    expect(preflight.headers.get('access-control-allow-headers')).toContain(
      remoteDokployHeaders.url.name,
    )
  })

  it('rejects GET requests to /mcp without a session header', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        ...createRemoteRequestHeaders(),
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32000,
        message: 'Bad Request: Mcp-Session-Id header is required',
      },
    })
  })

  it('rejects unknown MCP session IDs', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'mcp-session-id': 'missing-session',
        'mcp-protocol-version': '2025-03-26',
        ...createRemoteRequestHeaders(),
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(404)
    expect(payload).toMatchObject({
      error: {
        code: -32001,
        message: 'Session not found',
      },
    })
  })

  it('rejects malformed JSON on POST /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...createRemoteRequestHeaders(),
      },
      body: '{"jsonrpc":"2.0",',
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON',
      },
    })
  })

  it('returns a controlled 400 for parser-level malformed HTTP traffic and stays healthy', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)

    try {
      const malformedResponses = await Promise.all(
        Array.from({ length: 4 }, () => sendMalformedParserLevelRequest(handle)),
      )

      for (const response of malformedResponses) {
        expect(response).toContain('HTTP/1.1 400 Bad Request')
        expect(response).toContain('Connection: close')
      }

      const result = await client.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await closeHttpClient(client)
    }
  })

  it('rejects structurally invalid JSON-RPC payloads on POST /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...createRemoteRequestHeaders(),
      },
      body: JSON.stringify({ hello: 'world' }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32700,
        message: 'Parse error: Invalid JSON-RPC message',
      },
    })
  })

  it('rejects POST /mcp without a session header after initialization-only flow', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...createRemoteRequestHeaders(),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
        params: {},
      }),
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(400)
    expect(payload).toMatchObject({
      error: {
        code: -32000,
        message: 'Bad Request: Mcp-Session-Id header is required',
      },
    })
  })

  it('rejects unsupported methods on /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/json, text/event-stream',
      },
    })
    const payload = (await response.json()) as Record<string, unknown>

    expect(response.status).toBe(405)
    expect(payload).toMatchObject({
      error: {
        code: -32603,
        message: 'Method not allowed',
      },
    })
  })

  it('supports explicit hybrid mode and tag filtering over HTTP', async () => {
    const handle = await startTestHttpServer({
      mode: 'hybrid',
      enabledTags: ['project'],
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()
      const names = tools.map((tool) => tool.name)

      expect(names).toContain('search')
      expect(names).toContain('execute')
      expect(names).toContain('project.one')
      expect(names).not.toContain('application.one')
    })
  })

  it('terminates sessions and rejects reuse after DELETE', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    await withHttpClientTransport(handle, async (_client, transport) => {
      const sessionId = transport.sessionId

      expect(sessionId).toEqual(expect.any(String))

      const response = await fetch(handle.mcpUrl, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json, text/event-stream',
          'content-type': 'application/json',
          'mcp-session-id': sessionId!,
          'mcp-protocol-version': '2025-03-26',
          ...createRemoteRequestHeaders(),
        },
      })

      expect(response.status).toBe(200)
      await expectSessionNotFound(handle, sessionId!)
    })
  })

  it('keeps concurrent sessions isolated', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const first = await createConnectedHttpClient(handle)
    const second = await createConnectedHttpClient(handle)

    try {
      expect(first.transport.sessionId).toEqual(expect.any(String))
      expect(second.transport.sessionId).toEqual(expect.any(String))
      expect(first.transport.sessionId).not.toBe(second.transport.sessionId)

      await first.transport.terminateSession()
      expect(first.transport.sessionId).toBeUndefined()

      const tools = await second.client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)

      const result = await second.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await Promise.allSettled([closeHttpClient(first), closeHttpClient(second)])
    }
  })

  it('prefers per-request remote credentials over local HTTP fallback config', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://env.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'env-key')

    const handle = await startTestHttpServer({
      mode: 'hybrid',
      enabledTags: ['project'],
      allowConfigFallback: true,
    })
    const originalFetch = globalThis.fetch
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: URL | RequestInfo, init?: RequestInit) => {
        const urlString =
          typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlString.startsWith(handle.url)) {
          return await originalFetch(url, init)
        }

        return createJsonTextResponse({
          result: {
            data: {
              json: [{ projectId: 'project-1', name: 'Remote project' }],
            },
          },
        })
      })

    vi.stubGlobal('fetch', fetchMock)

    const client = await createConnectedHttpClient(handle, {
      requestInit: {
        headers: createRemoteRequestHeaders({
          [remoteDokployHeaders.url.name]: 'https://remote.example.com',
          [remoteDokployHeaders.apiKey.name]: 'remote-key',
        }),
      },
    })

    try {
      const result = await client.client.callTool({
        name: 'project.all',
        arguments: {},
      })

      expect(result.isError).not.toBe(true)
      expect(result.structuredContent).toMatchObject({
        items: [{ projectId: 'project-1', name: 'Remote project' }],
      })
    } finally {
      await closeHttpClient(client)
    }

    const dokployCalls = fetchMock.mock.calls.filter(([url]) => {
      const urlString =
        typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      return !urlString.startsWith(handle.url)
    })
    const [requestUrl, requestInit] = dokployCalls[0] as [string, RequestInit]
    const requestHeaders = requestInit.headers as Record<string, string>

    expect(dokployCalls).toHaveLength(1)
    expect(requestUrl).toContain('https://remote.example.com/api/trpc/project.all')
    expect(requestUrl).not.toContain('env.example.com')
    expect(requestHeaders['x-api-key']).toBe('remote-key')
  })

  it('supports list_profiles and execute(profile=...) through HTTP transport with local fallback config', async () => {
    vi.stubEnv('DOKPLOY_URL', 'https://default.example.com')
    vi.stubEnv('DOKPLOY_API_KEY', 'default-key')
    vi.stubEnv(
      'DOKPLOY_PROFILES_JSON',
      JSON.stringify({
        mezon: {
          url: 'https://mezon.example.com',
          apiKey: 'mezon-key',
        },
        redivo: {
          url: 'https://redivo.example.com',
          apiKey: 'redivo-key',
        },
      }),
    )

    const handle = await startTestHttpServer({
      mode: 'codemode',
      allowConfigFallback: true,
    })
    const originalFetch = globalThis.fetch
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: URL | RequestInfo, init?: RequestInit) => {
        const urlString =
          typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlString.startsWith(handle.url)) {
          return await originalFetch(url, init)
        }

        return createJsonTextResponse({
          result: {
            data: {
              json: [{ projectId: 'project-1', name: 'Mezon project' }],
            },
          },
        })
      })

    vi.stubGlobal('fetch', fetchMock)

    const client = await createConnectedHttpClientWithoutRemoteHeaders(handle, {
      requestInit: {
        headers: {},
      },
    })

    try {
      const profiles = await client.client.callTool({
        name: 'list_profiles',
        arguments: {},
      })

      expect(profiles.isError).not.toBe(true)
      expect(profiles.structuredContent).toEqual({
        profiles: [
          {
            name: 'default',
            url: 'https://default.example.com/api/trpc',
            source: 'env',
          },
          {
            name: 'mezon',
            url: 'https://mezon.example.com/api/trpc',
            source: 'profiles-json',
          },
          {
            name: 'redivo',
            url: 'https://redivo.example.com/api/trpc',
            source: 'profiles-json',
          },
        ],
      })

      const result = await client.client.callTool({
        name: 'execute',
        arguments: {
          profile: 'mezon',
          code: 'return await dokploy.project.all()',
        },
      })

      expect(result.isError).not.toBe(true)
      expect(result.structuredContent).toMatchObject({
        result: [{ projectId: 'project-1', name: 'Mezon project' }],
      })
    } finally {
      await closeHttpClient(client)
    }

    const dokployCalls = fetchMock.mock.calls.filter(([url]) => {
      const urlString =
        typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      return !urlString.startsWith(handle.url)
    })
    const [requestUrl, requestInit] = dokployCalls[0] as [string, RequestInit]
    const requestHeaders = requestInit.headers as Record<string, string>

    expect(dokployCalls).toHaveLength(1)
    expect(requestUrl).toContain('https://mezon.example.com/api/trpc/project.all')
    expect(requestHeaders['x-api-key']).toBe('mezon-key')
    expect(requestUrl).not.toContain('default.example.com')
  })

  it('keeps remote Dokploy credentials isolated across concurrent HTTP sessions', async () => {
    const handle = await startTestHttpServer({
      mode: 'hybrid',
      enabledTags: ['project'],
    })
    const originalFetch = globalThis.fetch
    const fetchMock = vi
      .fn()
      .mockImplementation(async (url: URL | RequestInfo, init?: RequestInit) => {
        const urlString =
          typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        if (urlString.startsWith(handle.url)) {
          return await originalFetch(url, init)
        }

        const headers = (init?.headers ?? {}) as Record<string, string>
        const apiKey = headers['x-api-key']
        const baseUrl = new URL(urlString)

        return createJsonTextResponse({
          result: {
            data: {
              json: [
                {
                  projectId: apiKey,
                  name: baseUrl.hostname,
                },
              ],
            },
          },
        })
      })

    vi.stubGlobal('fetch', fetchMock)

    const first = await createConnectedHttpClient(handle, {
      requestInit: {
        headers: createRemoteRequestHeaders({
          [remoteDokployHeaders.url.name]: 'https://alpha.example.com',
          [remoteDokployHeaders.apiKey.name]: 'alpha-key',
        }),
      },
    })
    const second = await createConnectedHttpClient(handle, {
      requestInit: {
        headers: createRemoteRequestHeaders({
          [remoteDokployHeaders.url.name]: 'https://beta.example.com',
          [remoteDokployHeaders.apiKey.name]: 'beta-key',
        }),
      },
    })

    try {
      const [firstResult, secondResult] = await Promise.all([
        first.client.callTool({
          name: 'project.all',
          arguments: {},
        }),
        second.client.callTool({
          name: 'project.all',
          arguments: {},
        }),
      ])

      expect(firstResult.isError).not.toBe(true)
      expect(firstResult.structuredContent).toMatchObject({
        items: [{ projectId: 'alpha-key', name: 'alpha.example.com' }],
      })
      expect(secondResult.isError).not.toBe(true)
      expect(secondResult.structuredContent).toMatchObject({
        items: [{ projectId: 'beta-key', name: 'beta.example.com' }],
      })
    } finally {
      await Promise.allSettled([closeHttpClient(first), closeHttpClient(second)])
    }

    const observedKeys = fetchMock.mock.calls
      .filter(([url]) => {
        const urlString =
          typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
        return !urlString.startsWith(handle.url)
      })
      .map(([, init]) => {
        const headers = (init?.headers ?? {}) as Record<string, string>
        return headers['x-api-key']
      })

    expect(observedKeys.sort()).toEqual(['alpha-key', 'beta-key'])
  })

  it('rejects session reuse when request credentials do not match the bound session config', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)
    const sessionId = client.transport.sessionId!

    try {
      const response = await fetch(handle.mcpUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'mcp-session-id': sessionId,
          'mcp-protocol-version': '2025-03-26',
          ...createRemoteRequestHeaders({
            [remoteDokployHeaders.url.name]: 'https://other.example.com',
            [remoteDokployHeaders.apiKey.name]: 'other-key',
          }),
        },
      })
      const payload = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(403)
      expect(payload).toMatchObject({
        error: {
          code: -32004,
          message: expect.stringContaining('do not match'),
        },
      })
    } finally {
      await closeHttpClient(client)
    }
  })

  it('supports reconnecting with an existing session id', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)

    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))

    await closeHttpClient(initial)
    const reconnect = await createReconnectHttpClient(handle, sessionId!)

    try {
      expect(reconnect.transport.sessionId).toBe(sessionId)

      const tools = await reconnect.client.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)

      const result = await reconnect.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await closeHttpClient(reconnect)
    }
  })

  it('does not leak sessions across repeated create and delete cycles', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const priorSessionIds = new Set<string>()

    for (let index = 0; index < 5; index += 1) {
      const client = await createConnectedHttpClient(handle)
      const sessionId = client.transport.sessionId

      expect(sessionId).toEqual(expect.any(String))
      expect(priorSessionIds.has(sessionId!)).toBe(false)
      priorSessionIds.add(sessionId!)

      await client.transport.terminateSession()
      expect(client.transport.sessionId).toBeUndefined()
      await expectSessionNotFound(handle, sessionId!)
      await closeHttpClient(client)
    }
  })

  it('keeps larger bursts of concurrent clients isolated under parallel calls', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const clients = await Promise.all(
      Array.from({ length: 12 }, () => createConnectedHttpClient(handle)),
    )

    try {
      const sessionIds = clients.map((client) => client.transport.sessionId)

      expect(sessionIds.every((sessionId) => typeof sessionId === 'string')).toBe(true)
      expect(new Set(sessionIds).size).toBe(clients.length)

      const results = await Promise.all(
        clients.map(async (client, index) => {
          const [tools, callResult] = await Promise.all([
            client.client.listTools(),
            client.client.callTool({
              name: 'search',
              arguments: {
                code: `catalog.getByTag("project").length + ${index}`,
              },
            }),
          ])

          return { tools, callResult }
        }),
      )

      for (const [index, result] of results.entries()) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
        expect(result.callResult.isError).not.toBe(true)
        expect(result.callResult.structuredContent).toMatchObject({
          result: expect.any(Number),
          logs: [],
        })
        expect((result.callResult.structuredContent as { result: number }).result >= index).toBe(
          true,
        )
      }

      await Promise.all(clients.slice(0, 6).map((client) => client.transport.terminateSession()))

      await Promise.all(
        clients
          .slice(0, 6)
          .map((client) => expectSessionNotFound(handle, client.transport.sessionId!)),
      )

      const survivingResults = await Promise.all(
        clients.slice(6).map((client) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
        ),
      )

      for (const result of survivingResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))
    }
  })

  it('supports reconnect handoff while the original client is still active', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)
    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))

    const reconnect = await createReconnectHttpClient(handle, sessionId!)

    try {
      const [initialTools, reconnectTools, initialCall, reconnectCall] = await Promise.all([
        initial.client.listTools(),
        reconnect.client.listTools(),
        initial.client.callTool({
          name: 'search',
          arguments: {
            code: 'catalog.getByTag("project").length',
          },
        }),
        reconnect.client.callTool({
          name: 'search',
          arguments: {
            code: 'catalog.getByTag("project").length + 1',
          },
        }),
      ])

      expect(initialTools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(reconnectTools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
      expect(initialCall.isError).not.toBe(true)
      expect(reconnectCall.isError).not.toBe(true)

      await closeHttpClient(initial)

      const reconnectAfterHandoff = await reconnect.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(reconnectAfterHandoff.isError).not.toBe(true)

      await reconnect.transport.terminateSession()
      expect(reconnect.transport.sessionId).toBeUndefined()
      await expectSessionNotFound(handle, sessionId!)
    } finally {
      await Promise.allSettled([closeHttpClient(initial), closeHttpClient(reconnect)])
    }
  })

  it('supports multiple concurrent reconnect clients on the same session under pressure', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primary = await createConnectedHttpClient(handle)
    const sessionId = primary.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))

    const reconnectClients = await settleWithin(
      Promise.all(Array.from({ length: 5 }, () => createReconnectHttpClient(handle, sessionId!))),
      'concurrent reconnect clients',
      5_000,
    )

    try {
      const firstWave = await Promise.all(
        [primary, ...reconnectClients].map(async (client, index) => {
          const [tools, callResult] = await Promise.all([
            settleWithin(
              client.client.listTools(),
              `first reconnect wave client ${index} listTools`,
              10_000,
            ),
            settleWithin(
              client.client.callTool({
                name: 'search',
                arguments: {
                  code: `catalog.getByTag("project").length + ${index}`,
                },
              }),
              `first reconnect wave client ${index} search`,
              10_000,
            ),
          ])

          return { tools, callResult }
        }),
      )

      for (const result of firstWave) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
        expect(result.callResult.isError).not.toBe(true)
      }

      await closeHttpClient(primary)

      const reconnectWave = await settleWithin(
        Promise.all(
          reconnectClients.map((client, index) =>
            client.client.callTool({
              name: 'search',
              arguments: {
                code: `catalog.getByTag("project").length + ${index + 10}`,
              },
            }),
          ),
        ),
        'second reconnect wave',
        10_000,
      )

      for (const result of reconnectWave) {
        expect(result.isError).not.toBe(true)
      }

      const deleteResult = await deleteSession(handle, sessionId!)

      if (deleteResult.kind === 'response') {
        expect(deleteResult.response.status).toBe(200)
      } else {
        expect(deleteResult.error).toBeInstanceOf(Error)
      }

      await expectSessionNotFound(handle, sessionId!)
    } finally {
      await Promise.allSettled([
        closeHttpClient(primary),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('survives longer repeated create reconnect and terminate pressure', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const priorSessionIds = new Set<string>()

    for (let index = 0; index < 20; index += 1) {
      const client = await createConnectedHttpClient(handle)
      const sessionId = client.transport.sessionId

      expect(sessionId).toEqual(expect.any(String))
      expect(priorSessionIds.has(sessionId!)).toBe(false)
      priorSessionIds.add(sessionId!)

      const reconnect = await createReconnectHttpClient(handle, sessionId!)

      try {
        const [primaryResult, reconnectResult] = await Promise.all([
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
          reconnect.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
        ])

        expect(primaryResult.isError).not.toBe(true)
        expect(reconnectResult.isError).not.toBe(true)

        if (index % 2 === 0) {
          await closeHttpClient(client)

          const reconnectOnlyResult = await reconnect.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          })

          expect(reconnectOnlyResult.isError).not.toBe(true)
        }

        await reconnect.transport.terminateSession()
        expect(reconnect.transport.sessionId).toBeUndefined()
        await expectSessionNotFound(handle, sessionId!)
      } finally {
        await Promise.allSettled([closeHttpClient(client), closeHttpClient(reconnect)])
      }
    }
  }, 60_000)

  it('applies managed shutdown semantics when callers use createHttpServer directly', async () => {
    const handle = await startCreatedTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)

    try {
      const pendingCall = captureToolCall(
        client.client.callTool({
          name: 'execute',
          arguments: {
            code: buildSleepExecuteCode(150, 'direct-create-http-server-close'),
          },
        }),
      )
      const partialRequest = sendAbortedPartialPost(handle)

      await waitFor(20)

      const closeResults = await settleWithin(
        Promise.all(
          Array.from(
            { length: 4 },
            () =>
              new Promise<void>((resolve, reject) => {
                handle.server.close((error) => {
                  if (error) {
                    reject(error)
                    return
                  }

                  resolve()
                })
              }),
          ),
        ),
        'direct createHttpServer close callers',
        4_000,
      )
      await closeHttpClient(client)
      const result = await settleWithin(pendingCall, 'direct createHttpServer active call', 4_000)
      const partialResult = await partialRequest

      expect(closeResults).toHaveLength(4)
      expect(['close', 'error']).toContain(partialResult)

      if (result.kind === 'error') {
        expectConnectionClosedSdkError(result.error)
      } else if (result.result.isError) {
        expectConnectionClosedToolError(result.result)
      } else {
        expect(result.result.structuredContent).toMatchObject({
          result: {
            label: 'direct-create-http-server-close',
            slept: 150,
          },
        })
      }
    } finally {
      await closeHttpClient(client)
    }
  })

  it('stays healthy under reconnect stress mixed with malformed and aborted request bursts', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primaryClients = await Promise.all(
      Array.from({ length: 6 }, () => createConnectedHttpClient(handle)),
    )
    const reconnectClients = await Promise.all(
      primaryClients.map((client) =>
        createReconnectHttpClient(handle, client.transport.sessionId!),
      ),
    )

    try {
      const validOperations = [...primaryClients, ...reconnectClients].map((client, index) =>
        client.client.callTool({
          name: 'search',
          arguments: {
            code: `catalog.getByTag("project").length + ${index}`,
          },
        }),
      )

      const malformedRequests = Array.from({ length: 6 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            ...createRemoteRequestHeaders(),
          },
          body: '{"jsonrpc":"2.0",',
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )

      const invalidRequests = Array.from({ length: 6 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            ...createRemoteRequestHeaders(),
          },
          body: JSON.stringify({ invalid: true }),
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )

      const abortedRequests = Array.from({ length: 6 }, () => sendAbortedPartialPost(handle))

      const [validResults, malformedResults, invalidResults, abortedResults] = await Promise.all([
        Promise.all(validOperations),
        Promise.all(malformedRequests),
        Promise.all(invalidRequests),
        Promise.all(abortedRequests),
      ])

      for (const result of validResults) {
        expect(result.isError).not.toBe(true)
      }

      for (const result of malformedResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON',
          },
        })
      }

      for (const result of invalidResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON-RPC message',
          },
        })
      }

      for (const result of abortedResults) {
        expect(['close', 'error']).toContain(result)
      }

      await Promise.all(primaryClients.slice(0, 3).map((client) => closeHttpClient(client)))

      const reconnectAfterBurstResults = await Promise.all(
        reconnectClients.map((client, index) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ),
      )

      for (const result of reconnectAfterBurstResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled([
        ...primaryClients.map((client) => closeHttpClient(client)),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('stays healthy under reconnect-only mixed fault bursts including truncated bodies', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primaryClients = await Promise.all(
      Array.from({ length: 8 }, () => createConnectedHttpClient(handle)),
    )
    const reconnectClients = await Promise.all(
      primaryClients.map((client) =>
        createReconnectHttpClient(handle, client.transport.sessionId!),
      ),
    )

    try {
      await Promise.all(primaryClients.slice(0, 4).map((client) => closeHttpClient(client)))

      const activeClients = [...primaryClients.slice(4), ...reconnectClients]
      const validOperations = activeClients.map(async (client, index) => {
        const [tools, callResult] = await Promise.all([
          client.client.listTools(),
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ])

        return { tools, callResult }
      })
      const malformedRequests = Array.from({ length: 8 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            ...createRemoteRequestHeaders(),
          },
          body: '{"jsonrpc":"2.0",',
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )
      const invalidRequests = Array.from({ length: 8 }, () =>
        fetch(handle.mcpUrl, {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/event-stream',
            'content-type': 'application/json',
            ...createRemoteRequestHeaders(),
          },
          body: JSON.stringify({ invalid: true }),
        }).then(async (response) => ({
          status: response.status,
          payload: (await response.json()) as Record<string, unknown>,
        })),
      )
      const abortedRequests = Array.from({ length: 8 }, () => sendAbortedPartialPost(handle))
      const truncatedRequests = Array.from({ length: 8 }, () =>
        sendTruncatedContentLengthPost(handle),
      )

      const [validResults, malformedResults, invalidResults, abortedResults, truncatedResults] =
        await Promise.all([
          Promise.all(validOperations),
          Promise.all(malformedRequests),
          Promise.all(invalidRequests),
          Promise.all(abortedRequests),
          Promise.all(truncatedRequests),
        ])

      for (const result of validResults) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
        expect(result.callResult.isError).not.toBe(true)
      }

      for (const result of malformedResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON',
          },
        })
      }

      for (const result of invalidResults) {
        expect(result.status).toBe(400)
        expect(result.payload).toMatchObject({
          error: {
            code: -32700,
            message: 'Parse error: Invalid JSON-RPC message',
          },
        })
      }

      for (const result of abortedResults) {
        expect(['close', 'error']).toContain(result)
      }

      for (const result of truncatedResults) {
        expect(['close', 'error', 'data']).toContain(result)
      }

      const reconnectAfterBurstResults = await Promise.all(
        reconnectClients.map((client, index) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: `catalog.getByTag("project").length + ${index}`,
            },
          }),
        ),
      )

      for (const result of reconnectAfterBurstResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled([
        ...primaryClients.map((client) => closeHttpClient(client)),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('keeps reconnect clients healthy through parser-level malformed HTTP bursts', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const primaryClients = await Promise.all(
      Array.from({ length: 4 }, () => createConnectedHttpClient(handle)),
    )
    const reconnectClients = await Promise.all(
      primaryClients.map((client) =>
        createReconnectHttpClient(handle, client.transport.sessionId!),
      ),
    )

    try {
      await Promise.all(primaryClients.map((client) => closeHttpClient(client)))

      const [validResults, malformedResponses] = await Promise.all([
        Promise.all(
          reconnectClients.map(async (client, index) => {
            const [tools, callResult] = await Promise.all([
              client.client.listTools(),
              client.client.callTool({
                name: 'search',
                arguments: {
                  code: `catalog.getByTag("project").length + ${index}`,
                },
              }),
            ])

            return { tools, callResult }
          }),
        ),
        Promise.all(Array.from({ length: 8 }, () => sendMalformedParserLevelRequest(handle))),
      ])

      for (const response of malformedResponses) {
        expect(response).toContain('HTTP/1.1 400 Bad Request')
        expect(response).toContain('Connection: close')
      }

      for (const result of validResults) {
        expect(result.tools.tools.map((tool) => tool.name)).toEqual(codeModeToolNames)
        expect(result.callResult.isError).not.toBe(true)
      }

      const postBurstResults = await Promise.all(
        reconnectClients.map((client) =>
          client.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
        ),
      )

      for (const result of postBurstResults) {
        expect(result.isError).not.toBe(true)
      }
    } finally {
      await Promise.allSettled([
        ...primaryClients.map((client) => closeHttpClient(client)),
        ...reconnectClients.map((client) => closeHttpClient(client)),
      ])
    }
  })

  it('lets active requests finish cleanly while server shutdown is in progress', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)

    try {
      const pendingCall = captureToolCall(
        client.client.callTool({
          name: 'execute',
          arguments: {
            code: buildSleepExecuteCode(150, 'shutdown-drain-complete'),
          },
        }),
      )

      await waitFor(20)

      const closePromise = settleWithin(handle.close(), 'shutdown drain close', 4_000)
      await closePromise
      await closeHttpClient(client)
      const result = await settleWithin(pendingCall, 'shutdown drain active call', 4_000)

      if (result.kind === 'error') {
        expectConnectionClosedSdkError(result.error)
      } else if (result.result.isError) {
        expectConnectionClosedToolError(result.result)
      } else {
        expect(result.result.structuredContent).toMatchObject({
          result: {
            label: 'shutdown-drain-complete',
            slept: 150,
          },
        })
      }
    } finally {
      await closeHttpClient(client)
    }
  })

  it('does not hang when session deletion races with shutdown during an active request', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const client = await createConnectedHttpClient(handle)
    const sessionId = client.transport.sessionId!

    try {
      const pendingCall = captureToolCall(
        client.client.callTool({
          name: 'execute',
          arguments: {
            code: buildSleepExecuteCode(150, 'race-finished'),
          },
        }),
      )

      await waitFor(20)

      const deletePromise = settleWithin(deleteSession(handle, sessionId), 'shutdown race delete')
      const closePromise = settleWithin(handle.close(), 'shutdown race close')
      const deleteResult = await deletePromise
      const closeResult = await closePromise
      await closeHttpClient(client)
      const callResult = await settleWithin(pendingCall, 'shutdown race active call', 4_000)

      if (deleteResult.kind === 'response') {
        expect([200, 404, 503]).toContain(deleteResult.response.status)
      } else {
        expect(deleteResult.error).toBeInstanceOf(Error)
      }

      if (callResult.kind === 'error') {
        expectConnectionClosedSdkError(callResult.error)
      } else if (callResult.result.isError) {
        expectConnectionClosedToolError(callResult.result)
      } else {
        expect(callResult.result.structuredContent).toMatchObject({
          result: {
            label: 'race-finished',
            slept: 150,
          },
        })
      }
      expect(closeResult).toBeUndefined()
    } finally {
      await closeHttpClient(client)
    }
  })

  it('does not hang shutdown on a request with an unfinished body', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const url = new URL(handle.mcpUrl)
    const request = http.request({
      host: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        ...createRemoteRequestHeaders(),
      },
    })
    const requestSettled = new Promise<'close' | 'error'>((resolve) => {
      request.once('close', () => resolve('close'))
      request.once('error', () => resolve('error'))
    })
    const [socket] = (await once(request, 'socket')) as [http.ClientRequest['socket']]

    if (socket && 'connecting' in socket && socket.connecting) {
      await once(socket, 'connect')
    }

    request.write('{"jsonrpc":"2.0"')
    await waitFor(20)

    await settleWithin(handle.close(), 'HTTP shutdown with unfinished request body')
    await settleWithin(requestSettled, 'unfinished request cleanup')
  })

  it('closes active SSE streams during shutdown without hanging', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)
    const sessionId = initial.transport.sessionId

    expect(sessionId).toEqual(expect.any(String))
    await closeHttpClient(initial)

    const url = new URL(handle.mcpUrl)
    const request = http.request({
      host: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'mcp-session-id': sessionId!,
        'mcp-protocol-version': '2025-03-26',
        ...createRemoteRequestHeaders(),
      },
    })

    request.end()
    const [response] = (await once(request, 'response')) as [http.IncomingMessage]
    const streamSettled = Promise.race([
      once(response, 'aborted'),
      once(response, 'close'),
      once(response, 'end'),
    ])
    response.resume()

    expect([200, 409]).toContain(response.statusCode)
    if (response.statusCode === 200) {
      expect(response.headers['content-type']).toContain('text/event-stream')
    }

    await settleWithin(handle.close(), 'HTTP shutdown with active SSE stream')
    await settleWithin(streamSettled, 'active SSE cleanup')
  })

  it('closes active shared-session streams cleanly when duplicate deletes race with unrelated traffic', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const victim = await createConnectedHttpClient(handle)
    const survivor = await createConnectedHttpClient(handle)
    const sessionId = victim.transport.sessionId!
    await closeHttpClient(victim)
    const stream = await openSessionEventStream(handle, sessionId)

    try {
      expect(stream.response.statusCode).toBe(200)
      expect(stream.response.headers['content-type']).toContain('text/event-stream')

      const [firstDelete, secondDelete, streamResult, survivorResult] = await Promise.all([
        settleWithin(deleteSession(handle, sessionId), 'duplicate delete first'),
        settleWithin(deleteSession(handle, sessionId), 'duplicate delete second'),
        settleWithin(stream.settled, 'duplicate delete stream cleanup', 4_000),
        settleWithin(
          survivor.client.callTool({
            name: 'search',
            arguments: {
              code: 'catalog.getByTag("project").length',
            },
          }),
          'duplicate delete survivor call',
          4_000,
        ),
      ])

      for (const result of [firstDelete, secondDelete]) {
        if (result.kind === 'response') {
          expect([200, 404, 503]).toContain(result.response.status)
        } else {
          expect(result.error).toBeInstanceOf(Error)
        }
      }

      expect(['aborted', 'close', 'end']).toContain(streamResult)

      expect(survivorResult.isError).not.toBe(true)
      await expectSessionNotFound(handle, sessionId)
    } finally {
      await Promise.allSettled([closeHttpClient(victim), closeHttpClient(survivor)])
    }
  })

  it('settles mixed termination ordering under concurrency during shutdown', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const clients = await Promise.all(
      Array.from({ length: 8 }, () => createConnectedHttpClient(handle)),
    )

    try {
      const operations = [
        ...clients.slice(0, 2).map((client) => client.transport.terminateSession()),
        ...clients.slice(2, 4).map((client) => deleteSession(handle, client.transport.sessionId!)),
        ...clients.slice(4).map((client, index) =>
          client.client
            .callTool({
              name: 'search',
              arguments: {
                code: `catalog.getByTag("project").length + ${index}`,
              },
            })
            .then((result) => ({ kind: 'tool-result' as const, result }))
            .catch((error) => ({ kind: 'tool-error' as const, error })),
        ),
      ]

      const settled = await settleWithin(
        Promise.allSettled([...operations, handle.close()]),
        'mixed termination ordering shutdown',
        6_000,
      )

      const shutdownResult = settled.at(-1)
      const deleteResults = settled.slice(2, 4)

      expect(shutdownResult?.status).toBe('fulfilled')

      for (const result of deleteResults) {
        expect(result.status).toBe('fulfilled')
        if (result.status !== 'fulfilled') {
          continue
        }

        if (result.value.kind === 'response') {
          expect([200, 404, 503]).toContain(result.value.response.status)
        } else {
          expect(result.value.error).toBeInstanceOf(Error)
        }
      }
    } finally {
      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))
    }
  })

  it('drains shutdown under mixed active calls streams and broken request pressure', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const clients = await Promise.all(
      Array.from({ length: 6 }, () => createConnectedHttpClient(handle)),
    )
    const streamSessions = clients.slice(0, 2).map((client) => client.transport.sessionId!)

    try {
      const streams = await Promise.all(
        streamSessions.map((sessionId) => openSessionEventStream(handle, sessionId)),
      )

      for (const stream of streams) {
        expect([200, 409]).toContain(stream.response.statusCode)
        if (stream.response.statusCode === 200) {
          expect(stream.response.headers['content-type']).toContain('text/event-stream')
        }
      }

      const activeCalls = clients.slice(2).map((client, index) =>
        captureToolCall(
          client.client.callTool({
            name: 'execute',
            arguments: {
              code: buildSleepExecuteCode(175, `shutdown-pressure-${index}`),
            },
          }),
        ),
      )
      const abortedRequests = Array.from({ length: 4 }, () => sendAbortedPartialPost(handle))
      const truncatedRequests = Array.from({ length: 4 }, () =>
        sendTruncatedContentLengthPost(handle),
      )

      await waitFor(20)

      const closeResult = await settleWithin(handle.close(), 'shutdown pressure close', 6_000)
      expect(closeResult).toBeUndefined()

      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))

      const [callResults, abortedResults, truncatedResults, streamResults] = await Promise.all([
        Promise.all(activeCalls),
        Promise.all(abortedRequests),
        Promise.all(truncatedRequests),
        Promise.all(
          streams.map((stream) =>
            settleWithin(stream.settled, 'shutdown pressure stream cleanup', 4_000),
          ),
        ),
      ])

      for (const [index, result] of callResults.entries()) {
        if (result.kind === 'error') {
          expectConnectionClosedSdkError(result.error)
        } else if (result.result.isError) {
          expectConnectionClosedToolError(result.result)
        } else {
          expect(result.result.structuredContent).toMatchObject({
            result: {
              label: `shutdown-pressure-${index}`,
              slept: 175,
            },
          })
        }
      }

      for (const result of abortedResults) {
        expect(['close', 'error']).toContain(result)
      }

      for (const result of truncatedResults) {
        expect(['close', 'error', 'data']).toContain(result)
      }

      for (const result of streamResults) {
        expect(['aborted', 'close', 'end']).toContain(result)
      }
    } finally {
      await Promise.allSettled(clients.map((client) => closeHttpClient(client)))
    }
  })
})
