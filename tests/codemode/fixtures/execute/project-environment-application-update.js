;async ({ dokploy, helpers }) => {
  const projects = await dokploy.project.search({ limit: 1 })
  helpers.assert(Array.isArray(projects.items) && projects.items.length > 0, 'Expected one project')
  const project = helpers.selectOne(projects.items)

  const environments = await dokploy.environment.byProjectId({
    projectId: project.projectId,
  })
  helpers.assert(Array.isArray(environments) && environments.length > 0, 'Expected one environment')
  const environment = helpers.selectOne(environments)

  const applications = await dokploy.application.search({
    environmentId: environment.environmentId,
    limit: 1,
  })
  helpers.assert(
    Array.isArray(applications.items) && applications.items.length > 0,
    'Expected one application',
  )
  const applicationRef = helpers.selectOne(applications.items)

  await dokploy.application.one({ applicationId: applicationRef.applicationId })

  const updated = await dokploy.application.update({
    applicationId: applicationRef.applicationId,
    title: 'After update',
  })

  return {
    projectId: project.projectId,
    environmentId: environment.environmentId,
    applicationId: updated.applicationId,
    title: updated.title,
  }
}
