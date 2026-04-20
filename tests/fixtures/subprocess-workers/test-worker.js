function sendDoneError(error) {
  process.send?.({
    type: 'done',
    ok: false,
    error,
  })
}

function handleTimeoutCall() {
  process.send?.({
    type: 'call',
    requestId: 1,
    procedure: 'project.one',
    input: { projectId: 'p1' },
  })
}

function handleUnserializableCall() {
  try {
    process.send?.(
      {
        type: 'call',
        requestId: 1,
        procedure: 'project.one',
        input: { projectId: 'p1', bad: 1n },
      },
      (error) => {
        if (!error) {
          return
        }

        sendDoneError(`Sandbox worker failed to send procedure call: ${error.message}`)
      },
    )
  } catch (error) {
    sendDoneError(
      `Sandbox worker failed to send procedure call: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

const handlers = {
  'timeout-call': handleTimeoutCall,
  'unserializable-call': handleUnserializableCall,
}

process.on('message', (message) => {
  if (!message || message.type !== 'run') {
    return
  }

  const mode = process.env.DOKPLOY_MCP_SANDBOX_TEST_WORKER_MODE?.trim()
  if (!(mode && mode in handlers)) {
    sendDoneError(`Unsupported sandbox test worker mode: ${mode || '(unset)'}.`)
    return
  }

  handlers[mode]()
})
