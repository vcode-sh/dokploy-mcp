import { z } from 'zod'

import { createDatabaseTools } from './_database.js'

export const redisTools = createDatabaseTools({
  type: 'redis',
  idField: 'redisId',
  displayName: 'Redis',
  defaultImage: 'redis:8',
  createFields: z.object({
    databasePassword: z.string().min(1).describe('Database password'),
  }),
})
