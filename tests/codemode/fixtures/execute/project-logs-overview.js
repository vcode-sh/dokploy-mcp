;async ({ dokploy }) => {
  return await dokploy.project.logsOverview({
    projectId: 'project-1',
    tail: 25,
    search: 'error',
    includeDatabases: true,
    maxApplications: 2,
    maxDatabases: 2,
  })
}
