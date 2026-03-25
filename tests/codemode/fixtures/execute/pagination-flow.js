;async ({ dokploy, helpers }) => {
  const found = await helpers.paginateUntil(
    (offset) => dokploy.project.search({ limit: 2, offset }),
    (project) => project.name === 'target-project',
    2,
  )

  return {
    projectId: found?.projectId ?? null,
  }
}
