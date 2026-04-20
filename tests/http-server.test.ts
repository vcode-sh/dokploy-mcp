import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  resolveHttpEnabledTags,
  resolveHttpServerMode,
  type StartedHttpServer,
  startHttpServer,
} from '../src/http-server.js'

const startedServers: StartedHttpServer[] = []

afterEach(async () => {
  while (startedServers.length > 0) {
    const handle = startedServers.pop()
    await handle?.close()
  }
})

async function startTestHttpServer(options: Parameters<typeof startHttpServer>[0]) {
  const handle = await startHttpServer({
    host: '127.0.0.1',
    port: 0,
    ...options,
  })
  startedServers.push(handle)
  return handle
}

async function withHttpClient(handle: StartedHttpServer, run: (client: Client) => Promise<void>) {
  const client = new Client({
    name: 'http-transport-client',
    version: '1.0.0',
  })
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl))

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
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl))

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
  const transport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl), options)
  await client.connect(transport)
  return { client, transport }
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
      mcpPath: '/mcp',
      healthPath: '/health',
    })

    await withHttpClient(handle, async (client) => {
      const { tools } = await client.listTools()

      expect(tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

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

  it('creates a reusable MCP session for HTTP clients', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    await withHttpClientTransport(handle, async (client, transport) => {
      expect(transport.sessionId).toEqual(expect.any(String))

      const firstSessionId = transport.sessionId
      const firstTools = await client.listTools()
      const secondTools = await client.listTools()

      expect(firstTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
      expect(secondTools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])
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

  it('rejects GET requests to /mcp without a session header', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
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

  it('rejects structurally invalid JSON-RPC payloads on POST /mcp', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })

    const response = await fetch(handle.mcpUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
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
        },
      })

      expect(response.status).toBe(200)

      const afterDeleteResponse = await fetch(handle.mcpUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'mcp-session-id': sessionId!,
          'mcp-protocol-version': '2025-03-26',
        },
      })
      const payload = (await afterDeleteResponse.json()) as Record<string, unknown>

      expect(afterDeleteResponse.status).toBe(404)
      expect(payload).toMatchObject({
        error: {
          code: -32001,
          message: 'Session not found',
        },
      })
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
      expect(tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

      const result = await second.client.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await Promise.allSettled([
        first.client.close(),
        first.transport.close(),
        second.client.close(),
        second.transport.close(),
      ])
    }
  })

  it('supports reconnecting with an existing session id', async () => {
    const handle = await startTestHttpServer({ mode: 'codemode' })
    const initial = await createConnectedHttpClient(handle)

    const sessionId = initial.transport.sessionId
    const protocolVersion = initial.transport.protocolVersion

    expect(sessionId).toEqual(expect.any(String))
    expect(protocolVersion).toEqual(expect.any(String))

    await Promise.allSettled([initial.client.close(), initial.transport.close()])

    const reconnectTransport = new StreamableHTTPClientTransport(new URL(handle.mcpUrl), {
      sessionId,
    })
    reconnectTransport.setProtocolVersion(protocolVersion!)

    const reconnectClient = new Client({
      name: 'http-transport-client-reconnect',
      version: '1.0.0',
    })

    await reconnectClient.connect(reconnectTransport)

    try {
      expect(reconnectTransport.sessionId).toBe(sessionId)

      const tools = await reconnectClient.listTools()
      expect(tools.tools.map((tool) => tool.name)).toEqual(['search', 'execute'])

      const result = await reconnectClient.callTool({
        name: 'search',
        arguments: {
          code: 'catalog.getByTag("project").length',
        },
      })

      expect(result.isError).not.toBe(true)
    } finally {
      await Promise.allSettled([reconnectClient.close(), reconnectTransport.close()])
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

      const response = await fetch(handle.mcpUrl, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'mcp-session-id': sessionId!,
          'mcp-protocol-version': '2025-03-26',
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

      await Promise.allSettled([client.client.close(), client.transport.close()])
    }
  })
})
