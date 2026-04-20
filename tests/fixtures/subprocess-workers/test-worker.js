const procedureCallBase = {
  type: 'call',
  requestId: 1,
  procedure: 'project.one',
}

function sendDoneMessage(payload) {
  process.send?.({
    type: 'done',
    ...payload,
  })
}

function sendDoneError(error) {
  sendDoneMessage({
    ok: false,
    error,
  })
}

function formatProcedureCallSendError(error) {
  return `Sandbox worker failed to send procedure call: ${
    error instanceof Error ? error.message : String(error)
  }`
}

function sendProcedureCall(input, options = {}) {
  const message = {
    ...procedureCallBase,
    input,
  }
  const reportSendError = options.reportSendError === true

  try {
    if (!reportSendError) {
      process.send?.(message)
      return
    }

    process.send?.(message, (error) => {
      if (!error) {
        return
      }

      sendDoneError(formatProcedureCallSendError(error))
    })
  } catch (error) {
    sendDoneError(formatProcedureCallSendError(error))
  }
}

function createProcedureCallMode(input, options = {}) {
  return () => {
    sendProcedureCall(input, options)
  }
}

function createDoneMode(payload) {
  return () => {
    sendDoneMessage(payload)
  }
}

function createDisconnectAfterCallMode(input) {
  return () => {
    sendProcedureCall(input)

    const exitTimer = setTimeout(() => {
      process.exit(0)
    }, 100)

    process.disconnect?.()
    return exitTimer
  }
}

function createImmediateDisconnectMode() {
  return () => {
    const exitTimer = setTimeout(() => {
      process.exit(0)
    }, 100)

    process.disconnect?.()
    return exitTimer
  }
}

const modeHandlers = {
  'timeout-call': createProcedureCallMode({ projectId: 'p1' }),
  'unserializable-call': createProcedureCallMode(
    { projectId: 'p1', bad: 1n },
    { reportSendError: true },
  ),
  'invalid-done': createDoneMode({
    ok: true,
    result: null,
    logs: [1],
  }),
  'disconnect-after-call': createDisconnectAfterCallMode({ projectId: 'p1' }),
  'disconnect-immediately': createImmediateDisconnectMode(),
}

process.on('message', (message) => {
  if (!message || message.type !== 'run') {
    return
  }

  const mode = process.env.DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE?.trim()
  const handler = mode ? modeHandlers[mode] : undefined

  if (!handler) {
    sendDoneError(`Unsupported sandbox test worker mode: ${mode || '(unset)'}.`)
    return
  }

  handler()
})
