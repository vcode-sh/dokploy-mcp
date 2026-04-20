process.on('message', (message) => {
  if (!message || message.type !== 'run') {
    return
  }

  try {
    process.send?.({
      type: 'call',
      requestId: 1,
      procedure: 'project.one',
      input: { projectId: 'p1', bad: 1n },
    })
  } catch (error) {
    process.send?.({
      type: 'done',
      ok: false,
      error: `Sandbox worker failed to send procedure call: ${
        error instanceof Error ? error.message : String(error)
      }`,
    })
  }
})
