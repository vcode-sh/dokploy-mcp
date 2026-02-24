import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

// ── tools ────────────────────────────────────────────────────────────

const one = getTool({
  name: 'dokploy_admin_one',
  title: 'Get Admin Info',
  description:
    "Get the current admin's profile and configuration information. No parameters required. Returns the admin's email, role, server settings, and other administrative details.",
  schema: z.object({}),
  endpoint: '/admin.one',
})

const createUserInvitation = postTool({
  name: 'dokploy_admin_create_user_invitation',
  title: 'Create User Invitation',
  description:
    'Create an invitation for a new user by sending them an email with a registration link. Requires the email address of the person to invite. Returns the invitation details including the token that the invited user will use to create their account.',
  schema: z.object({
    email: z.string().email().describe('Email address to send the invitation to'),
  }),
  endpoint: '/admin.createUserInvitation',
})

const removeUser = postTool({
  name: 'dokploy_admin_remove_user',
  title: 'Remove User',
  description:
    'Permanently remove a user from the Dokploy system. This action is irreversible and will delete the user account and all associated data. Requires the auth ID of the user to remove. Returns a confirmation of the deletion.',
  schema: z.object({
    authId: z.string().min(1).describe('The auth ID of the user to remove'),
  }),
  endpoint: '/admin.removeUser',
  annotations: { destructiveHint: true },
})

const getUserByToken = getTool({
  name: 'dokploy_admin_get_user_by_token',
  title: 'Get User by Invitation Token',
  description:
    'Look up a user by their invitation token to verify the invitation is valid. Requires the invitation token string. Returns the user details associated with the token, including their email and invitation status.',
  schema: z.object({
    token: z.string().min(1).describe('The invitation token to look up'),
  }),
  endpoint: '/admin.getUserByToken',
})

const assignPermissions = postTool({
  name: 'dokploy_admin_assign_permissions',
  title: 'Assign User Permissions',
  description:
    'Assign granular permissions to a specific user. Controls what the user can create, delete, and access including projects, services, Traefik files, Docker, and the API. Requires the user ID and a full set of boolean permission flags plus lists of accessible project and service IDs. Returns the updated permission set.',
  schema: z.object({
    userId: z.string().min(1).describe('The user ID to assign permissions to'),
    canCreateProjects: z.boolean().describe('Whether the user can create projects'),
    canCreateServices: z.boolean().describe('Whether the user can create services'),
    canDeleteProjects: z.boolean().describe('Whether the user can delete projects'),
    canDeleteServices: z.boolean().describe('Whether the user can delete services'),
    accesedProjects: z.array(z.string()).describe('List of project IDs the user can access'),
    accesedServices: z.array(z.string()).describe('List of service IDs the user can access'),
    canAccessToTraefikFiles: z
      .boolean()
      .describe('Whether the user can access Traefik configuration files'),
    canAccessToDocker: z.boolean().describe('Whether the user can access Docker'),
    canAccessToAPI: z.boolean().describe('Whether the user can access the API'),
  }),
  endpoint: '/admin.assignPermissions',
})

const cleanGithubApp = postTool({
  name: 'dokploy_admin_clean_github_app',
  title: 'Remove GitHub App Integration',
  description:
    'Remove the currently configured GitHub App integration from Dokploy. This disconnects the GitHub App and clears all associated credentials. No parameters required. Returns a confirmation that the GitHub App configuration has been removed.',
  schema: z.object({}),
  endpoint: '/admin.cleanGithubApp',
})

const getRepositories = getTool({
  name: 'dokploy_admin_get_repositories',
  title: 'List GitHub Repositories',
  description:
    'List all repositories accessible through the configured GitHub App integration. No parameters required. Returns an array of repository objects with names, owners, and other metadata from the connected GitHub account or organization.',
  schema: z.object({}),
  endpoint: '/admin.getRepositories',
})

const getBranches = getTool({
  name: 'dokploy_admin_get_branches',
  title: 'List GitHub Branches',
  description:
    'List all branches for a specific GitHub repository accessible through the configured GitHub App. Requires the repository name and owner (user or organization). Returns an array of branch names and their metadata.',
  schema: z.object({
    repo: z.string().min(1).describe('The repository name'),
    owner: z.string().min(1).describe('The repository owner or organization'),
  }),
  endpoint: '/admin.getBranches',
})

const haveGithubConfigured = getTool({
  name: 'dokploy_admin_have_github_configured',
  title: 'Check GitHub App Configuration',
  description:
    'Check whether a GitHub App integration is currently configured in Dokploy. No parameters required. Returns a boolean indicating whether the GitHub App has been set up and is ready to use for repository access.',
  schema: z.object({}),
  endpoint: '/admin.haveGithubConfigured',
})

// ── export ───────────────────────────────────────────────────────────
export const adminTools: ToolDefinition[] = [
  one,
  createUserInvitation,
  removeUser,
  getUserByToken,
  assignPermissions,
  cleanGithubApp,
  getRepositories,
  getBranches,
  haveGithubConfigured,
]
