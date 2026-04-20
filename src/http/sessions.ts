import { randomUUID } from 'node:crypto'

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { createServer } from '../server.js'
import type { ResolvedHttpServerOptions, SessionRecord, SessionRegistry } from './types.js'

export async function closeSessionRecord(record: SessionRecord) {
  await Promise.allSettled([record.transport.close(), record.server.close()])
}

export function createSessionRegistry(): SessionRegistry {
  const sessions = new Map<string, SessionRecord>()
  const trackedRecords = new Set<SessionRecord>()
  const closingSessionPromises = new Map<string, Promise<void>>()
  const states = new WeakMap<
    SessionRecord,
    {
      activeRequests: number
      activeStreams: number
      activeRequestAborters: Set<() => void>
      closeRequested: boolean
      closePromise?: Promise<void>
      drainedResolve?: () => void
      sessionId?: string
      closed: boolean
    }
  >()
  let shuttingDown = false

  function getState(record: SessionRecord) {
    const state = states.get(record)
    if (!state) {
      throw new Error('Unknown HTTP session record')
    }

    return state
  }

  async function finalizeRecord(record: SessionRecord) {
    const state = getState(record)
    if (state.closed) {
      return
    }

    state.closed = true
    trackedRecords.delete(record)

    if (state.sessionId) {
      sessions.delete(state.sessionId)
    }

    try {
      await closeSessionRecord(record)
    } finally {
      if (state.sessionId) {
        closingSessionPromises.delete(state.sessionId)
      }
    }
  }

  function requestClose(record: SessionRecord, terminateActiveRequests = false) {
    const state = getState(record)
    if (state.closePromise) {
      return state.closePromise
    }

    state.closeRequested = true

    if (state.sessionId) {
      sessions.delete(state.sessionId)
    }

    if (terminateActiveRequests) {
      for (const aborter of [...state.activeRequestAborters]) {
        aborter()
      }
    }

    const closePromise = (async () => {
      if (state.activeRequests > 0) {
        await new Promise<void>((resolve) => {
          state.drainedResolve = resolve
        })
      }

      await finalizeRecord(record)
    })()

    state.closePromise = closePromise

    if (state.sessionId) {
      closingSessionPromises.set(state.sessionId, closePromise)
    }

    return closePromise
  }

  return {
    get(sessionId: string) {
      return sessions.get(sessionId)
    },
    trackRecord(record: SessionRecord) {
      trackedRecords.add(record)
      states.set(record, {
        activeRequests: 0,
        activeStreams: 0,
        activeRequestAborters: new Set(),
        closeRequested: false,
        closed: false,
      })
    },
    set(sessionId: string, record: SessionRecord) {
      const state = getState(record)
      state.sessionId = sessionId

      if (state.closeRequested || shuttingDown) {
        closingSessionPromises.set(sessionId, requestClose(record))
        return
      }

      sessions.set(sessionId, record)
    },
    delete(sessionId: string) {
      sessions.delete(sessionId)
    },
    isShuttingDown() {
      return shuttingDown
    },
    beginShutdown() {
      shuttingDown = true
    },
    beginRequest(record: SessionRecord, kind: 'request' | 'stream' | 'control') {
      const state = getState(record)
      if (shuttingDown || state.closeRequested || state.closed) {
        return false
      }

      if (kind === 'stream') {
        state.activeStreams += 1
      } else if (kind === 'request') {
        state.activeRequests += 1
      }
      return true
    },
    registerRequestAborter(record: SessionRecord, aborter: () => void) {
      const state = getState(record)
      state.activeRequestAborters.add(aborter)
    },
    unregisterRequestAborter(record: SessionRecord, aborter: () => void) {
      const state = getState(record)
      state.activeRequestAborters.delete(aborter)
    },
    async endRequest(record: SessionRecord, kind: 'request' | 'stream' | 'control') {
      const state = getState(record)

      if (kind === 'stream') {
        if (state.activeStreams === 0) {
          return
        }

        state.activeStreams -= 1
        return
      }

      if (kind === 'control') {
        return
      }

      if (state.activeRequests === 0) {
        return
      }

      state.activeRequests -= 1

      if (state.activeRequests === 0 && state.drainedResolve) {
        const resolve = state.drainedResolve
        state.drainedResolve = undefined
        resolve()
      }
    },
    async closeRecord(record: SessionRecord) {
      await requestClose(record)
    },
    async closeSession(sessionId: string) {
      const session = sessions.get(sessionId)
      if (!session) {
        await closingSessionPromises.get(sessionId)
        return
      }

      closingSessionPromises.set(sessionId, requestClose(session, true))
      await closingSessionPromises.get(sessionId)
    },
    async closeAll() {
      shuttingDown = true
      const records = [...trackedRecords]
      await Promise.allSettled(records.map((record) => requestClose(record)))
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
    onsessionclosed: (sessionId) => {
      void sessions.closeSession(sessionId)
    },
  })

  const record: SessionRecord = {
    server,
    transport,
  }
  sessions.trackRecord(record)

  transport.onclose = () => {
    const sessionId = transport.sessionId
    if (!sessionId) {
      return
    }

    void sessions.closeSession(sessionId)
  }

  return record
}
