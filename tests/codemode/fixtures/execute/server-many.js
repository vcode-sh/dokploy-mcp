;async ({ dokploy }) => {
  return await dokploy.server.many({
    serverIds: ['server-2', 'server-1'],
    includeSecurity: true,
  })
}
