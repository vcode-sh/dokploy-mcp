import { randomUUID } from 'node:crypto'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { createServer } from '../server.js'
import type { ResolvedHttpServerOptions, SessionRecord, SessionRegistry } from './types.js'

export async function closeSessionRecord(record: SessionRecord) {
  await Promise.allSettled([record.transport.close(), record.server.close()])
}

export function createSessionRegistry(): SessionRegistry {
  const sessions = new Map<string, SessionRecord>()
  const closingSessionIds = new Set<string>()

  return {
    get(sessionId: string) {
      return sessions.get(sessionId)
    },
    set(sessionId: string, record: SessionRecord) {
      sessions.set(sessionId, record)
    },
    delete(sessionId: string) {
      sessions.delete(sessionId)
    },
    async closeSession(sessionId: string) {
      const session = sessions.get(sessionId)
      if (!session || closingSessionIds.has(sessionId)) {
        return
      }

      closingSessionIds.add(sessionId)
      sessions.delete(sessionId)

      try {
        await closeSessionRecord(session)
      } finally {
        closingSessionIds.delete(sessionId)
      }
    },
    async closeAll() {
      const sessionIds = [...sessions.keys()]
      await Promise.allSettled(sessionIds.map((sessionId) => this.closeSession(sessionId)))
    },
  }
}

export function createSessionRecord(
  sessions: SessionRegistry,
  options: ResolvedHttpServerOptions,
): SessionRecord {
  const server = createServer({
    mode: options.mode,
    enabledTags: options.enabledTags,
  })

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, record)
    },
    onsessionclosed: async (sessionId) => {
      await sessions.closeSession(sessionId)
    },
  })

  const record: SessionRecord = {
    server,
    transport,
  }

  transport.onclose = () => {
    const sessionId = transport.sessionId
    if (!sessionId) {
      return
    }

    void sessions.closeSession(sessionId)
  }

  return record
}
