;async ({ dokploy }) => {
  return await dokploy.logs.tailMany({
    requests: [
      { kind: 'application', applicationId: 'app-1', tail: 20, search: 'error' },
      {
        kind: 'compose',
        composeId: 'compose-1',
        containerId: 'web',
        tail: 10,
      },
      { kind: 'libsql', libsqlId: 'libsql-1', tail: 5 },
      {
        kind: 'deployment',
        deploymentId: 'deployment-1',
        tail: 15,
        since: '1h',
        search: 'error',
      },
    ],
  })
}
