;async ({ catalog }) =>
  catalog
    .getByTag('notification')
    .map((entry) => entry.procedure)
    .slice(0, 20)
