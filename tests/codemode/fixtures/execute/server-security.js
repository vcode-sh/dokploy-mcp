;async ({ dokploy, helpers }) => {
  const servers = await dokploy.server.all({})
  const server = helpers.selectOne(servers)
  const detail = await dokploy.server.one({ serverId: server.serverId })
  const security = await dokploy.server.security({ serverId: server.serverId })

  return {
    serverId: detail.serverId,
    securityKeys: Object.keys(security),
  }
}
