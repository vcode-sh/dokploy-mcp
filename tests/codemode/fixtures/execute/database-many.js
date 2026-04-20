;async ({ dokploy }) => {
  return await dokploy.database.many({
    requests: [
      { kind: 'redis', redisId: 'redis-1' },
      { kind: 'mysql', mysqlId: 'mysql-1', passwordType: 'root' },
      { kind: 'postgres', postgresId: 'postgres-1' },
    ],
    includePasswordRotationPreview: true,
  })
}
