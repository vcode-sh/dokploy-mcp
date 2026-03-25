;async ({ dokploy, helpers }) => {
  const projects = await dokploy.project.search({ name: 'demo', limit: 5 })
  helpers.assert(Array.isArray(projects.items), 'Expected project search items array')
  const project = helpers.selectOne(projects.items)
  const environments = await dokploy.environment.byProjectId({ projectId: project.projectId })
  const environment = helpers.selectOne(environments)
  const application = await dokploy.application.one({ applicationId: 'app-1' })

  return {
    projectId: project.projectId,
    environmentId: environment.environmentId,
    applicationId: application.applicationId,
  }
}
