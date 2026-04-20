;async ({ dokploy }) => {
  return await dokploy.project.infrastructureOverview({
    projectId: 'project-1',
    includeServerSecurity: true,
  })
}
