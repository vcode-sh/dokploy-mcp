;async ({ catalog }) =>
  catalog
    .getByTag('compose')
    .filter((entry) => entry.method === 'GET')
    .map((entry) => entry.procedure)
