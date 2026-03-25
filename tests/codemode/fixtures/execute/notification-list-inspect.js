;async ({ dokploy, helpers }) => {
  const notifications = await dokploy.notification.all({})
  const notification = helpers.selectOne(notifications)
  const detail = await dokploy.notification.one({ notificationId: notification.notificationId })

  return {
    notificationId: detail.notificationId,
    name: detail.name,
  }
}
