import { z } from 'zod'

import { createDatabaseTools } from './_database.js'

export const mariadbTools = createDatabaseTools({
  type: 'mariadb',
  idField: 'mariadbId',
  displayName: 'MariaDB',
  defaultImage: 'mariadb:11',
  createFields: z.object({
    databaseName: z.string().min(1).describe('Name of the database to create'),
    databaseUser: z.string().min(1).describe('Database user'),
    databasePassword: z.string().min(1).describe('Database password'),
    databaseRootPassword: z.string().min(1).optional().describe('Root password for MariaDB'),
  }),
})
