import { z } from 'zod'

import { createDatabaseTools } from './_database.js'

export const mongoTools = createDatabaseTools({
  type: 'mongo',
  idField: 'mongoId',
  displayName: 'MongoDB',
  defaultImage: 'mongo:15',
  createFields: z.object({
    databaseUser: z.string().min(1).describe('Database user'),
    databasePassword: z.string().min(1).describe('Database password'),
    replicaSets: z.boolean().nullable().optional().describe('Whether replica sets are enabled'),
  }),
})
