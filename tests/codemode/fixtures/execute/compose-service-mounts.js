;async ({ dokploy, helpers }) => {
  const compose = await dokploy.compose.search({ name: 'wordpress', limit: 5 })
  const stack = helpers.selectOne(compose.items)
  const services = await dokploy.compose.loadServices({ composeId: stack.composeId })
  const serviceName = helpers.selectOne(services)
  const mounts = await dokploy.compose.loadMountsByService({
    composeId: stack.composeId,
    serviceName,
  })

  return {
    composeId: stack.composeId,
    serviceName,
    mountsCount: mounts.length,
  }
}
