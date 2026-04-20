process.on('message', (message) => {
  if (!message || message.type !== 'run') {
    return
  }

  process.send?.({
    type: 'call',
    requestId: 1,
    procedure: 'project.one',
    input: { projectId: 'p1' },
  })
})
