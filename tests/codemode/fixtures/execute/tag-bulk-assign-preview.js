;async ({ dokploy }) => {
  return await dokploy.tag.bulkAssignPreview({
    projectId: 'project-1',
    tagIds: ['tag-2', 'tag-missing', 'tag-1'],
  })
}
