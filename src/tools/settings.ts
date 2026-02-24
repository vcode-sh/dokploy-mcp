import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const reloadServer = postTool({
  name: 'dokploy_settings_reload_server',
  title: 'Reload Server',
  description:
    'Reload the Dokploy server process to apply configuration changes. No parameters required. Returns the reload status. Use after making changes to server settings that require a restart.',
  schema: z.object({}).strict(),
  endpoint: '/settings.reloadServer',
})

const reloadTraefik = postTool({
  name: 'dokploy_settings_reload_traefik',
  title: 'Reload Traefik',
  description:
    'Reload the Traefik reverse proxy to apply routing and configuration changes. No parameters required. Returns the reload status. Use after updating Traefik configuration, domains, or SSL certificates.',
  schema: z.object({}).strict(),
  endpoint: '/settings.reloadTraefik',
})

const cleanUnusedImages = postTool({
  name: 'dokploy_settings_clean_unused_images',
  title: 'Clean Unused Images',
  description:
    'Remove unused Docker images to free disk space on the server. No parameters required. Returns the amount of space reclaimed and the list of removed images. Only removes images not referenced by any container.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanUnusedImages',
  annotations: { destructiveHint: true },
})

const cleanUnusedVolumes = postTool({
  name: 'dokploy_settings_clean_unused_volumes',
  title: 'Clean Unused Volumes',
  description:
    'Remove unused Docker volumes to free disk space. This action is irreversible and may delete persistent data stored in volumes not attached to any container. No parameters required. Returns the amount of space reclaimed and the list of removed volumes.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanUnusedVolumes',
  annotations: { destructiveHint: true },
})

const cleanStoppedContainers = postTool({
  name: 'dokploy_settings_clean_stopped_containers',
  title: 'Clean Stopped Containers',
  description:
    'Remove all stopped Docker containers from the server. This action is irreversible and removes containers in exited or dead state. No parameters required. Returns the list of removed containers and space reclaimed.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanStoppedContainers',
  annotations: { destructiveHint: true },
})

const cleanDockerBuilder = postTool({
  name: 'dokploy_settings_clean_docker_builder',
  title: 'Clean Docker Builder',
  description:
    'Clean the Docker builder cache to free disk space used by intermediate build layers. No parameters required. Returns the amount of space reclaimed. Safe to run without affecting running containers or images.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanDockerBuilder',
  annotations: { destructiveHint: true },
})

const cleanDockerPrune = postTool({
  name: 'dokploy_settings_clean_docker_prune',
  title: 'Docker System Prune',
  description:
    'Run a full Docker system prune to remove all unused resources including stopped containers, dangling images, unused networks, and build cache. This action is irreversible. No parameters required. Returns the total space reclaimed.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanDockerPrune',
  annotations: { destructiveHint: true },
})

const cleanAll = postTool({
  name: 'dokploy_settings_clean_all',
  title: 'Clean All Docker Resources',
  description:
    'Clean all unused Docker resources at once: images, volumes, stopped containers, and builder cache. This action is irreversible and is the most aggressive cleanup option. No parameters required. Returns a summary of all removed resources and total space reclaimed.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanAll',
  annotations: { destructiveHint: true },
})

const cleanMonitoring = postTool({
  name: 'dokploy_settings_clean_monitoring',
  title: 'Clean Monitoring Data',
  description:
    'Clear all stored monitoring data including metrics and historical performance information. This action is irreversible and resets monitoring history to a clean state. No parameters required. Returns a confirmation of the cleanup.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanMonitoring',
  annotations: { destructiveHint: true },
})

const saveSSHPrivateKey = postTool({
  name: 'dokploy_settings_save_ssh_private_key',
  title: 'Save SSH Private Key',
  description:
    'Save an SSH private key for server access and remote operations. Accepts the sshPrivateKey parameter containing the key content, or null to clear the stored key. Returns a confirmation that the key was saved successfully.',
  schema: z.object({
    sshPrivateKey: z.string().nullable().describe('The SSH private key content, or null to clear'),
  }).strict(),
  endpoint: '/settings.saveSSHPrivateKey',
})

const cleanSSHPrivateKey = postTool({
  name: 'dokploy_settings_clean_ssh_private_key',
  title: 'Clean SSH Private Key',
  description:
    'Remove the stored SSH private key from the server. This action is irreversible and will prevent SSH-based remote operations until a new key is saved. No parameters required. Returns a confirmation of the removal.',
  schema: z.object({}).strict(),
  endpoint: '/settings.cleanSSHPrivateKey',
  annotations: { destructiveHint: true },
})

const assignDomainServer = postTool({
  name: 'dokploy_settings_assign_domain_server',
  title: 'Assign Domain to Server',
  description:
    "Assign a domain to the Dokploy server with optional SSL certificate configuration. Accepts an optional letsEncryptEmail for Let's Encrypt certificate registration and an optional certificateType ('letsencrypt' or 'none'). Returns the updated domain assignment configuration.",
  schema: z.object({
    letsEncryptEmail: z
      .string()
      .optional()
      .describe("Email for Let's Encrypt certificate registration"),
    certificateType: z
      .enum(['letsencrypt', 'none'])
      .optional()
      .describe('Type of SSL certificate: letsencrypt or none'),
  }).strict(),
  endpoint: '/settings.assignDomainServer',
})

const updateDockerCleanup = postTool({
  name: 'dokploy_settings_update_docker_cleanup',
  title: 'Update Docker Cleanup Schedule',
  description:
    'Configure automatic Docker cleanup scheduling to periodically remove unused resources. Requires the enabled boolean parameter and accepts an optional cron schedule expression. Returns the updated cleanup configuration.',
  schema: z.object({
    enabled: z.boolean().describe('Whether automatic cleanup is enabled'),
    schedule: z.string().optional().describe('Cron schedule expression for the cleanup job'),
  }).strict(),
  endpoint: '/settings.updateDockerCleanup',
})

const readTraefikConfig = getTool({
  name: 'dokploy_settings_read_traefik_config',
  title: 'Read Traefik Config',
  description:
    'Read the current main Traefik configuration file content. No parameters required. Returns the raw Traefik configuration as a string, which defines the core routing, entrypoints, and provider settings.',
  schema: z.object({}).strict(),
  endpoint: '/settings.readTraefikConfig',
})

const updateTraefikConfig = postTool({
  name: 'dokploy_settings_update_traefik_config',
  title: 'Update Traefik Config',
  description:
    'Update the main Traefik configuration file with new content. Requires the traefikConfig parameter containing the full configuration. Returns a confirmation of the update. A Traefik reload may be needed to apply changes.',
  schema: z.object({
    traefikConfig: z.string().min(1).describe('The new Traefik configuration content'),
  }).strict(),
  endpoint: '/settings.updateTraefikConfig',
})

const readWebServerTraefikConfig = getTool({
  name: 'dokploy_settings_read_web_server_traefik_config',
  title: 'Read Web Server Traefik Config',
  description:
    'Read the Traefik configuration specific to the Dokploy web server. No parameters required. Returns the raw web server Traefik configuration as a string, which controls how the Dokploy dashboard and API are exposed.',
  schema: z.object({}).strict(),
  endpoint: '/settings.readWebServerTraefikConfig',
})

const updateWebServerTraefikConfig = postTool({
  name: 'dokploy_settings_update_web_server_traefik_config',
  title: 'Update Web Server Traefik Config',
  description:
    'Update the Traefik configuration for the Dokploy web server. Requires the traefikConfig parameter containing the full web server configuration. Returns a confirmation of the update. A Traefik reload may be needed to apply changes.',
  schema: z.object({
    traefikConfig: z.string().min(1).describe('The new web server Traefik configuration content'),
  }).strict(),
  endpoint: '/settings.updateWebServerTraefikConfig',
})

const readMiddlewareTraefikConfig = getTool({
  name: 'dokploy_settings_read_middleware_traefik_config',
  title: 'Read Middleware Traefik Config',
  description:
    'Read the Traefik middleware configuration that defines request processing rules such as rate limiting, authentication, and header manipulation. No parameters required. Returns the raw middleware configuration as a string.',
  schema: z.object({}).strict(),
  endpoint: '/settings.readMiddlewareTraefikConfig',
})

const updateMiddlewareTraefikConfig = postTool({
  name: 'dokploy_settings_update_middleware_traefik_config',
  title: 'Update Middleware Traefik Config',
  description:
    'Update the Traefik middleware configuration that controls request processing rules. Requires the traefikConfig parameter containing the full middleware configuration. Returns a confirmation of the update. A Traefik reload may be needed to apply changes.',
  schema: z.object({
    traefikConfig: z.string().min(1).describe('The new middleware Traefik configuration content'),
  }).strict(),
  endpoint: '/settings.updateMiddlewareTraefikConfig',
})

const updateServer = postTool({
  name: 'dokploy_settings_update_server',
  title: 'Update Server',
  description:
    'Update the Dokploy server to the latest available version. No parameters required. Returns the update status and new version information. This will restart the server process and may cause brief downtime.',
  schema: z.object({}).strict(),
  endpoint: '/settings.updateServer',
})

const getDokployVersion = getTool({
  name: 'dokploy_settings_get_version',
  title: 'Get Dokploy Version',
  description:
    'Get the currently running Dokploy server version. No parameters required. Returns the version string of the installed Dokploy instance. Useful for checking if updates are available.',
  schema: z.object({}).strict(),
  endpoint: '/settings.getDokployVersion',
})

const readDirectories = getTool({
  name: 'dokploy_settings_read_directories',
  title: 'Read Server Directories',
  description:
    'Read the server directory listing to inspect the file system structure used by Dokploy. No parameters required. Returns a list of directories and their contents on the server where Dokploy stores its data and configurations.',
  schema: z.object({}).strict(),
  endpoint: '/settings.readDirectories',
})

const getOpenApiDocument = getTool({
  name: 'dokploy_settings_get_openapi_document',
  title: 'Get OpenAPI Document',
  description:
    'Get the Dokploy OpenAPI specification document describing all available API endpoints. No parameters required. Returns the full OpenAPI JSON document including paths, schemas, and authentication requirements.',
  schema: z.object({}).strict(),
  endpoint: '/settings.getOpenApiDocument',
})

const readTraefikFile = getTool({
  name: 'dokploy_settings_read_traefik_file',
  title: 'Read Traefik File',
  description:
    'Read a specific Traefik configuration file from the server file system. Accepts a path parameter to specify which Traefik file to read. Returns the raw file content as a string. Useful for inspecting individual Traefik configuration files beyond the main config.',
  schema: z.object({
    path: z.string().min(1).describe('Path to the Traefik configuration file to read'),
  }).strict(),
  endpoint: '/settings.readTraefikFile',
})

const updateTraefikFile = postTool({
  name: 'dokploy_settings_update_traefik_file',
  title: 'Update Traefik File',
  description:
    'Update a specific Traefik configuration file on the server. Requires the file path and new content. Returns a confirmation. A Traefik reload may be needed to apply changes.',
  schema: z.object({
    path: z.string().min(1).describe('Path to the Traefik configuration file to update'),
    traefikConfig: z.string().min(1).describe('The new file content'),
  }).strict(),
  endpoint: '/settings.updateTraefikFile',
})

// ── export ───────────────────────────────────────────────────────────
export const settingsTools: ToolDefinition[] = [
  reloadServer,
  reloadTraefik,
  cleanUnusedImages,
  cleanUnusedVolumes,
  cleanStoppedContainers,
  cleanDockerBuilder,
  cleanDockerPrune,
  cleanAll,
  cleanMonitoring,
  saveSSHPrivateKey,
  cleanSSHPrivateKey,
  assignDomainServer,
  updateDockerCleanup,
  readTraefikConfig,
  updateTraefikConfig,
  readWebServerTraefikConfig,
  updateWebServerTraefikConfig,
  readMiddlewareTraefikConfig,
  updateMiddlewareTraefikConfig,
  updateServer,
  getDokployVersion,
  readDirectories,
  getOpenApiDocument,
  readTraefikFile,
  updateTraefikFile,
]
