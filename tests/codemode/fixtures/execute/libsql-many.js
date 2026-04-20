;async ({ dokploy }) => {
  return await dokploy.libsql.many({
    libsqlIds: ['libsql-2', 'libsql-1'],
  })
}
