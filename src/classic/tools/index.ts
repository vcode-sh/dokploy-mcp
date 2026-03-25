import type { ToolDefinition } from '../../tools/_factory.js'
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
import { environmentTools } from './environment.js'
import { gitProviderTools } from './git-provider.js'
import { githubTools } from './github.js'
import { gitlabTools } from './gitlab.js'
import { mariadbTools } from './mariadb.js'
import { mongoTools } from './mongo.js'
import { mountsTools } from './mounts.js'
import { mysqlTools } from './mysql.js'
import { notificationTools } from './notification.js'
import { patchTools } from './patch.js'
import { portTools } from './port.js'
import { postgresTools } from './postgres.js'
import { previewDeploymentTools } from './preview-deployment.js'
import { projectTools } from './project.js'
import { redirectsTools } from './redirects.js'
import { redisTools } from './redis.js'
import { registryTools } from './registry.js'
import { rollbackTools } from './rollback.js'
import { scheduleTools } from './schedule.js'
import { securityTools } from './security.js'
import { serverTools } from './server.js'
import { settingsTools } from './settings.js'
import { sshKeyTools } from './ssh-key.js'
import { userTools } from './user.js'
import { volumeBackupsTools } from './volume-backups.js'

export const classicTools: ToolDefinition[] = [
  ...projectTools,
  ...environmentTools,
  ...applicationTools,
  ...composeTools,
  ...domainTools,
  ...patchTools,
  ...postgresTools,
  ...previewDeploymentTools,
  ...mysqlTools,
  ...mariadbTools,
  ...mongoTools,
  ...redisTools,
  ...notificationTools,
  ...rollbackTools,
  ...scheduleTools,
  ...volumeBackupsTools,
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
  ...serverTools,
  ...sshKeyTools,
  ...gitProviderTools,
  ...githubTools,
  ...gitlabTools,
]
