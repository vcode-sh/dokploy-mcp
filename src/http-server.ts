import { once } from 'node:events'
import { createServer as createNodeServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import { resolveHttpOptions } from './http/options.js'
import { createHttpRequestHandler } from './http/request-handler.js'
import { createSessionRegistry } from './http/sessions.js'
import type { HttpServerOptions, StartedHttpServer } from './http/types.js'
import { parseEnabledTags, parseServerMode, type ServerMode } from './server.js'

export type { HttpServerOptions, StartedHttpServer } from './http/types.js'

function getAddressInfo(server: ReturnType<typeof createNodeServer>) {
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Expected HTTP server to have a TCP address')
  }

  return address as AddressInfo
}

async function closeServer(server: ReturnType<typeof createNodeServer>) {
  server.close()
  await once(server, 'close')
}

export function createHttpServer(options: HttpServerOptions = {}) {
  const resolved = resolveHttpOptions(options)
  const sessions = createSessionRegistry()
  const server = createNodeServer(createHttpRequestHandler(resolved, sessions))

  server.on('close', () => {
    void sessions.closeAll()
  })

  return server
}

export async function startHttpServer(options: HttpServerOptions = {}): Promise<StartedHttpServer> {
  const resolved = resolveHttpOptions(options)
  const sessions = createSessionRegistry()
  const server = createNodeServer(createHttpRequestHandler(resolved, sessions))

  server.on('close', () => {
    void sessions.closeAll()
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(resolved.port, resolved.host, () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = getAddressInfo(server)
  const host = address.address === '::' ? '127.0.0.1' : address.address
  const baseUrl = `http://${host}:${address.port}`

  return {
    server,
    url: baseUrl,
    mcpUrl: `${baseUrl}${resolved.mcpPath}`,
    healthUrl: `${baseUrl}${resolved.healthPath}`,
    close: async () => {
      await sessions.closeAll()
      await closeServer(server)
    },
  }
}

export function resolveHttpServerMode(value?: string): ServerMode | undefined {
  return parseServerMode(value)
}

export function resolveHttpEnabledTags(value?: string) {
  return parseEnabledTags(value)
}
