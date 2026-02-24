import type { ToolDefinition } from './_factory.js'
import { adminTools } from './admin.js'
import { applicationTools } from './application.js'
import { backupTools } from './backup.js'
import { certificatesTools } from './certificates.js'
import { clusterTools } from './cluster.js'
import { composeTools } from './compose.js'
import { deploymentTools } from './deployment.js'
import { destinationTools } from './destination.js'
import { dockerTools } from './docker.js'
import { domainTools } from './domain.js'
import { mariadbTools } from './mariadb.js'
import { mongoTools } from './mongo.js'
import { mountsTools } from './mounts.js'
import { mysqlTools } from './mysql.js'
import { portTools } from './port.js'
import { postgresTools } from './postgres.js'
import { projectTools } from './project.js'
import { redirectsTools } from './redirects.js'
import { redisTools } from './redis.js'
import { registryTools } from './registry.js'
import { securityTools } from './security.js'
import { settingsTools } from './settings.js'
import { userTools } from './user.js'

export const allTools: ToolDefinition[] = [
  ...projectTools,
  ...applicationTools,
  ...composeTools,
  ...domainTools,
  ...postgresTools,
  ...mysqlTools,
  ...mariadbTools,
  ...mongoTools,
  ...redisTools,
  ...deploymentTools,
  ...dockerTools,
  ...certificatesTools,
  ...registryTools,
  ...destinationTools,
  ...backupTools,
  ...mountsTools,
  ...portTools,
  ...redirectsTools,
  ...securityTools,
  ...clusterTools,
  ...settingsTools,
  ...adminTools,
  ...userTools,
]
