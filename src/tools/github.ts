import { z } from 'zod'
import { getTool, postTool, type ToolDefinition } from './_factory.js'

const githubIdSchema = z.string().min(1).describe('GitHub provider ID')

const one = getTool({
  name: 'dokploy_github_one',
  title: 'Get GitHub Provider',
  description: 'Retrieve a GitHub provider integration by its ID.',
  schema: z.object({ githubId: githubIdSchema }).strict(),
  endpoint: '/github.one',
})

const getGithubRepositories = getTool({
  name: 'dokploy_github_get_github_repositories',
  title: 'List GitHub Repositories',
  description:
    'List GitHub repositories available through a Dokploy GitHub provider integration. Requires the GitHub provider ID.',
  schema: z.object({ githubId: githubIdSchema }).strict(),
  endpoint: '/github.getGithubRepositories',
})

const getGithubBranches = getTool({
  name: 'dokploy_github_get_github_branches',
  title: 'List GitHub Branches',
  description:
    'List branches for a GitHub repository through Dokploy. Requires the repository name and owner. Optionally pass the GitHub provider ID.',
  schema: z
    .object({
      repo: z.string().min(1).describe('Repository name'),
      owner: z.string().min(1).describe('Repository owner'),
      githubId: z.string().optional().describe('GitHub provider ID'),
    })
    .strict(),
  endpoint: '/github.getGithubBranches',
})

const githubProviders = getTool({
  name: 'dokploy_github_github_providers',
  title: 'List GitHub Providers',
  description: 'List GitHub provider integrations configured in Dokploy.',
  schema: z.object({}).strict(),
  endpoint: '/github.githubProviders',
})

const testConnection = postTool({
  name: 'dokploy_github_test_connection',
  title: 'Test GitHub Connection',
  description: 'Test a Dokploy GitHub provider connection by its ID.',
  schema: z.object({ githubId: githubIdSchema }).strict(),
  endpoint: '/github.testConnection',
})

const update = postTool({
  name: 'dokploy_github_update',
  title: 'Update GitHub Provider',
  description:
    'Update a Dokploy GitHub provider integration. Requires the provider ID, display name, linked Git provider ID, and GitHub App name.',
  schema: z
    .object({
      githubId: githubIdSchema,
      name: z.string().min(1).describe('Provider display name'),
      gitProviderId: z.string().min(1).describe('Git provider ID'),
      githubAppName: z.string().min(1).describe('GitHub App name'),
    })
    .strict(),
  endpoint: '/github.update',
})

export const githubTools: ToolDefinition[] = [
  one,
  getGithubRepositories,
  getGithubBranches,
  githubProviders,
  testConnection,
  update,
]
