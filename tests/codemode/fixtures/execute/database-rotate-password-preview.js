;async ({ dokploy }) => {
  return await dokploy.database.rotatePasswordPreview({
    kind: 'mysql',
    mysqlId: 'mysql-1',
    type: 'root',
  })
}
