;async ({ catalog }) =>
  catalog
    .getByTag('application')
    .filter((entry) => entry.method === 'POST')
    .map((entry) => entry.procedure)
