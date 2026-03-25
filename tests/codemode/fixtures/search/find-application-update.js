;async ({ catalog }) =>
  catalog
    .getByTag('application')
    .filter((entry) => entry.procedure.includes('update'))
    .map((entry) => entry.procedure)
