import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const nullableString = z.string().nullable().optional()
const gitlabIdSchema = z.string().min(1).describe('GitLab provider ID')

const create = postTool({
  name: 'dokploy_gitlab_create',
  title: 'Create GitLab Provider',
  description:
    'Create a new GitLab provider integration in Dokploy. Requires the auth ID, name, and GitLab URL. Additional OAuth and provider fields may also be supplied.',
  schema: z
    .object({
      applicationId: z.string().optional().describe('Application ID'),
      secret: z.string().optional().describe('OAuth client secret'),
      groupName: z.string().optional().describe('GitLab group name'),
      gitProviderId: z.string().optional().describe('Git provider ID'),
      redirectUri: z.string().optional().describe('OAuth redirect URI'),
      authId: z.string().min(1).describe('Auth ID'),
      name: z.string().min(1).describe('Provider display name'),
      gitlabUrl: z.string().min(1).describe('GitLab URL'),
      gitlabInternalUrl: nullableString.describe('Internal GitLab URL'),
    })
    .strict(),
  endpoint: '/gitlab.create',
})

const one = getTool({
  name: 'dokploy_gitlab_one',
  title: 'Get GitLab Provider',
  description: 'Retrieve a GitLab provider integration by its ID.',
  schema: z.object({ gitlabId: gitlabIdSchema }).strict(),
  endpoint: '/gitlab.one',
})

const getGitlabRepositories = getTool({
  name: 'dokploy_gitlab_get_gitlab_repositories',
  title: 'List GitLab Repositories',
  description:
    'List repositories available through a Dokploy GitLab provider integration. Requires the GitLab provider ID.',
  schema: z.object({ gitlabId: gitlabIdSchema }).strict(),
  endpoint: '/gitlab.getGitlabRepositories',
})

const getGitlabBranches = getTool({
  name: 'dokploy_gitlab_get_gitlab_branches',
  title: 'List GitLab Branches',
  description:
    'List branches for a GitLab repository through Dokploy. Requires the owner and repository. Optionally pass the project numeric ID and GitLab provider ID.',
  schema: z
    .object({
      id: z.number().optional().describe('GitLab project numeric ID'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      gitlabId: z.string().optional().describe('GitLab provider ID'),
    })
    .strict(),
  endpoint: '/gitlab.getGitlabBranches',
})

const gitlabProviders = getTool({
  name: 'dokploy_gitlab_gitlab_providers',
  title: 'List GitLab Providers',
  description: 'List GitLab provider integrations configured in Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/gitlab.gitlabProviders',
})

const testConnection = postTool({
  name: 'dokploy_gitlab_test_connection',
  title: 'Test GitLab Connection',
  description:
    'Test a Dokploy GitLab provider integration. Requires the GitLab provider ID and optionally accepts the group name.',
  schema: z
    .object({
      gitlabId: gitlabIdSchema,
      groupName: z.string().optional().describe('GitLab group name'),
    })
    .strict(),
  endpoint: '/gitlab.testConnection',
})

const update = postTool({
  name: 'dokploy_gitlab_update',
  title: 'Update GitLab Provider',
  description:
    'Update a Dokploy GitLab provider integration. Requires the GitLab provider ID, display name, GitLab URL, and linked Git provider ID. Optional OAuth and group fields may also be supplied.',
  schema: z
    .object({
      applicationId: z.string().optional().describe('Application ID'),
      secret: z.string().optional().describe('OAuth client secret'),
      groupName: z.string().optional().describe('GitLab group name'),
      redirectUri: z.string().optional().describe('OAuth redirect URI'),
      name: z.string().min(1).describe('Provider display name'),
      gitlabId: gitlabIdSchema,
      gitlabUrl: z.string().min(1).describe('GitLab URL'),
      gitProviderId: z.string().min(1).describe('Git provider ID'),
      gitlabInternalUrl: nullableString.describe('Internal GitLab URL'),
    })
    .strict(),
  endpoint: '/gitlab.update',
})

export const gitlabTools: ToolDefinition[] = [
  create,
  one,
  getGitlabRepositories,
  getGitlabBranches,
  gitlabProviders,
  testConnection,
  update,
]
