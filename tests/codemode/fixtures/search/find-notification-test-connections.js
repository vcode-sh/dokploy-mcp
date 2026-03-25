;async ({ catalog }) =>
  catalog
    .getByTag('notification')
    .filter((entry) => entry.procedure.includes('test'))
    .map((entry) => entry.procedure)
